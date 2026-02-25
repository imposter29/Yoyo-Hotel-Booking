const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Protect: JWT must be present and valid.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next(new AppError('Not authenticated. Please log in.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid or expired token. Please log in again.', 401));
  }

  const user = await User.findById(decoded.id).select('+isActive');
  if (!user || !user.isActive) {
    return next(new AppError('User account not found or deactivated.', 401));
  }

  req.user = user;
  next();
});

/**
 * Authorize: restrict access to specific roles.
 * Usage: authorize('hotel_admin', 'superadmin')
 */
exports.authorize = (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`Role '${req.user.role}' is not authorized for this action.`, 403)
      );
    }
    next();
  };
