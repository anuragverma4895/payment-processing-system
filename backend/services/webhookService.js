const crypto = require('../utils/crypto');
const logger = require('../config/logger');
const transactionLogger = require('./transactionLogger');

/**
 * Simulates sending a webhook to the merchant's callback URL
 * In production, this would be an actual HTTP POST to the merchant's server
 *
 * Enhanced: When event is payment.failed and RECOVERY_AGENT_URL is configured,
 * also sends an actual HTTP POST to the AI Revenue Recovery Agent.
 */
exports.sendWebhook = async ({ payment, order }) => {
  const payload = {
    event: payment.status === 'success' ? 'payment.success' : 'payment.failed',
    paymentId: payment.paymentId,
    orderId: order.orderId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    failureReason: payment.failureReason || null,
    timestamp: new Date().toISOString(),
    gatewayResponse: payment.gatewayResponse,
    // Recovery-relevant order data
    userId: payment.userId?.toString(),
    attempts: order.attempts,
    maxAttempts: order.maxAttempts,
    remainingAttempts: Math.max(0, (order.maxAttempts || 3) - (order.attempts || 0)),
  };

  const signature = crypto.generateWebhookSignature(payload, process.env.WEBHOOK_SECRET || 'default_secret');

  // Existing behavior: Simulate async webhook delivery (preserved)
  setTimeout(async () => {
    logger.info(`[WEBHOOK] Simulating delivery for payment ${payment.paymentId}`, {
      event: payload.event,
      signature: signature.slice(0, 16) + '...',
    });

    await transactionLogger.log({
      paymentId: payment._id,
      orderId: order._id,
      userId: payment.userId,
      event: 'webhook.sent',
      status: 'info',
      message: `Webhook dispatched: ${payload.event}`,
      metadata: { signature: signature.slice(0, 16) + '...', event: payload.event },
    });
  }, Math.random() * 2000 + 500);

  // NEW: Notify Recovery Agent on payment failure
  if (payload.event === 'payment.failed' && process.env.RECOVERY_AGENT_URL) {
    notifyRecoveryAgent(payload, signature, payment, order);
  }

  return { payload, signature };
};

/**
 * Sends an actual HTTP POST to the AI Revenue Recovery Agent.
 * Fire-and-forget: never blocks or crashes payment processing.
 *
 * Security:
 * - Sends webhook signature for verification
 * - Does NOT send raw card numbers, CVV, passwords, or JWTs
 * - Only sends already-masked/safe payment data
 */
async function notifyRecoveryAgent(payload, signature, payment, order) {
  const recoveryUrl = process.env.RECOVERY_AGENT_URL;

  // Build the notification URL
  const notifyEndpoint = `${recoveryUrl.replace(/\/+$/, '')}/api/webhooks/payment-failed`;

  try {
    logger.info(`[RECOVERY] Sending payment.failed notification to Recovery Agent for ${payment.paymentId}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

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
      logger.warn(`[RECOVERY] Recovery Agent returned HTTP ${response.status} for ${payment.paymentId}`);

      await transactionLogger.log({
        paymentId: payment._id,
        orderId: order._id,
        userId: payment.userId,
        event: 'recovery.notification_failed',
        status: 'warning',
        message: `Recovery Agent notification returned HTTP ${response.status}`,
        metadata: { httpStatus: response.status, endpoint: notifyEndpoint },
      });
    }
  } catch (err) {
    // Recovery Agent unavailable — log and move on, never crash payment processing
    const errorMessage = err.name === 'AbortError'
      ? 'Recovery Agent notification timed out (5s)'
      : `Recovery Agent notification failed: ${err.message}`;

    logger.warn(`[RECOVERY] ${errorMessage} for ${payment.paymentId}`);

    await transactionLogger.log({
      paymentId: payment._id,
      orderId: order._id,
      userId: payment.userId,
      event: 'recovery.notification_failed',
      status: 'error',
      message: errorMessage,
      metadata: { error: err.message, endpoint: notifyEndpoint },
    }).catch(() => {}); // Even logging failure should not crash
  }
}
