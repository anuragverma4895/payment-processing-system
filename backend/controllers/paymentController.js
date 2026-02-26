const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');
const AppError = require('../utils/AppError');

exports.initiatePayment = async (req, res, next) => {
  const { orderId, method, cardDetails, upiDetails } = req.body;

  const result = await paymentService.processPayment({
    orderId,
    userId: req.user._id,
    method,
    cardDetails,
    upiDetails,
    idempotencyKey: req.idempotencyKey,
    req,
  });

  const statusCode = result.payment.status === 'success' ? 200 : 402;

  res.status(statusCode).json({
    success: result.payment.status === 'success',
    message: result.payment.status === 'success' ? 'Payment processed successfully' : 'Payment failed',
    data: {
      payment: {
        paymentId: result.payment.paymentId,
        status: result.payment.status,
        amount: result.payment.amount,
        currency: result.payment.currency,
        method: result.payment.method,
        failureReason: result.payment.failureReason,
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
};

exports.retryPayment = async (req, res, next) => {
  const { orderId, method, cardDetails, upiDetails } = req.body;

  const result = await paymentService.retryPayment({
    orderId,
    userId: req.user._id,
    method,
    cardDetails,
    upiDetails,
    idempotencyKey: req.idempotencyKey,
    req,
  });

  const statusCode = result.payment.status === 'success' ? 200 : 402;

  res.status(statusCode).json({
    success: result.payment.status === 'success',
    message: result.payment.status === 'success' ? 'Retry successful' : 'Retry failed',
    data: {
      payment: {
        paymentId: result.payment.paymentId,
        status: result.payment.status,
        amount: result.payment.amount,
        currency: result.payment.currency,
        method: result.payment.method,
        failureReason: result.payment.failureReason,
        retryCount: result.payment.retryCount,
      },
      order: {
        orderId: result.order.orderId,
        status: result.order.status,
        attempts: result.order.attempts,
        remainingAttempts: Math.max(0, result.order.maxAttempts - result.order.attempts),
      },
    },
  });
};

exports.getPaymentById = async (req, res, next) => {
  const payment = await Payment.findOne({
    paymentId: req.params.paymentId,
    userId: req.user._id,
  });

  if (!payment) return next(new AppError('Payment not found.', 404));

  res.status(200).json({ success: true, data: { payment } });
};

exports.getMyPayments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.method) filter.method = req.query.method;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('orderId', 'orderId description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

// Admin: Get all payments
exports.getAllPayments = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.method) filter.method = req.query.method;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('userId', 'name email')
      .populate('orderId', 'orderId description')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

// Admin: Dashboard stats
exports.getDashboardStats = async (req, res) => {
  const [paymentStats, recentPayments, methodBreakdown] = await Promise.all([
    Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]),
    Payment.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10),
    Payment.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = { total: 0, success: 0, failed: 0, pending: 0, totalRevenue: 0 };
  paymentStats.forEach(({ _id, count, totalAmount }) => {
    stats.total += count;
    stats[_id] = count;
    if (_id === 'success') stats.totalRevenue = totalAmount;
  });

  res.status(200).json({
    success: true,
    data: { stats, recentPayments, methodBreakdown },
  });
};
