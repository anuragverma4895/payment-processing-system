const crypto = require('../utils/crypto');
const logger = require('../config/logger');
const transactionLogger = require('./transactionLogger');

const RECOVERY_WEBHOOK_TIMEOUT_MS = process.env.RECOVERY_WEBHOOK_TIMEOUT_MS !== undefined
  ? Number(process.env.RECOVERY_WEBHOOK_TIMEOUT_MS)
  : 5000;

const normalizeGatewayResponse = (gatewayResponse) => {
  if (!gatewayResponse) return null;

  const safeResponse = typeof gatewayResponse.toObject === 'function'
    ? gatewayResponse.toObject()
    : gatewayResponse;

  return JSON.parse(JSON.stringify(safeResponse));
};

const buildPaymentEventPayload = ({ payment, order }) => ({
  event: payment.status === 'success' ? 'payment.success' : 'payment.failed',
  paymentId: payment.paymentId,
  orderId: order.orderId,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  method: payment.method,
  failureReason: payment.failureReason || null,
  timestamp: new Date().toISOString(),
  gatewayResponse: normalizeGatewayResponse(payment.gatewayResponse),
  userId: payment.userId?.toString(),
  attempts: order.attempts,
  maxAttempts: order.maxAttempts,
  remainingAttempts: Math.max(0, (order.maxAttempts || 3) - (order.attempts || 0)),
});

/**
 * Emits payment lifecycle webhooks and notifies the AI Revenue Recovery Agent
 * on failed payments when RECOVERY_AGENT_URL is configured.
 */
exports.sendWebhook = async ({ payment, order }) => {
  const payload = buildPaymentEventPayload({ payment, order });
  const merchantSignature = process.env.WEBHOOK_SECRET
    ? crypto.generateWebhookSignature(payload, process.env.WEBHOOK_SECRET)
    : null;

  setTimeout(async () => {
    logger.info(`[WEBHOOK] Simulating delivery for payment ${payment.paymentId}`, {
      event: payload.event,
      signatureConfigured: Boolean(merchantSignature),
    });

    await transactionLogger.log({
      paymentId: payment._id,
      orderId: order._id,
      userId: payment.userId,
      event: 'webhook.sent',
      status: 'info',
      message: `Webhook dispatched: ${payload.event}`,
      metadata: { event: payload.event, signatureConfigured: Boolean(merchantSignature) },
    });
  }, Math.random() * 2000 + 500);

  if (payload.event === 'payment.failed') {
    notifyRecoveryAgent(payload, payment, order);
  }

  return { payload, signature: merchantSignature };
};

async function logRecoveryNotificationFailure({ payment, order, status = 'warning', message, metadata }) {
  await transactionLogger.log({
    paymentId: payment._id,
    orderId: order._id,
    userId: payment.userId,
    event: 'recovery.notification_failed',
    status,
    message,
    metadata,
  }).catch(() => {});
}

/**
 * Sends a safe payment.failed notification to the AI Revenue Recovery Agent.
 * This is intentionally fire-and-forget: PPS payment state never depends on
 * webhook delivery success.
 */
async function notifyRecoveryAgent(payload, payment, order) {
  const recoveryUrl = process.env.RECOVERY_AGENT_URL;

  if (!recoveryUrl) return;

  const recoveryWebhookSecret = process.env.RECOVERY_WEBHOOK_SECRET;
  if (!recoveryWebhookSecret) {
    const message = 'RECOVERY_WEBHOOK_SECRET is required when RECOVERY_AGENT_URL is configured.';
    logger.error(`[RECOVERY] ${message}`);
    await logRecoveryNotificationFailure({
      payment,
      order,
      status: 'error',
      message,
      metadata: { configuration: 'RECOVERY_WEBHOOK_SECRET missing' },
    });
    return;
  }

  let notifyEndpoint;
  try {
    notifyEndpoint = new URL('/api/webhooks/payment-failed', recoveryUrl).toString();
  } catch (error) {
    const message = `Invalid RECOVERY_AGENT_URL: ${error.message}`;
    logger.error(`[RECOVERY] ${message}`);
    await logRecoveryNotificationFailure({
      payment,
      order,
      status: 'error',
      message,
      metadata: { configuration: 'RECOVERY_AGENT_URL invalid' },
    });
    return;
  }

  const signature = crypto.generateWebhookSignature(payload, recoveryWebhookSecret);

  try {
    logger.info(`[RECOVERY] Sending payment.failed notification to Recovery Agent for ${payment.paymentId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RECOVERY_WEBHOOK_TIMEOUT_MS);

    const response = await fetch(notifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      logger.info(`[RECOVERY] Recovery Agent notified successfully for ${payment.paymentId} (HTTP ${response.status})`);

      await transactionLogger.log({
        paymentId: payment._id,
        orderId: order._id,
        userId: payment.userId,
        event: 'recovery.notified',
        status: 'success',
        message: `Recovery Agent notified: payment.failed for ${payment.paymentId}`,
        metadata: { httpStatus: response.status, endpoint: notifyEndpoint },
      });
    } else {
      const message = `Recovery Agent notification returned HTTP ${response.status}`;
      logger.warn(`[RECOVERY] ${message} for ${payment.paymentId}`);
      await logRecoveryNotificationFailure({
        payment,
        order,
        status: 'warning',
        message,
        metadata: { httpStatus: response.status, endpoint: notifyEndpoint },
      });
    }
  } catch (err) {
    const errorMessage = err.name === 'AbortError'
      ? `Recovery Agent notification timed out (${RECOVERY_WEBHOOK_TIMEOUT_MS}ms)`
      : `Recovery Agent notification failed: ${err.message}`;

    logger.warn(`[RECOVERY] ${errorMessage} for ${payment.paymentId}`);

    await logRecoveryNotificationFailure({
      payment,
      order,
      status: 'error',
      message: errorMessage,
      metadata: { error: err.message, endpoint: notifyEndpoint },
    });
  }
}