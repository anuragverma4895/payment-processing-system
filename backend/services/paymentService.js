const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paymentEngine = require('./paymentEngine');
const webhookService = require('./webhookService');
const transactionLogger = require('./transactionLogger');
const cryptoUtil = require('../utils/crypto');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

const MAX_RETRY_ATTEMPTS = 3;

/**
 * Process a payment for an order
 */
exports.processPayment = async ({ orderId, userId, method, cardDetails, upiDetails, idempotencyKey, req }) => {
  const startTime = Date.now();

  // Fetch and validate order
  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError('Order not found or does not belong to this user.', 404);
  if (order.status === 'paid') throw new AppError('Order has already been paid.', 409);
  if (order.status === 'failed' && order.attempts >= order.maxAttempts) {
    throw new AppError(`Order has exceeded maximum retry attempts (${order.maxAttempts}).`, 422);
  }
  if (order.isExpired) throw new AppError('Order has expired. Please create a new order.', 410);
  if (order.status === 'cancelled') throw new AppError('Order has been cancelled.', 409);

  // Build payment record
  const paymentData = {
    orderId: order._id,
    userId,
    amount: order.amount,
    currency: order.currency,
    method,
    idempotencyKey,
    retryCount: order.attempts,
  };

  // Process card details securely
  if (method === 'card' && cardDetails) {
    paymentData.cardDetails = {
      maskedNumber: cryptoUtil.maskCardNumber(cardDetails.number),
      cardHash: cryptoUtil.hashCardNumber(cardDetails.number),
      cardType: cryptoUtil.detectCardType(cardDetails.number),
      expiryMonth: cardDetails.expiryMonth,
      expiryYear: cardDetails.expiryYear,
      // CVV is NEVER stored - not even hashed
    };
  }

  if (method === 'upi' && upiDetails) {
    paymentData.upiDetails = { vpa: upiDetails.vpa };
  }

  // Create payment record
  const payment = await Payment.create(paymentData);

  // Update order status to processing
  await Order.findByIdAndUpdate(order._id, {
    status: 'processing',
    $inc: { attempts: 1 },
  });

  await transactionLogger.log({
    paymentId: payment._id,
    orderId: order._id,
    userId,
    event: 'payment.initiated',
    status: 'info',
    message: `Payment initiated via ${method} for order ${order.orderId}`,
    metadata: { amount: order.amount, currency: order.currency, method },
    req,
  });

  // Execute payment via mock engine
  let engineResult;
  try {
    payment.status = 'processing';
    await payment.save();

    if (method === 'card') {
      engineResult = await paymentEngine.processCardPayment({
        amount: order.amount,
        currency: order.currency,
        cardDetails: paymentData.cardDetails,
        orderId: order.orderId,
      });
    } else if (method === 'upi') {
      engineResult = await paymentEngine.processUPIPayment({
        amount: order.amount,
        currency: order.currency,
        upiDetails: upiDetails,
        orderId: order.orderId,
      });
    } else {
      // Generic mock for netbanking/wallet
      engineResult = await paymentEngine.processCardPayment({
        amount: order.amount,
        currency: order.currency,
        cardDetails: {},
        orderId: order.orderId,
      });
    }
  } catch (engineError) {
    logger.error('Payment engine error:', engineError);
    engineResult = { success: false, failureReason: 'Payment gateway unavailable' };
  }

  const duration = Date.now() - startTime;

  // Update payment based on result
  if (engineResult.success) {
    payment.status = 'success';
    payment.gatewayResponse = engineResult.gatewayResponse;
    payment.processedAt = new Date();
    await payment.save();

    await Order.findByIdAndUpdate(order._id, {
      status: 'paid',
      paidAt: new Date(),
    });

    await transactionLogger.log({
      paymentId: payment._id,
      orderId: order._id,
      userId,
      event: 'payment.success',
      status: 'success',
      message: `Payment ${payment.paymentId} succeeded`,
      metadata: { transactionId: engineResult.gatewayResponse?.transactionId, duration },
      req,
      duration,
    });

    // Async webhook
    const updatedOrder = await Order.findById(order._id);
    webhookService.sendWebhook({ payment, order: updatedOrder });

  } else {
    payment.status = 'failed';
    payment.failureReason = engineResult.failureReason;
    payment.gatewayResponse = engineResult.gatewayResponse;
    await payment.save();

    const remainingAttempts = order.maxAttempts - order.attempts;
    const newOrderStatus = order.attempts >= order.maxAttempts ? 'failed' : 'created';

    await Order.findByIdAndUpdate(order._id, { status: newOrderStatus });

    await transactionLogger.log({
      paymentId: payment._id,
      orderId: order._id,
      userId,
      event: 'payment.failed',
      status: 'error',
      message: `Payment ${payment.paymentId} failed: ${engineResult.failureReason}`,
      metadata: { failureReason: engineResult.failureReason, remainingAttempts: Math.max(0, remainingAttempts - 1), duration },
      req,
      duration,
    });

    webhookService.sendWebhook({ payment, order });
  }

  return {
    payment: await Payment.findById(payment._id),
    order: await Order.findById(order._id),
  };
};

/**
 * Retry a failed payment
 */
exports.retryPayment = async ({ orderId, userId, method, cardDetails, upiDetails, idempotencyKey, req }) => {
  const order = await Order.findOne({ orderId, userId });
  if (!order) throw new AppError('Order not found.', 404);
  if (order.status === 'paid') throw new AppError('Order is already paid.', 409);
  if (order.attempts >= order.maxAttempts) {
    throw new AppError(`Maximum retry attempts (${order.maxAttempts}) reached for this order.`, 422);
  }
  if (order.status !== 'created' && order.status !== 'failed') {
    throw new AppError(`Order cannot be retried in ${order.status} status.`, 422);
  }

  await transactionLogger.log({
    orderId: order._id,
    userId,
    event: 'payment.retry',
    status: 'warning',
    message: `Retry attempt ${order.attempts + 1}/${order.maxAttempts} for order ${orderId}`,
    req,
  });

  return exports.processPayment({ orderId, userId, method, cardDetails, upiDetails, idempotencyKey, req });
};
