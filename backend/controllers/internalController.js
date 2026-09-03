const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const transactionLogger = require('../services/transactionLogger');
const AppError = require('../utils/AppError');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Internal retry endpoint for the AI Revenue Recovery Agent.
 *
 * Flow:
 *   1. Validate request (orderId required)
 *   2. Look up Order from DB to get the real userId (never trust client-sent userId)
 *   3. Check for duplicate recovery actions via recoveryActionId
 *   4. Look up last failed Payment to reuse method/cardDetails/upiDetails
 *   5. Call existing paymentService.retryPayment() — no new payment logic
 *   6. Return the real result
 *
 * Security:
 *   - Authenticated via x-internal-api-key (internalAuth middleware)
 *   - Never requires raw card details from the Recovery Agent
 *   - Reuses already-masked/hashed card details from the stored Payment record
 */
exports.retryPayment = async (req, res, next) => {
  const { orderId, recoveryActionId, method: overrideMethod } = req.body;

  if (!orderId) {
    return next(new AppError('orderId is required.', 400));
  }

  // Look up the order to get the real userId — never trust client-sent userId
  const order = await Order.findOne({ orderId });
  if (!order) {
    return next(new AppError('Order not found.', 404));
  }

  const userId = order.userId;

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

  // Idempotency: check for duplicate recovery actions
  if (recoveryActionId) {
    const idempotencyKey = `recovery_${recoveryActionId}`;
    const existingPayment = await Payment.findOne({ idempotencyKey });

    if (existingPayment) {
      // Re-fetch the current order state for accurate response
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

  // Look up the last failed payment for this order to reuse method/details
  const lastPayment = await Payment.findOne({
    orderId: order._id,
    status: 'failed',
  }).sort({ createdAt: -1 });

  // Determine payment method: use override if provided, else last payment's method, else 'card'
  const method = overrideMethod || lastPayment?.method || 'card';

  // Reuse stored (already safe) card/upi details from last payment
  // These are already masked/hashed — no raw card numbers
  let cardDetails = null;
  let upiDetails = null;

  if (method === 'card' && lastPayment?.cardDetails) {
    cardDetails = {
      maskedNumber: lastPayment.cardDetails.maskedNumber,
      cardHash: lastPayment.cardDetails.cardHash,
      cardType: lastPayment.cardDetails.cardType,
      expiryMonth: lastPayment.cardDetails.expiryMonth,
      expiryYear: lastPayment.cardDetails.expiryYear,
    };
  }

  if (method === 'upi' && lastPayment?.upiDetails) {
    upiDetails = { vpa: lastPayment.upiDetails.vpa };
  }

  // Generate idempotency key — deterministic if recoveryActionId is provided
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
    // are handled by the global error handler — the Recovery Agent gets a clear reason
    return next(error);
  }
};
