const User = require('../models/User');
const Booking = require('../models/Booking');
const Hotel = require('../models/Hotel');
const Review = require('../models/Review');
const RoomType = require('../models/RoomType');
const Room = require('../models/Room');
const InventoryCalendar = require('../models/InventoryCalendar');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

//  @desc  Get platform-wide analytics 
//  @route GET /api/v1/admin/analytics
//  @access Private (superadmin)
exports.getAnalytics = asyncHandler(async (req, res) => {
  const isHotelAdmin = req.user.role === 'hotel_admin';
  let hotelIds = [];
  if (isHotelAdmin) {
    const adminHotels = await Hotel.find({ managedBy: req.user._id }).select('_id');
    hotelIds = adminHotels.map(h => h._id);
  }

  const hotelQuery = isHotelAdmin ? { _id: { $in: hotelIds }, isActive: true } : { isActive: true };
  const bookingQuery = isHotelAdmin ? { hotel: { $in: hotelIds } } : {};
  const confirmedQuery = { ...bookingQuery, status: { $in: ['confirmed', 'checked_in', 'checked_out'] } };

  const [
    totalUsers,
    totalHotels,
    totalBookings,
    confirmedBookings,
    revenueResult,
    recentBookings,
    topHotels,
  ] = await Promise.all([
    isHotelAdmin ? Promise.resolve(0) : User.countDocuments(),
    Hotel.countDocuments(hotelQuery),
    Booking.countDocuments(bookingQuery),
    Booking.countDocuments(confirmedQuery),
    Booking.aggregate([
      { $match: confirmedQuery },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Booking.find(bookingQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('guest', 'firstName lastName email')
      .populate('hotel', 'name')
      .select('status totalAmount checkIn checkOut createdAt'),
    Booking.aggregate([
      { $match: confirmedQuery },
      { $group: { _id: '$hotel', bookingCount: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'hotels',
          localField: '_id',
          foreignField: '_id',
          as: 'hotel',
        },
      },
      { $unwind: '$hotel' },
      {
        $project: {
          hotelName: '$hotel.name',
          bookingCount: 1,
          revenue: 1,
        },
      },
    ]),
  ]);

  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

  res.status(200).json({
    success: true,
    data: {
      overview: {
        totalUsers,
        totalHotels,
        totalBookings,
        confirmedBookings,
        totalRevenue,
        conversionRate:
          totalBookings > 0
            ? ((confirmedBookings / totalBookings) * 100).toFixed(1) + '%'
            : '0%',
      },
      recentBookings,
      topHotels,
    },
  });
});

//  @desc  Get all users 
//  @route GET /api/v1/admin/users
//  @access Private (superadmin)
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (role) query.role = role;
  if (search) {
    query.$or = [
      { firstName: new RegExp(search, 'i') },
      { lastName: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { users },
  });
});

//  @desc  Get a single user 
//  @route GET /api/v1/admin/users/:id
//  @access Private (superadmin)
exports.getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-passwordHash -resetPasswordToken -resetPasswordExpires')
    .populate('managedHotels', 'name address.city');

  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ success: true, data: { user } });
});

//  @desc  Update user role or active status 
//  @route PATCH /api/v1/admin/users/:id
//  @access Private (superadmin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const allowedFields = ['role', 'isActive'];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).select('-passwordHash');

  if (!user) return next(new AppError('User not found.', 404));
  res.status(200).json({ success: true, data: { user } });
});

//  @desc  Get all bookings (admin view) 
//  @route GET /api/v1/admin/bookings
//  @access Private (hotel_admin, superadmin)
exports.getAllBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, hotelId } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (status) query.status = status;

  // hotel_admin can only see their own hotels' bookings
  if (req.user.role === 'hotel_admin') {
    const hotels = await Hotel.find({ managedBy: req.user._id }).select('_id');
    query.hotel = { $in: hotels.map((h) => h._id) };
  } else if (hotelId) {
    query.hotel = hotelId;
  }

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('guest', 'firstName lastName email phone')
      .populate('hotel', 'name address.city')
      .populate('items.roomType', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Booking.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { bookings },
  });
});

//  @desc  Update booking status (admin) 
//  @route PATCH /api/v1/admin/bookings/:id/status
//  @access Private (hotel_admin, superadmin)
exports.updateBookingStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError('Status is required.', 400));

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError('Booking not found.', 404));

  try {
    booking.transitionTo(status);
    await booking.save();
  } catch (err) {
    return next(new AppError(err.message, 400));
  }

  res.status(200).json({ success: true, data: { booking } });
});

