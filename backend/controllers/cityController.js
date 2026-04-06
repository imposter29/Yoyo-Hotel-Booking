const asyncHandler = require('../utils/asyncHandler');
const Hotel = require('../models/Hotel');

/**
 * @desc  Get all cities that actually have hotels in the DB
 * @route GET /api/v1/cities
 * @access Public
 */
exports.getCities = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;

  const cities = await Hotel.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$address.city',
        hotelCount: { $sum: 1 },
        avgRating:  { $avg: '$averageRating' },
        country:    { $first: '$address.country' },
      },
    },
    { $sort: { hotelCount: -1 } },
    { $limit: Number(limit) },
    {
      $project: {
        _id: 0,
        city:       '$_id',
        hotelCount: 1,
        avgRating:  { $round: ['$avgRating', 1] },
        country:    1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    total: cities.length,
    data: { cities },
  });
});

/**
 * @desc  Get live platform stats for the hero section
 * @route GET /api/v1/cities/stats
 * @access Public
 */
exports.getCityStats = asyncHandler(async (req, res) => {
  const [result] = await Hotel.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id:        null,
        totalHotels: { $sum: 1 },
        cities:      { $addToSet: '$address.city' },
        countries:   { $addToSet: '$address.country' },
      },
    },
    {
      $project: {
        _id: 0,
        totalHotels: 1,
        totalCities:   { $size: '$cities' },
        totalCountries: { $size: '$countries' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: result || { totalHotels: 0, totalCities: 0, totalCountries: 0 },
  });
});
