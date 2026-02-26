const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema(
  {
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    event: {
      type: String,
      required: true,
      enum: [
        'payment.initiated',
        'payment.processing',
        'payment.success',
        'payment.failed',
        'payment.retry',
        'payment.refunded',
        'order.created',
        'order.status_changed',
        'webhook.sent',
        'webhook.failed',
        'idempotency.hit',
      ],
    },
    status: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
    },
    ipAddress: String,
    userAgent: String,
    duration: Number, // Processing duration in ms
  },
  {
    timestamps: true,
  }
);

transactionLogSchema.index({ createdAt: -1 });
transactionLogSchema.index({ event: 1, createdAt: -1 });

module.exports = mongoose.model('TransactionLog', transactionLogSchema);
