const crypto = require('../utils/crypto');
const logger = require('../config/logger');
const transactionLogger = require('./transactionLogger');

/**
 * Simulates sending a webhook to the merchant's callback URL
 * In production, this would be an actual HTTP POST to the merchant's server
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
    timestamp: new Date().toISOString(),
    gatewayResponse: payment.gatewayResponse,
  };

  const signature = crypto.generateWebhookSignature(payload, process.env.WEBHOOK_SECRET || 'default_secret');

  // Simulate async webhook delivery (in production: HTTP POST to merchant URL)
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

  return { payload, signature };
};
