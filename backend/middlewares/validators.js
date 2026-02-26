const { body, param, query, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Middleware to handle validation result
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join(', ');
    return next(new AppError(`Validation failed: ${messages}`, 400));
  }
  next();
};

// Auth validators
exports.signupValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
];

exports.loginValidator = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Order validators
exports.createOrderValidator = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['INR', 'USD', 'EUR', 'GBP', 'AED'])
    .withMessage('Invalid currency'),
  body('description').optional().trim().isLength({ max: 255 }),
];

// Payment validators
exports.createPaymentValidator = [
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('method')
    .isIn(['card', 'upi', 'netbanking', 'wallet'])
    .withMessage('Invalid payment method'),
  body('cardDetails.number')
    .if(body('method').equals('card'))
    .notEmpty()
    .isCreditCard()
    .withMessage('Valid card number is required for card payments'),
  body('cardDetails.expiryMonth')
    .if(body('method').equals('card'))
    .notEmpty()
    .isInt({ min: 1, max: 12 })
    .withMessage('Valid expiry month required'),
  body('cardDetails.expiryYear')
    .if(body('method').equals('card'))
    .notEmpty()
    .isInt({ min: new Date().getFullYear() })
    .withMessage('Valid expiry year required'),
  body('cardDetails.cvv')
    .if(body('method').equals('card'))
    .notEmpty()
    .isLength({ min: 3, max: 4 })
    .isNumeric()
    .withMessage('Valid CVV required'),
  body('upiDetails.vpa')
    .if(body('method').equals('upi'))
    .notEmpty()
    .matches(/^[\w.-]+@[\w.-]+$/)
    .withMessage('Valid UPI VPA required (e.g., user@upi)'),
];
