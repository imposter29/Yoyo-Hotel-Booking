const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomType = require('../models/RoomType');
const InventoryCalendar = require('../models/InventoryCalendar');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { computePrice } = require('../services/pricing/YieldPricingEngine');
const { checkAvailability, reserveRoom } = require('../services/booking/AvailabilityService');
const notificationService = require('../services/notification/notificationService');

// @desc  Check room availability and get a price quote
// @route POST /api/bookings/check
// @access Public
exports.checkAvailability = asyncHandler(async (req, res, next) => {
  const { roomTypeId, checkIn, checkOut, guestCount } = req.body;

  const roomType = await RoomType.findById(roomTypeId);
  if (!roomType || !roomType.isActive) return next(new AppError('Room type not found.', 404));

  const available = await checkAvailability(roomTypeId, new Date(checkIn), new Date(checkOut));
  if (!available) {
    return res.status(200).json({
      success: true,
      available: false,
      message: 'No rooms available for selected dates.',
    });
  }

  const pricing = await computePrice(roomTypeId, new Date(checkIn), new Date(checkOut));

  res.status(200).json({
    success: true,
    available: true,
    data: { pricing, roomType },
  });
});

// @desc  Create a booking (HOLD state — 15 min TTL)
// @route POST /api/bookings
// @access Private (guest)
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { roomTypeId, checkIn, checkOut, guestCount, guestRequests } = req.body;

  const roomType = await RoomType.findById(roomTypeId).populate('hotel');
  if (!roomType || !roomType.isActive) return next(new AppError('Room type not found.', 404));

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (checkInDate >= checkOutDate) return next(new AppError('Check-out must be after check-in.', 400));

  // 1. Find and lock an available room
  const room = await reserveRoom(roomTypeId, checkInDate, checkOutDate);
  if (!room) return next(new AppError('No rooms available for selected dates. Please try again.', 409));

  // 2. Compute yield price
  const pricing = await computePrice(roomTypeId, checkInDate, checkOutDate);

  // 3. Create booking in HOLD
  const nights = Math.max(1, Math.round((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)));
  const booking = await Booking.create({
    guest: req.user._id,
    hotel: roomType.hotel._id,
    checkIn: checkInDate,
    checkOut: checkOutDate,
    totalNights: nights,
    guestCount,
    guestRequests,
    status: 'hold',
    totalAmount: pricing.totalPrice,
    currency: roomType.currency || 'INR',
    items: [
      {
        room: room._id,
        roomType: roomType._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        nights: pricing.nights,
        basePricePerNight: pricing.baseRate,
        finalPricePerNight: pricing.pricePerNight,
        totalPrice: pricing.totalPrice,
        pricingBreakdown: pricing.breakdown,
      },
    ],
  });

  res.status(201).json({
    success: true,
    data: {
      booking,
      holdExpiresAt: booking.holdExpiresAt,
      referenceNumber: booking.referenceNumber,
    },
  });
});


// @desc  Get all bookings for the logged-in guest
// @route GET /api/bookings/my
// @access Private
exports.getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ guest: req.user._id })
    .populate('hotel', 'name address images')
    .populate('items.room', 'roomNumber floor')
    .populate('items.roomType', 'name images')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: bookings.length, data: { bookings } });
});

// @desc  Get a single booking
// @route GET /api/bookings/:id
// @access Private
exports.getBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('hotel', 'name address images contactEmail')
    .populate('items.room', 'roomNumber floor')
    .populate('items.roomType', 'name amenities images')
    .populate('guest', 'firstName lastName email phone');

  if (!booking) return next(new AppError('Booking not found.', 404));

  // Allow guest who owns it, or hotel_admin, or superadmin
  const isGuest = booking.guest._id.equals(req.user._id);
  if (!isGuest && !['hotel_admin', 'superadmin'].includes(req.user.role)) {
    return next(new AppError('Not authorized to view this booking.', 403));
  }

  res.status(200).json({ success: true, data: { booking } });
});

// @desc  Cancel a booking
// @route PATCH /api/bookings/:id/cancel
// @access Private
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError('Booking not found.', 404));
  if (!booking.guest.equals(req.user._id)) return next(new AppError('Not authorized.', 403));

  booking.transitionTo('cancelled');
  booking.cancellationReason = req.body.reason || 'Guest requested cancellation';
  await booking.save();

  // Fire-and-forget cancellation email
  notificationService.sendBookingCancellation(booking, req.user);

  res.status(200).json({ success: true, data: { booking } });
});
