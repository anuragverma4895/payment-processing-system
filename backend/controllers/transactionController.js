const TransactionLog = require('../models/TransactionLog');

exports.getLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.event) filter.event = req.query.event;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.paymentId) filter.paymentId = req.query.paymentId;

  const [logs, total] = await Promise.all([
    TransactionLog.find(filter)
      .populate('userId', 'name email')
      .populate('paymentId', 'paymentId')
      .populate('orderId', 'orderId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TransactionLog.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};

exports.getMyLogs = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    TransactionLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    TransactionLog.countDocuments({ userId: req.user._id }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      logs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    },
  });
};
