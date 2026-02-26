const cryptoUtil = require('../utils/crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const transactionLogger = require('../services/transactionLogger');
const logger = require('../config/logger');

exports.receiveWebhook = async (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.WEBHOOK_SECRET || 'default_secret';

  // Verify webhook signature
  if (signature) {
    const isValid = cryptoUtil.verifyWebhookSignature(req.body, signature, secret);
    if (!isValid) {
      logger.warn('Webhook received with invalid signature');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  const { event, paymentId, orderId, status } = req.body;

  logger.info(`Webhook received: ${event} for payment ${paymentId}`);

  // Process webhook event
  if (event === 'payment.success' || event === 'payment.failed') {
    const payment = await Payment.findOne({ paymentId });
    const order = await Order.findOne({ orderId });

    if (payment && order) {
      await transactionLogger.log({
        paymentId: payment._id,
        orderId: order._id,
        event: 'webhook.sent',
        status: 'info',
        message: `Webhook processed: ${event}`,
        metadata: { event, paymentId, orderId },
      });
    }
  }

  res.status(200).json({ success: true, message: 'Webhook received' });
};
