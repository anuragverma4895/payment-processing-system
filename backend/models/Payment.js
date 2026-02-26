const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      unique: true,
      default: () => `PAY_${uuidv4().replace(/-/g, '').toUpperCase().slice(0, 16)}`,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    // Card details (hashed/masked for security)
    cardDetails: {
      maskedNumber: String,    // e.g., **** **** **** 4242
      cardHash: String,        // SHA-256 hash of full card number
      cardType: String,        // visa, mastercard, amex
      expiryMonth: String,
      expiryYear: String,
    },
    // UPI details
    upiDetails: {
      vpa: String,             // Virtual Payment Address
    },
    gatewayResponse: {
      type: Object,
    },
    failureReason: String,
    idempotencyKey: {
      type: String,
      index: true,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    webhookSent: {
      type: Boolean,
      default: false,
    },
    webhookSentAt: Date,
    processedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

paymentSchema.index({ paymentId: 1 });
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
