const Deal = require('../models/Deal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── @desc  Get all active deals ─────────────────────────────────────────────
// ─── @route GET /api/v1/deals
// ─── @access Public
exports.getDeals = asyncHandler(async (req, res) => {
  const deals = await Deal.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select('-__v');

  res.status(200).json({ success: true, total: deals.length, data: { deals } });
});

// ─── @desc  Get a single deal ─────────────────────────────────────────────────
// ─── @route GET /api/v1/deals/:id
// ─── @access Public
exports.getDeal = asyncHandler(async (req, res, next) => {
  const deal = await Deal.findById(req.params.id).select('-__v');
  if (!deal) return next(new AppError('Deal not found.', 404));
  res.status(200).json({ success: true, data: { deal } });
});

// ─── @desc  Create a deal ─────────────────────────────────────────────────────
// ─── @route POST /api/v1/deals
// ─── @access Private (superadmin)
exports.createDeal = asyncHandler(async (req, res) => {
  req.body.createdBy = req.user._id;
  const deal = await Deal.create(req.body);
  res.status(201).json({ success: true, data: { deal } });
});

// ─── @desc  Update a deal ─────────────────────────────────────────────────────
// ─── @route PATCH /api/v1/deals/:id
// ─── @access Private (superadmin)
exports.updateDeal = asyncHandler(async (req, res, next) => {
  const deal = await Deal.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!deal) return next(new AppError('Deal not found.', 404));
  res.status(200).json({ success: true, data: { deal } });
});

// ─── @desc  Delete a deal ─────────────────────────────────────────────────────
// ─── @route DELETE /api/v1/deals/:id
// ─── @access Private (superadmin)
exports.deleteDeal = asyncHandler(async (req, res, next) => {
  const deal = await Deal.findByIdAndDelete(req.params.id);
  if (!deal) return next(new AppError('Deal not found.', 404));
  res.status(200).json({ success: true, message: 'Deal deleted.' });
});
