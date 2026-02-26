const rateLimit = require('express-rate-limit');

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    message: { success: false, message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip + (req.user?.id || ''),
  });

exports.globalLimiter = createLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.RATE_LIMIT_MAX) || 100,
  'Too many requests from this IP, please try again after 15 minutes.'
);

exports.authLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many authentication attempts, please try again after 15 minutes.'
);

exports.paymentLimiter = createLimiter(
  60 * 1000,
  5,
  'Too many payment attempts per minute, please slow down.'
);
