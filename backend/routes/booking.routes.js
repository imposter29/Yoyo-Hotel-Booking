const express = require('express');
const router = express.Router();
const {
  checkAvailability,
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

// Availability check (public — used before login to show price)
router.post('/check', checkAvailability);

// All booking CRUD routes are protected
router.use(protect);

router.route('/').post(authorize('guest'), createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBooking);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