//  @desc  Get all hotels (admin view with management info) 
//  @route GET /api/v1/admin/hotels
//  @access Private (superadmin)
exports.getAdminHotels = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const query = {};
  if (req.user.role === 'hotel_admin') {
    query.managedBy = req.user._id;
  }
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { 'address.city': new RegExp(search, 'i') },
    ];
  }

  const [hotels, total] = await Promise.all([
    Hotel.find(query)
      .populate('managedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-__v'),
    Hotel.countDocuments(query),
  ]);

  const hotelIds = hotels.map(h => h._id);
  const roomTypeAgg = await RoomType.aggregate([
    { $match: { hotel: { $in: hotelIds } } },
    { $group: { _id: '$hotel', startingFrom: { $min: '$baseRatePerNight' } } },
  ]);
  const priceMap = {};
  roomTypeAgg.forEach(r => { priceMap[r._id.toString()] = r.startingFrom; });

  const hotelsWithPrice = hotels.map(h => ({
    ...h.toObject(),
    startingFrom: priceMap[h._id.toString()] ?? null,
  }));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { hotels: hotelsWithPrice },
  });
});

//  @desc  Get all reviews (admin view) 
//  @route GET /api/v1/admin/reviews
//  @access Private (superadmin)
exports.getAdminReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, total] = await Promise.all([
    Review.find()
      .populate('guest', 'firstName lastName email')
      .populate('hotel', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Review.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: { reviews },
  });
});

//  @desc  Update available rooms for a hotel (all future dates) 
//  @route PATCH /api/v1/admin/hotels/:hotelId/rooms
//  @access Private (superadmin)
exports.updateHotelRooms = asyncHandler(async (req, res, next) => {
  const { hotelId } = req.params;
  const { totalRooms } = req.body;

  if (!totalRooms || totalRooms < 0 || totalRooms > 500) {
    return next(new AppError('totalRooms must be between 0 and 500.', 400));
  }

  const hotel = await Hotel.findById(hotelId);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  const roomTypes = await RoomType.find({ hotel: hotelId, isActive: true });
  if (!roomTypes.length) return next(new AppError('No active room types for this hotel.', 404));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let updatedInventory = 0;

  for (const rt of roomTypes) {
    // Get all future inventory docs for this roomType
    const futureDocs = await InventoryCalendar.find({
      roomType: rt._id,
      date: { $gte: today },
    });

    for (const doc of futureDocs) {
      const bookedOrHeld = doc.bookedCount + doc.heldCount;
      // availableCount = new total minus already occupied, minimum 0
      const newAvailable = Math.max(0, totalRooms - bookedOrHeld);

      await InventoryCalendar.findByIdAndUpdate(doc._id, {
        totalRooms,
        availableCount: newAvailable,
      });
      updatedInventory++;
    }

    // Also update roomType maxOccupancy metadata (optional)
    await RoomType.findByIdAndUpdate(rt._id, {});
  }

  // Sync Room documents: create or remove physical rooms to match totalRooms
  const existingRooms = await Room.find({ hotel: hotelId }).sort({ roomNumber: 1 });
  const currentCount = existingRooms.length;

  if (totalRooms > currentCount) {
    // Create additional rooms
    const roomTypePrimary = roomTypes[0];
    const newRooms = [];
    for (let i = currentCount + 1; i <= totalRooms; i++) {
      newRooms.push({
        hotel: hotelId,
        roomType: roomTypePrimary._id,
        roomNumber: `S${String(i).padStart(3, '0')}`,
        floor: Math.ceil(i / 4),
        status: 'available',
      });
    }
    await Room.insertMany(newRooms, { ordered: false });
  } else if (totalRooms < currentCount) {
    // Remove excess rooms (those not currently occupied)
    const excessCount = currentCount - totalRooms;
    const roomsToRemove = existingRooms
      .filter(r => r.status === 'available')
      .slice(0, excessCount)
      .map(r => r._id);
    if (roomsToRemove.length) {
      await Room.deleteMany({ _id: { $in: roomsToRemove } });
    }
  }

  const finalRoomCount = await Room.countDocuments({ hotel: hotelId });

  res.status(200).json({
    success: true,
    message: `Updated ${updatedInventory} inventory entries across ${roomTypes.length} room type(s). Physical rooms: ${finalRoomCount}.`,
    data: {
      hotelId,
      totalRooms,
      inventoryEntriesUpdated: updatedInventory,
      physicalRooms: finalRoomCount,
    },
  });
});

