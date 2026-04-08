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
const validate = require('../middleware/validate');
const {
  checkAvailabilitySchema,
  createBookingSchema,
  cancelBookingSchema,
} = require('../validators/booking.validator');

// Availability check (public — used before login to show price)
router.post('/check', validate(checkAvailabilitySchema), checkAvailability);

// All booking CRUD routes are protected
router.use(protect);

router.post('/', authorize('guest'), validate(createBookingSchema), createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBooking);
router.patch('/:id/cancel', validate(cancelBookingSchema), cancelBooking);

module.exports = router;
