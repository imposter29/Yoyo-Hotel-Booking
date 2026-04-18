const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification/notificationService');

//  Helpers 
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.generateAuthToken();
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.cookie('token', token, cookieOptions);
  user.passwordHash = undefined; // strip from output

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

//  Register 
exports.register = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, email, password, phone, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('An account with this email already exists.', 409));

  // Only allow guest or hotel_admin — never let users self-assign superadmin
  const allowedRoles = ['guest', 'hotel_admin'];
  const assignedRole = allowedRoles.includes(role) ? role : 'guest';

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash: password, // pre-save hook hashes it
    phone,
    role: assignedRole,
  });

  // Fire-and-forget welcome email
  notificationService.sendWelcomeEmail(user);

  sendTokenResponse(user, 201, res);
});

//  Login 
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) return next(new AppError('Please provide email and password.', 400));

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid credentials.', 401));
  }
  if (!user.isActive) return next(new AppError('Account has been deactivated.', 403));

  sendTokenResponse(user, 200, res);
});

//  Logout 
exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

//  Get current user 
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

//  Update profile 
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { firstName, lastName, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { firstName, lastName, phone },
    { new: true, runValidators: true }
  );

  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ success: true, data: { user } });
});

//  Change password 
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) return next(new AppError('User not found.', 404));

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(new AppError('Current password is incorrect.', 401));

  user.passwordHash = newPassword; // pre-save hook will hash it
  await user.save();

  sendTokenResponse(user, 200, res);
});
