const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ─── Helper: verify admin owns the hotel ──────────────────────────────────────
async function assertHotelOwnership(hotelId, user) {
  if (user.role === 'superadmin') return;
  const hotel = await Hotel.findById(hotelId);
  if (!hotel) throw new AppError('Hotel not found.', 404);
  if (!hotel.managedBy.equals(user._id)) {
    throw new AppError('You are not authorized to manage this hotel.', 403);
  }
}

// ─── @desc  Create a room type ────────────────────────────────────────────────
// ─── @route POST /api/v1/room-types
// ─── @access Private (hotel_admin, superadmin)
exports.createRoomType = asyncHandler(async (req, res, next) => {
  await assertHotelOwnership(req.body.hotel, req.user);

  const roomType = await RoomType.create(req.body);
  res.status(201).json({ success: true, data: { roomType } });
});

// ─── @desc  Get all room types for a hotel ────────────────────────────────────
// ─── @route GET /api/v1/room-types?hotelId=xxx
// ─── @access Public
exports.getRoomTypes = asyncHandler(async (req, res, next) => {
  const { hotelId } = req.query;
  if (!hotelId) return next(new AppError('hotelId query parameter is required.', 400));

  const roomTypes = await RoomType.find({ hotel: hotelId, isActive: true }).select('-__v');
  res.status(200).json({ success: true, count: roomTypes.length, data: { roomTypes } });
});

// ─── @desc  Get a single room type ───────────────────────────────────────────
// ─── @route GET /api/v1/room-types/:id
// ─── @access Public
exports.getRoomType = asyncHandler(async (req, res, next) => {
  const roomType = await RoomType.findById(req.params.id)
    .populate('hotel', 'name address starRating')
    .select('-__v');

  if (!roomType || !roomType.isActive) return next(new AppError('Room type not found.', 404));
  res.status(200).json({ success: true, data: { roomType } });
});

// ─── @desc  Update a room type ────────────────────────────────────────────────
// ─── @route PATCH /api/v1/room-types/:id
// ─── @access Private (hotel_admin, superadmin)
exports.updateRoomType = asyncHandler(async (req, res, next) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) return next(new AppError('Room type not found.', 404));

  await assertHotelOwnership(roomType.hotel, req.user);

  Object.assign(roomType, req.body);
  await roomType.save();

  res.status(200).json({ success: true, data: { roomType } });
});

// ─── @desc  Deactivate (soft-delete) a room type ─────────────────────────────
// ─── @route DELETE /api/v1/room-types/:id
// ─── @access Private (hotel_admin, superadmin)
exports.deleteRoomType = asyncHandler(async (req, res, next) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) return next(new AppError('Room type not found.', 404));

  await assertHotelOwnership(roomType.hotel, req.user);

  roomType.isActive = false;
  await roomType.save();

  res.status(200).json({ success: true, message: 'Room type deactivated.' });
});

// ─── @desc  Get all rooms for a room type ────────────────────────────────────
// ─── @route GET /api/v1/room-types/:id/rooms
// ─── @access Private (hotel_admin, superadmin)
exports.getRoomsForType = asyncHandler(async (req, res, next) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) return next(new AppError('Room type not found.', 404));

  await assertHotelOwnership(roomType.hotel, req.user);

  const rooms = await Room.find({ roomType: req.params.id }).select('-__v');
  res.status(200).json({ success: true, count: rooms.length, data: { rooms } });
});

// ─── @desc  Add a physical room to a room type ───────────────────────────────
// ─── @route POST /api/v1/room-types/:id/rooms
// ─── @access Private (hotel_admin, superadmin)
exports.addRoom = asyncHandler(async (req, res, next) => {
  const roomType = await RoomType.findById(req.params.id);
  if (!roomType) return next(new AppError('Room type not found.', 404));

  await assertHotelOwnership(roomType.hotel, req.user);

  const room = await Room.create({
    hotel: roomType.hotel,
    roomType: roomType._id,
    roomNumber: req.body.roomNumber,
    floor: req.body.floor,
    status: req.body.status || 'available',
    notes: req.body.notes,
  });

  res.status(201).json({ success: true, data: { room } });
});
