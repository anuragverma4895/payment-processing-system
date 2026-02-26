const Order = require('../models/Order');
const transactionLogger = require('../services/transactionLogger');
const AppError = require('../utils/AppError');

exports.createOrder = async (req, res, next) => {
  const { amount, currency, description, metadata } = req.body;

  const order = await Order.create({
    userId: req.user._id,
    amount,
    currency: currency || 'INR',
    description,
    metadata,
  });

  await transactionLogger.log({
    orderId: order._id,
    userId: req.user._id,
    event: 'order.created',
    status: 'info',
    message: `Order ${order.orderId} created for ${amount} ${currency || 'INR'}`,
    req,
  });

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: { order },
  });
};

exports.getMyOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const filter = { userId: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

exports.getOrderById = async (req, res, next) => {
  const order = await Order.findOne({
    orderId: req.params.orderId,
    userId: req.user._id,
  });

  if (!order) return next(new AppError('Order not found.', 404));

  res.status(200).json({ success: true, data: { order } });
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.userId = req.query.userId;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Order.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};
