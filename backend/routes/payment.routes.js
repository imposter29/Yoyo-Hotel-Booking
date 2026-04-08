const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  confirmPayment,
  getPaymentByBooking,
  refundPayment,
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { initiatePaymentSchema } = require('../validators/booking.validator');

router.use(protect); // all payment routes require auth

router.post('/initiate', validate(initiatePaymentSchema), initiatePayment);
router.post('/:paymentId/confirm', confirmPayment);
router.get('/booking/:bookingId', getPaymentByBooking);
router.post(
  '/:paymentId/refund',
  authorize('superadmin'),
  refundPayment
);

module.exports = router;
