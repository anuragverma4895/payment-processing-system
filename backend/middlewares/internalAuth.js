const AppError = require('../utils/AppError');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * Middleware for internal service-to-service authentication.
 * Validates the x-internal-api-key header against INTERNAL_API_KEY env var.
 * Used for Recovery Agent → Payment System communication.
 *
 * Security:
 * - Uses crypto.timingSafeEqual for constant-time comparison (prevents timing attacks)
 * - Never logs the API key value
 * - Never exposes the key in error responses
 */
exports.internalAuth = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];

  if (!apiKey) {
    logger.warn('Internal API request received without API key', {
      ip: req.ip,
      path: req.path,
    });
    return next(new AppError('Internal API key is required.', 401));
  }

  if (!process.env.INTERNAL_API_KEY) {
    logger.error('INTERNAL_API_KEY environment variable is not configured.');
    return next(new AppError('Internal authentication is not configured.', 500));
  }

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(process.env.INTERNAL_API_KEY);
  const received = Buffer.from(apiKey);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    logger.warn('Internal API request received with invalid API key', {
      ip: req.ip,
      path: req.path,
    });
    return next(new AppError('Invalid internal API key.', 403));
  }

  req.isInternalRequest = true;
  next();
};
