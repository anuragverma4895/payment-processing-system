const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestHash: {
      type: String,
      required: true,
    },
    response: {
      type: Object,
    },
    status: {
      type: String,
      enum: ['processing', 'completed'],
      default: 'processing',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h expiry
      index: { expireAfterSeconds: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
