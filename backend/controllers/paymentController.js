const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Deal = require('../models/Deal');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification/notificationService');

//  Helper: generate a mock gateway charge ID 
const mockChargeId = () =>
  `mock_chg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

//  Helpers: compute refund amount based on cancellation policy 
function computeRefund(booking) {
  const hoursUntilCheckIn =
    (new Date(booking.checkIn) - Date.now()) / (1000 * 60 * 60);

  // Default tiered refund policy
  if (hoursUntilCheckIn >= 48) return booking.totalAmount;        // 100% refund
  if (hoursUntilCheckIn >= 24) return booking.totalAmount * 0.5;  // 50% refund
  return 0;                                                        // no refund
}

//  @desc  Initiate payment for a HOLD booking 
//  @route POST /api/v1/payments/initiate
//  @access Private (guest)
exports.initiatePayment = asyncHandler(async (req, res, next) => {
  const { bookingId, paymentMethod = 'test', dealCode } = req.body;

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError('Booking not found.', 404));

  // Only the guest who owns the booking can pay
  if (!booking.guest.equals(req.user._id)) {
    return next(new AppError('Not authorized to pay for this booking.', 403));
  }

  if (booking.status !== 'hold') {
    return next(
      new AppError(
        `Cannot initiate payment for a booking in '${booking.status}' status.`,
        400
      )
    );
  }

  // Check hold hasn't expired
  if (booking.holdValidUntil && new Date() > booking.holdValidUntil) {
    booking.transitionTo('expired');
    await booking.save();
    return next(new AppError('Booking hold has expired. Please start a new booking.', 410));
  }

  const originalAmount = booking.items.reduce((sum, item) => sum + item.totalPrice, 0);
  let amount = originalAmount;
  let appliedDeal = null;

  if (dealCode) {
    const deal = await Deal.findOne({
      code: dealCode.toUpperCase(),
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (deal) {
      const discountAmount = Math.round((originalAmount * deal.discount) / 100);
      amount = originalAmount - discountAmount;
      appliedDeal = {
        code: deal.code,
        discount: deal.discount,
        discountAmount,
      };
      
      // Update booking with discount info
      booking.discountAmount = discountAmount;
      booking.couponCode = deal.code;
      booking.totalAmount = amount;
      await booking.save();
    } else {
      return next(new AppError('Invalid or expired coupon code.', 400));
    }
  } else {
    // If no dealCode provided, but booking already has a discount, ensure we use the correct amount
    amount = booking.totalAmount;
  }

  // Create a pending payment record
  const payment = await Payment.create({
    booking: booking._id,
    amount: amount,
    currency: booking.currency,
    status: 'pending',
    gatewayProvider: 'mock',
    gatewayOrderId: `mock_ord_${booking._id}`,
    paymentMethod,
    metadata: appliedDeal ? { appliedDeal } : {},
  });

  res.status(201).json({
    success: true,
    data: {
      paymentId: payment._id,
      orderId: payment.gatewayOrderId,
      amount: payment.amount,
      currency: payment.currency,
      booking: {
        id: booking._id,
        referenceNumber: booking.referenceNumber,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalNights: booking.totalNights,
      },
    },
  });
});

//  @desc  Confirm payment (mock / webhook simulation) 
//  @route POST /api/v1/payments/:paymentId/confirm
//  @access Private (guest — mock; in production this would be a webhook)
exports.confirmPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.paymentId).populate('booking');
  if (!payment) return next(new AppError('Payment not found.', 404));

  if (payment.status !== 'pending') {
    return next(
      new AppError(`Payment is already in '${payment.status}' state.`, 400)
    );
  }

  const booking = payment.booking;

  // Ensure only the booking owner can confirm (mock path)
  if (!booking.guest.equals(req.user._id)) {
    return next(new AppError('Not authorized.', 403));
  }

  // Simulate gateway success
  payment.status = 'completed';
  payment.gatewayChargeId = mockChargeId();
  payment.paidAt = new Date();
  payment.gatewayResponse = { simulated: true, paidAt: new Date() };
  await payment.save();

  // Transition booking to confirmed
  booking.transitionTo('confirmed');
  booking.holdValidUntil = undefined; // Clear hold TTL on confirmation
  booking.payment = payment._id;
  await booking.save();

  // Fire-and-forget confirmation email
  const populatedBooking = await booking.populate('guest', 'firstName lastName email');
  notificationService.sendBookingConfirmation(booking, populatedBooking.guest);

  res.status(200).json({
    success: true,
    message: 'Payment confirmed. Booking is now confirmed.',
    data: {
      payment: {
        id: payment._id,
        status: payment.status,
        gatewayChargeId: payment.gatewayChargeId,
        paidAt: payment.paidAt,
      },
      booking: {
        id: booking._id,
        referenceNumber: booking.referenceNumber,
        status: booking.status,
        confirmedAt: booking.confirmedAt,
      },
    },
  });
});

//  @desc  Get payment details for a booking 
//  @route GET /api/v1/payments/booking/:bookingId
//  @access Private
exports.getPaymentByBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return next(new AppError('Booking not found.', 404));

  const isOwner = booking.guest.equals(req.user._id);
  const isAdmin = ['hotel_admin', 'superadmin'].includes(req.user.role);
  if (!isOwner && !isAdmin) return next(new AppError('Not authorized.', 403));

  const payment = await Payment.findOne({ booking: req.params.bookingId });
  if (!payment) return next(new AppError('No payment found for this booking.', 404));

  res.status(200).json({ success: true, data: { payment } });
});

//  @desc  Refund a payment (on cancellation) 
//  @route POST /api/v1/payments/:paymentId/refund
//  @access Private (superadmin)
exports.refundPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.paymentId).populate('booking');
  if (!payment) return next(new AppError('Payment not found.', 404));

  if (payment.status !== 'completed') {
    return next(new AppError('Only completed payments can be refunded.', 400));
  }

  const booking = payment.booking;
  const refundAmount = computeRefund(booking);

  payment.status = refundAmount >= booking.totalAmount ? 'refunded' : 'partially_refunded';
  payment.refundedAmount = refundAmount;
  payment.refundedAt = new Date();
  await payment.save();

  // Update booking refund field
  booking.refundAmount = refundAmount;
  await booking.save();

  res.status(200).json({
    success: true,
    message: `Refund of ₹${refundAmount} processed successfully.`,
    data: {
      refundedAmount: refundAmount,
      paymentStatus: payment.status,
    },
  });
});
