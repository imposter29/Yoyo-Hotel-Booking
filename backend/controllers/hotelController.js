const Hotel = require('../models/Hotel');
const RoomType = require('../models/RoomType');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// @desc  Create a hotel
// @route POST /api/hotels
// @access Private (hotel_admin, superadmin)
exports.createHotel = asyncHandler(async (req, res, next) => {
  req.body.managedBy = req.user._id;
  const hotel = await Hotel.create(req.body);
  res.status(201).json({ success: true, data: { hotel } });
});

// @desc  Get all hotels (with search & filter)
// @route GET /api/hotels
// @access Public
exports.getHotels = asyncHandler(async (req, res) => {
  const { city, country, stars, minRating, search, sortBy, page = 1, limit = 12 } = req.query;

  const query = { isActive: true };

  // Exact city match (used by navbar city buttons)
  if (city) query['address.city'] = new RegExp(`^${city}$`, 'i');
  if (country) query['address.country'] = new RegExp(country, 'i');
  if (stars) query.starRating = Number(stars);
  if (minRating) query.averageRating = { $gte: Number(minRating) };

  // Free-text search across name and city
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { 'address.city': new RegExp(search, 'i') },
    ];
  }

  // Sort
  let sort = { averageRating: -1, starRating: -1 };
  if (sortBy === 'price-asc')  sort = { averageRating: 1 };
  if (sortBy === 'price-desc') sort = { averageRating: -1, starRating: -1 };
  if (sortBy === 'stars')      sort = { starRating: -1, averageRating: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [hotels, total] = await Promise.all([
    Hotel.find(query)
      .select('-__v')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Hotel.countDocuments(query),
  ]);

  // Attach the cheapest active room type price to each hotel
  const hotelIds = hotels.map(h => h._id);
  const roomTypeAgg = await RoomType.aggregate([
    { $match: { hotel: { $in: hotelIds }, isActive: true } },
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

// @desc  Get single hotel
// @route GET /api/hotels/:id
// @access Public
exports.getHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id)
    .populate('roomTypes')
    .select('-__v');
  if (!hotel || !hotel.isActive) return next(new AppError('Hotel not found.', 404));
  res.status(200).json({ success: true, data: { hotel } });
});

// @desc  Update a hotel
// @route PATCH /api/hotels/:id
// @access Private (hotel_admin owning the hotel, superadmin)
exports.updateHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(new AppError('Hotel not found.', 404));

  const isOwner = hotel.managedBy.equals(req.user._id);
  if (!isOwner && req.user.role !== 'superadmin') {
    return next(new AppError('You are not authorized to update this hotel.', 403));
  }

  Object.assign(hotel, req.body);
  await hotel.save();
  res.status(200).json({ success: true, data: { hotel } });
});

// @desc  Deactivate (soft-delete) a hotel
// @route DELETE /api/hotels/:id
// @access Private (superadmin only)
exports.deleteHotel = asyncHandler(async (req, res, next) => {
  const hotel = await Hotel.findById(req.params.id);
  if (!hotel) return next(new AppError('Hotel not found.', 404));
  hotel.isActive = false;
  await hotel.save();
  res.status(200).json({ success: true, message: 'Hotel deactivated.' });
});
