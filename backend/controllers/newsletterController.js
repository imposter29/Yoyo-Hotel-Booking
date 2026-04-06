const Newsletter = require('../models/Newsletter');
const asyncHandler = require('../utils/asyncHandler');

// ─── @desc  Subscribe to newsletter ──────────────────────────────────────────
// ─── @route POST /api/v1/newsletter/subscribe
// ─── @access Public
exports.subscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const existing = await Newsletter.findOne({ email: email.toLowerCase() });

  if (existing) {
    if (existing.isSubscribed) {
      return res.status(200).json({ success: true, message: 'You are already subscribed!' });
    }
    // Re-subscribe
    existing.isSubscribed = true;
    existing.unsubscribedAt = undefined;
    await existing.save();
    return res.status(200).json({ success: true, message: 'Welcome back! You have been re-subscribed.' });
  }

  await Newsletter.create({ email: email.toLowerCase() });
  res.status(201).json({ success: true, message: 'Successfully subscribed to exclusive deals!' });
});

// ─── @desc  Unsubscribe from newsletter ──────────────────────────────────────
// ─── @route POST /api/v1/newsletter/unsubscribe
// ─── @access Public
exports.unsubscribe = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  await Newsletter.findOneAndUpdate(
    { email: email.toLowerCase() },
    { isSubscribed: false, unsubscribedAt: new Date() }
  );

  res.status(200).json({ success: true, message: 'Successfully unsubscribed.' });
});

// ─── @desc  Get all subscribers (admin) ──────────────────────────────────────
// ─── @route GET /api/v1/newsletter/subscribers
// ─── @access Private (superadmin)
exports.getSubscribers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, active } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (active !== undefined) query.isSubscribed = active === 'true';

  const [subscribers, total] = await Promise.all([
    Newsletter.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Newsletter.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { subscribers },
  });
});
