const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => `ORD_${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'AED'],
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['created', 'processing', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'created',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    metadata: {
      type: Map,
      of: String,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    paidAt: Date,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual('isExpired').get(function () {
  return this.expiresAt < new Date() && this.status === 'created';
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
