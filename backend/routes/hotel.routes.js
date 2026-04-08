const express = require('express');
const router = express.Router();
const {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');
const { submitHotel } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createHotelSchema,
  updateHotelSchema,
} = require('../validators/hotel.validator');

// Mount reviews router on hotel routes
const reviewRouter = require('./review.routes');
router.use('/:hotelId/reviews', reviewRouter);

// ─── Submit listing (hotel_admin — goes to pending review) ───────────────────
router.post('/submit', protect, authorize('hotel_admin', 'superadmin'), submitHotel);

router
  .route('/')
  .get(getHotels)
  .post(
    protect,
    authorize('hotel_admin', 'superadmin'),
    validate(createHotelSchema),
    createHotel
  );

router
  .route('/:id')
  .get(getHotel)
  .patch(
    protect,
    authorize('hotel_admin', 'superadmin'),
    validate(updateHotelSchema),
    updateHotel
  )
  .delete(protect, authorize('superadmin'), deleteHotel);

module.exports = router;
