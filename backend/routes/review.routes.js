const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access :hotelId
const {
  createReview,
  getHotelReviews,
  deleteReview,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../validators/review.validator');

// GET /api/v1/hotels/:hotelId/reviews — public
router.get('/', getHotelReviews);

// POST /api/v1/hotels/:hotelId/reviews — authenticated guests
router.post('/', protect, validate(createReviewSchema), createReview);

// DELETE /api/v1/hotels/:hotelId/reviews/:reviewId — owner or superadmin
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;
