const Joi = require('joi');

const createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required',
  }),
  title: Joi.string().trim().min(3).max(100).optional().allow(''),
  comment: Joi.string().trim().min(10).max(2000).required().messages({
    'string.min': 'Review must be at least 10 characters',
    'any.required': 'Review comment is required',
  }),
  categories: Joi.object({
    cleanliness: Joi.number().min(1).max(5).optional(),
    service: Joi.number().min(1).max(5).optional(),
    location: Joi.number().min(1).max(5).optional(),
    value: Joi.number().min(1).max(5).optional(),
  }).optional(),
});

module.exports = { createReviewSchema };
