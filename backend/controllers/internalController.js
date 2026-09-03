const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const transactionLogger = require('../services/transactionLogger');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const SUPPORTED_RECOVERY_METHODS = ['card', 'upi', 'netbanking', 'wallet'];

/**
 * Internal retry endpoint for the AI Revenue Recovery Agent.
 *
 * Flow:
 *   1. Validate request (orderId required)
 *   2. Look up Order from DB to get the real userId (never trust client-sent userId)
 *   3. Check for duplicate recovery actions via recoveryActionId
 *   4. Look up last failed Payment to reuse method/cardDetails/upiDetails
 *   5. Call existing paymentService.retryPayment() - no new payment logic
 *   6. Return the real result
 *
 * Security:
 *   - Authenticated via x-internal-api-key (internalAuth middleware)
 *   - Never requires raw card details from the Recovery Agent
 *   - Reuses already-masked/hashed card details from the stored Payment record
 */
exports.retryPayment = async (req, res, next) => {
  const { orderId, recoveryActionId, method: overrideMethod, cardDetails: rawCardDetails, upiDetails: rawUpiDetails } = req.body;

  if (!orderId) {
    return next(new AppError('orderId is required.', 400));
  }

  if (rawCardDetails || rawUpiDetails) {
    return next(new AppError('Raw payment details are not accepted by the internal retry API.', 400));
  }

  // Look up the order to get the real userId - never trust client-sent userId
  const order = await Order.findOne({ orderId });
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  const userId = order.userId;

  // Idempotency: check duplicate recovery actions before state guards so
  // retries of the same successful action remain replay-safe.
  if (recoveryActionId) {
    const idempotencyKey = `recovery_${recoveryActionId}`;
    const existingPayment = await Payment.findOne({ idempotencyKey });

    if (existingPayment) {
      const currentOrder = await Order.findById(order._id);

      logger.info(`Duplicate recovery action detected: ${recoveryActionId}`);
      return res.status(200).json({
        success: existingPayment.status === 'success',
        message: 'Duplicate recovery action. Returning existing result.',
        idempotencyHit: true,
        source: 'internal_recovery',
        data: {
          payment: {
            paymentId: existingPayment.paymentId,
            status: existingPayment.status,
            amount: existingPayment.amount,
            currency: existingPayment.currency,
            method: existingPayment.method,
            failureReason: existingPayment.failureReason,
            retryCount: existingPayment.retryCount,
            processedAt: existingPayment.processedAt,
          },
          order: {
            orderId: currentOrder.orderId,
            status: currentOrder.status,
            attempts: currentOrder.attempts,
            remainingAttempts: Math.max(0, currentOrder.maxAttempts - currentOrder.attempts),
          },
        },
      });
    }
  }

  if (order.status === 'paid') {
    return next(new AppError('Order is already paid.', 409));
  }

  if (order.status === 'cancelled') {
    return next(new AppError('Order has been cancelled.', 409));
  }

  if (order.attempts >= order.maxAttempts) {
    return next(new AppError(`Maximum retry attempts (${order.maxAttempts}) reached for this order.`, 422));
  }

  // Log that an internal recovery retry was requested
  await transactionLogger.log({
    orderId: order._id,
    userId,
    event: 'recovery.retry_requested',
    status: 'info',
    message: `Internal recovery retry requested for order ${orderId}`,
    metadata: {
      recoveryActionId: recoveryActionId || null,
      source: 'recovery_agent',
    },
    req,
  });
  // Look up the last failed payment for this order to reuse method/details
  const lastPayment = await Payment.findOne({
    orderId: order._id,
    status: 'failed',
  }).sort({ createdAt: -1 });

  if (!lastPayment) {
    return next(new AppError('No failed payment attempt found for this order.', 422));
  }

  // Determine payment method: use override if provided, else last payment's method.
  const method = overrideMethod || lastPayment.method;
  if (!SUPPORTED_RECOVERY_METHODS.includes(method)) {
    return next(new AppError('Invalid payment method for recovery retry.', 400));
  }

  // Reuse stored (already safe) card/UPI details from last payment.
  let cardDetails = null;
  let upiDetails = null;

  if (method === 'card') {
    if (!lastPayment.cardDetails?.maskedNumber || !lastPayment.cardDetails?.cardHash) {
      return next(new AppError('Stored card details are not available for recovery retry.', 422));
    }

    cardDetails = {
      maskedNumber: lastPayment.cardDetails.maskedNumber,
      cardHash: lastPayment.cardDetails.cardHash,
      cardType: lastPayment.cardDetails.cardType,
      expiryMonth: lastPayment.cardDetails.expiryMonth,
      expiryYear: lastPayment.cardDetails.expiryYear,
    };
  }

  if (method === 'upi') {
    if (!lastPayment.upiDetails?.vpa) {
      return next(new AppError('Stored UPI details are not available for recovery retry.', 422));
    }

    upiDetails = { vpa: lastPayment.upiDetails.vpa };
  }
  // Generate idempotency key - deterministic if recoveryActionId is provided
  const idempotencyKey = recoveryActionId
    ? `recovery_${recoveryActionId}`
    : `recovery_${uuidv4()}`;

  try {
    const result = await paymentService.retryPayment({
      orderId,
      userId,
      method,
      cardDetails,
      upiDetails,
      idempotencyKey,
      req,
    });

    const statusCode = result.payment.status === 'success' ? 200 : 402;

    res.status(statusCode).json({
      success: result.payment.status === 'success',
      message: result.payment.status === 'success'
        ? 'Recovery retry successful'
        : 'Recovery retry failed',
      source: 'internal_recovery',
      data: {
        payment: {
          paymentId: result.payment.paymentId,
          status: result.payment.status,
          amount: result.payment.amount,
          currency: result.payment.currency,
          method: result.payment.method,
          failureReason: result.payment.failureReason,
          retryCount: result.payment.retryCount,
          processedAt: result.payment.processedAt,
        },
        order: {
          orderId: result.order.orderId,
          status: result.order.status,
          attempts: result.order.attempts,
          remainingAttempts: Math.max(0, result.order.maxAttempts - result.order.attempts),
        },
      },
    });
  } catch (error) {
    // AppErrors from paymentService (expired, maxAttempts, already paid, etc.)
    // are handled by the global error handler - the Recovery Agent gets a clear reason
    return next(error);
  }
};
