const Review = require('../models/Review');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

//  @desc  Create a review for a hotel 
//  @route POST /api/v1/hotels/:hotelId/reviews
//  @access Private (any authenticated user)
exports.createReview = asyncHandler(async (req, res, next) => {
  const { hotelId } = req.params;
  const { rating, title, comment, categories, bookingId } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5.', 400));
  }

  let isVerifiedStay = false;

  // If a bookingId was supplied, validate it (but don't block if it's missing)
  if (bookingId && bookingId.trim()) {
    const booking = await Booking.findOne({
      _id: bookingId.trim(),
      guest: req.user._id,
      hotel: hotelId,
    });

    if (!booking) {
      return next(new AppError('Booking not found or does not belong to you.', 404));
    }

    if (!['confirmed', 'checked_in', 'checked_out'].includes(booking.status)) {
      return next(new AppError('Booking must be confirmed or completed to leave a verified review.', 400));
    }

    isVerifiedStay = true;

    // Prevent duplicate review for the same booking
    const duplicate = await Review.findOne({ booking: booking._id, guest: req.user._id });
    if (duplicate) {
      return next(new AppError('You have already reviewed this stay.', 409));
    }
  }

  const review = await Review.create({
    hotel: hotelId,
    guest: req.user._id,
    booking: (bookingId && bookingId.trim()) || undefined,
    rating,
    title,
    comment,
    categories,
    isVerifiedStay,
  });

  await review.populate('guest', 'firstName lastName');

  res.status(201).json({ success: true, data: { review } });
});

//  @desc  Get all reviews for a hotel 
//  @route GET /api/v1/hotels/:hotelId/reviews
//  @access Public
exports.getHotelReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find({ hotel: req.params.hotelId })
      .populate('guest', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Review.countDocuments({ hotel: req.params.hotelId }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { reviews },
  });
});

//  @desc  Delete a review 
//  @route DELETE /api/v1/hotels/:hotelId/reviews/:reviewId
//  @access Private (owner or superadmin)
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.reviewId);
  if (!review) return next(new AppError('Review not found.', 404));

  const isOwner = review.guest.equals(req.user._id);
  const isAdmin = req.user.role === 'superadmin';

  if (!isOwner && !isAdmin) {
    return next(new AppError('Not authorized to delete this review.', 403));
  }

  await review.deleteOne(); // triggers post('findOneAndDelete') to recalc rating

  res.status(200).json({ success: true, message: 'Review deleted.' });
});
