const User = require('../models/User');
const { createSendToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const logger = require('../config/logger');

exports.signup = async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Prevent privilege escalation via API
  const safeRole = role === 'admin' ? 'user' : (role || 'user');

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const user = await User.create({ name, email, password, role: safeRole });

  logger.info(`New user registered: ${email}`);
  createSendToken(user, 201, res, 'Account created successfully');
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Contact support.', 401));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  logger.info(`User logged in: ${email}`);
  createSendToken(user, 200, res, 'Logged in successfully');
};

exports.getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
