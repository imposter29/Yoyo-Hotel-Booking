const Joi = require('joi');

const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().allow('').optional(),
  country: Joi.string().required(),
  postalCode: Joi.string().allow('').optional(),
});

const createHotelSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().max(2000).optional().allow(''),
  address: addressSchema.required(),
  starRating: Joi.number().integer().min(1).max(5).required(),
  contactEmail: Joi.string().email({ tlds: { allow: false } }).optional().allow(''),
  contactPhone: Joi.string().optional().allow(''),
  amenities: Joi.array().items(Joi.string()).optional(),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        caption: Joi.string().allow('').optional(),
        isPrimary: Joi.boolean().optional(),
      })
    )
    .optional(),
  policies: Joi.object({
    checkInTime: Joi.string().optional(),
    checkOutTime: Joi.string().optional(),
    petFriendly: Joi.boolean().optional(),
    smokingAllowed: Joi.boolean().optional(),
  }).optional(),
  location: Joi.object({
    type: Joi.string().valid('Point').optional(),
    coordinates: Joi.array().items(Joi.number()).length(2).optional(),
  }).optional(),
});

const updateHotelSchema = createHotelSchema.fork(
  ['name', 'address', 'starRating'],
  (field) => field.optional()
);

const createRoomTypeSchema = Joi.object({
  hotel: Joi.string().hex().length(24).required(),
  name: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().max(1000).optional().allow(''),
  maxOccupancy: Joi.number().integer().min(1).required(),
  baseRatePerNight: Joi.number().min(0).required(),
  currency: Joi.string().length(3).uppercase().optional(),
  amenities: Joi.array().items(Joi.string()).optional(),
  bedConfiguration: Joi.array()
    .items(
      Joi.object({
        bedType: Joi.string()
          .valid('single', 'double', 'queen', 'king', 'sofa', 'bunk')
          .required(),
        count: Joi.number().integer().min(1).required(),
      })
    )
    .optional(),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        caption: Joi.string().allow('').optional(),
      })
    )
    .optional(),
  cancellationPolicy: Joi.object({
    freeCancellationHours: Joi.number().min(0).optional(),
    tiers: Joi.array()
      .items(
        Joi.object({
          hoursBeforeCheckin: Joi.number().required(),
          refundPercent: Joi.number().min(0).max(100).required(),
        })
      )
      .optional(),
  }).optional(),
  isActive: Joi.boolean().optional(),
});

const updateRoomTypeSchema = createRoomTypeSchema.fork(
  ['hotel', 'name', 'maxOccupancy', 'baseRatePerNight'],
  (field) => field.optional()
);

module.exports = {
  createHotelSchema,
  updateHotelSchema,
  createRoomTypeSchema,
  updateRoomTypeSchema,
};
