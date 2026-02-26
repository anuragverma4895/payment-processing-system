const TransactionLog = require('../models/TransactionLog');
const logger = require('../config/logger');

exports.log = async ({ paymentId, orderId, userId, event, status = 'info', message, metadata, req, duration }) => {
  try {
    await TransactionLog.create({
      paymentId,
      orderId,
      userId,
      event,
      status,
      message,
      metadata,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      duration,
    });
  } catch (err) {
    logger.error('Failed to write transaction log:', err.message);
  }
};
