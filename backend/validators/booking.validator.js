const Joi = require('joi');

const checkAvailabilitySchema = Joi.object({
  roomTypeId: Joi.string().hex().length(24).required().messages({
    'string.empty': 'Room type ID is required',
    'string.length': 'Invalid room type ID',
  }),
  checkIn: Joi.date().iso().greater('now').required().messages({
    'date.greater': 'Check-in date must be in the future',
    'date.base': 'Check-in must be a valid date',
  }),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
    'date.greater': 'Check-out must be after check-in',
    'date.base': 'Check-out must be a valid date',
  }),
  guestCount: Joi.number().integer().min(1).max(20).required(),
});

const createBookingSchema = Joi.object({
  roomTypeId: Joi.string().hex().length(24).required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required().messages({
    'date.greater': 'Check-out must be after check-in',
  }),
  guestCount: Joi.number().integer().min(1).max(20).required(),
  guestRequests: Joi.string().max(500).optional().allow(''),
});

const cancelBookingSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow(''),
});

const initiatePaymentSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).required(),
  paymentMethod: Joi.string()
    .valid('card', 'upi', 'netbanking', 'wallet', 'test')
    .default('test'),
});

module.exports = {
  checkAvailabilitySchema,
  createBookingSchema,
  cancelBookingSchema,
  initiatePaymentSchema,
};
