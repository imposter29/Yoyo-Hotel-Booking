const express = require('express');
const router = express.Router();
const {
  createHotel,
  getHotels,
  getHotel,
  updateHotel,
  deleteHotel,
} = require('../controllers/hotelController');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(getHotels)
  .post(protect, authorize('hotel_admin', 'superadmin'), createHotel);

router
  .route('/:id')
  .get(getHotel)
  .patch(protect, authorize('hotel_admin', 'superadmin'), updateHotel)
  .delete(protect, authorize('superadmin'), deleteHotel);

module.exports = router;