//  @desc  Create a hotel (with room type + inventory) 
//  @route POST /api/v1/admin/hotels
//  @access Private (superadmin)
exports.createAdminHotel = asyncHandler(async (req, res, next) => {
  const {
    name, description,
    street = '', city, state = '', country = 'India', postalCode = '',
    starRating = 3,
    amenities = [],
    checkInTime = '14:00', checkOutTime = '11:00',
    petFriendly = false, smokingAllowed = false,
    pricePerNight, maxOccupancy = 2, totalRooms = 5,
    inventoryDays = 90,
  } = req.body;

  if (!name || !city || !pricePerNight) {
    return next(new AppError('name, city, and pricePerNight are required.', 400));
  }

  //  1. Create Hotel 
  const hotel = await Hotel.create({
    name: name.trim(),
    description: description || `${name} is a ${starRating}-star property in ${city}.`,
    address: { street, city: city.trim(), state, country, postalCode },
    starRating: Number(starRating),
    amenities,
    images: [],
    policies: {
      checkInTime, checkOutTime, petFriendly, smokingAllowed,
    },
    isActive: true,
    managedBy: req.user._id,
  });

  //  2. Create Default Room Type 
  const roomType = await RoomType.create({
    hotel: hotel._id,
    name: 'Standard Room',
    description: `Standard room at ${hotel.name}.`,
    maxOccupancy: Number(maxOccupancy),
    baseRatePerNight: Number(pricePerNight),
    currency: 'INR',
    amenities: amenities.slice(0, 5),
    bedConfiguration: [{ bedType: 'double', count: 1 }],
    cancellationPolicy: { freeCancellationHours: 24 },
    isActive: true,
  });

  //  3. Create Physical Rooms 
  const ROOMS = Math.max(1, Math.min(Number(totalRooms), 100));
  const roomDocs = [];
  for (let i = 1; i <= ROOMS; i++) {
    roomDocs.push({
      hotel: hotel._id,
      roomType: roomType._id,
      roomNumber: `S${String(i).padStart(3, '0')}`,
      floor: Math.ceil(i / 4),
      status: 'available',
      isActive: true,
    });
  }
  await Room.insertMany(roomDocs);

  //  4. Seed Inventory 
  const DAYS = Math.max(30, Math.min(Number(inventoryDays), 365));
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const inventoryDocs = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() + i);
    inventoryDocs.push({
      hotel: hotel._id,
      roomType: roomType._id,
      date,
      totalRooms: ROOMS,
      availableCount: ROOMS,
      heldCount: 0,
      bookedCount: 0,
      demandIndex: 0,
    });
  }
  await InventoryCalendar.insertMany(inventoryDocs, { ordered: false });

  res.status(201).json({
    success: true,
    message: `Hotel created with ${ROOMS} rooms and ${DAYS}-day inventory.`,
    data: { hotel, roomType, roomsCreated: ROOMS, inventoryDays: DAYS },
  });
});

//  @desc  Approve a pending hotel (makes it live) 
//  @route PATCH /api/v1/admin/hotels/:hotelId/approve
//  @access Private (superadmin)
exports.approveHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  hotel.approvalStatus = 'approved';
  hotel.isActive = true;
  hotel.rejectionReason = '';
  await hotel.save();

  // Activate drafted room types and rooms
  await RoomType.updateMany({ hotel: hotel._id }, { isActive: true });
  await Room.updateMany({ hotel: hotel._id }, { isActive: true });

  // If for some reason physical rooms weren't seeded previously, seed them now
  const roomTypes = await RoomType.find({ hotel: hotel._id });
  for (const rt of roomTypes) {
    const existingRooms = await Room.countDocuments({ roomType: rt._id });
    if (existingRooms === 0) {
      const ROOMS = 5;
      const roomDocs = [];
      for (let i = 1; i <= ROOMS; i++) {
        roomDocs.push({
          hotel: hotel._id, roomType: rt._id, roomNumber: `S${String(i).padStart(3, '0')}`,
          floor: Math.ceil(i / 4), status: 'available', isActive: true,
        });
      }
      await Room.insertMany(roomDocs);

      const DAYS = 90;
      const today = new Date();
      const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
      const inventoryDocs = [];
      for (let i = 0; i < DAYS; i++) {
        const date = new Date(utcToday);
        date.setUTCDate(utcToday.getUTCDate() + i);
        inventoryDocs.push({
          hotel: hotel._id, roomType: rt._id, date,
          totalRooms: ROOMS, availableCount: ROOMS, heldCount: 0, bookedCount: 0, demandIndex: 0,
        });
      }
      await InventoryCalendar.insertMany(inventoryDocs, { ordered: false });
    }
  }

  res.status(200).json({
    success: true,
    message: `"${hotel.name}" is now live.`,
    data: { hotel },
  });
});

