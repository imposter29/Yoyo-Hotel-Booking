const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.max': 'First name cannot exceed 50 characters',
  }),
  lastName: Joi.string().trim().min(1).max(50).optional().allow('').messages({
    'string.empty': 'Last name is required',
  }),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required().messages({
    'string.email': 'Please provide a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(8).max(72).required().messages({
    'string.min': 'Password must be at least 8 characters',
    'string.empty': 'Password is required',
  }),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-()\s]{7,20}$/)
    .optional()
    .allow('')
    .messages({ 'string.pattern.base': 'Please provide a valid phone number' }),
  role: Joi.string().valid('guest', 'hotel_admin').optional().default('guest'),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(72).required().messages({
    'string.min': 'New password must be at least 8 characters',
  }),
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).optional(),
  lastName: Joi.string().trim().min(1).max(50).optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-()\s]{7,20}$/).optional().allow(''),
});

module.exports = { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema };
