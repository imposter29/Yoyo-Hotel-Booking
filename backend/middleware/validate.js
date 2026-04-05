/**
 * Joi validation middleware factory.
 * Usage: router.post('/path', validate(schema), controller)
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,       // collect all errors
    stripUnknown: true,      // strip unknown fields
    convert: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message.replace(/"/g, "'")).join('; ');
    return res.status(400).json({ success: false, message: messages });
  }

  req[source] = value; // replace with sanitised/coerced value
  next();
};

module.exports = validate;
