const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');
const AppError = require('../utils/AppError');

exports.idempotencyCheck = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return next(new AppError('Idempotency-Key header is required for payment operations.', 400));
  }

  if (idempotencyKey.length < 16 || idempotencyKey.length > 255) {
    return next(new AppError('Idempotency-Key must be between 16 and 255 characters.', 400));
  }

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ body: req.body, userId: req.user.id }))
    .digest('hex');

  const existing = await IdempotencyKey.findOne({
    key: idempotencyKey,
    userId: req.user.id,
  });

  if (existing) {
    if (existing.status === 'processing') {
      return res.status(409).json({
        success: false,
        message: 'A request with this idempotency key is currently being processed.',
        code: 'IDEMPOTENCY_CONFLICT',
      });
    }

    // Return cached response for completed requests
    return res.status(200).json({
      success: true,
      message: 'Duplicate request detected. Returning cached response.',
      idempotencyHit: true,
      data: existing.response,
    });
  }

  // Create new idempotency record
  const record = await IdempotencyKey.create({
    key: idempotencyKey,
    userId: req.user.id,
    requestHash,
    status: 'processing',
  });

  req.idempotencyKey = idempotencyKey;
  req.idempotencyRecord = record;

  // Override res.json to capture response and save it
  const originalJson = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      await IdempotencyKey.findByIdAndUpdate(record._id, {
        response: body,
        status: 'completed',
      });
    } else {
      await IdempotencyKey.findByIdAndDelete(record._id);
    }
    return originalJson(body);
  };

  next();
};