//  @desc  Reject a pending hotel 
//  @route PATCH /api/v1/admin/hotels/:hotelId/reject
//  @access Private (superadmin)
exports.rejectHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.hotelId);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  hotel.approvalStatus = 'rejected';
  hotel.isActive = false;
  hotel.rejectionReason = req.body.reason || 'Does not meet listing requirements.';
  await hotel.save();

  res.status(200).json({
    success: true,
    message: `"${hotel.name}" has been rejected.`,
    data: { hotel },
  });
});

//  @desc  Submit hotel listing request (hotel_admin) 
//  @route POST /api/v1/hotels/submit
//  @access Private (hotel_admin)
exports.submitHotel = asyncHandler(async (req, res, next) => {
  const {
    name, description,
    street = '', city, state = '', country = 'India', postalCode = '',
    starRating = 3,
    amenities = [],
    checkInTime = '14:00', checkOutTime = '11:00',
    petFriendly = false, smokingAllowed = false,
    contactEmail = '', contactPhone = '',
    pricePerNight, maxOccupancy = 2, totalRooms = 5,
  } = req.body;

  if (!name || !city || !pricePerNight) {
    return next(new AppError('name, city, and pricePerNight are required.', 400));
  }

  const hotel = await Hotel.create({
    name: name.trim(),
    description: description || `${name} is a ${starRating}-star property in ${city}.`,
    address: { street, city: city.trim(), state, country, postalCode },
    starRating: Number(starRating),
    amenities,
    contactEmail,
    contactPhone,
    policies: { checkInTime, checkOutTime, petFriendly, smokingAllowed },
    isActive: false,
    approvalStatus: 'pending',
    managedBy: req.user._id,
  });

  // Create a draft room type (inventory seeded after approval)
  const roomType = await RoomType.create({
    hotel: hotel._id,
    name: 'Standard Room',
    description: `Standard room at ${hotel.name}.`,
    maxOccupancy: Number(maxOccupancy),
    baseRatePerNight: Number(pricePerNight),
    currency: 'INR',
    amenities: amenities.slice(0, 5),
    bedConfiguration: [{ bedType: 'double', count: 1 }],
    cancellationPolicy: { freeCancellationHours: 24 },
    isActive: false,
  });

  // Create Physical Rooms (inactive until approved)
  const ROOMS = Math.max(1, Math.min(Number(totalRooms), 100));
  const roomDocs = [];
  for (let i = 1; i <= ROOMS; i++) {
    roomDocs.push({
      hotel: hotel._id,
      roomType: roomType._id,
      roomNumber: `S${String(i).padStart(3, '0')}`,
      floor: Math.ceil(i / 4),
      status: 'available',
      isActive: false,
    });
  }
  await Room.insertMany(roomDocs);

  // Seed Inventory
  const DAYS = 90;
  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const inventoryDocs = [];
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() + i);
    inventoryDocs.push({
      hotel: hotel._id,
      roomType: roomType._id,
      date,
      totalRooms: ROOMS,
      availableCount: ROOMS,
      heldCount: 0,
      bookedCount: 0,
      demandIndex: 0,
    });
  }
  await InventoryCalendar.insertMany(inventoryDocs, { ordered: false });

  res.status(201).json({
    success: true,
    message: 'Your hotel listing has been submitted for review. You will be notified once approved.',
    data: { hotel },
  });
});

//  @desc  Get pending hotels 
//  @route GET /api/v1/admin/hotels/pending
//  @access Private (superadmin)
exports.getPendingHotels = asyncHandler(async (req, res) => {
  const hotels = await Hotel.find({ approvalStatus: 'pending' })
    .populate('managedBy', 'firstName lastName email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total: hotels.length,
    data: { hotels },
  });
});
