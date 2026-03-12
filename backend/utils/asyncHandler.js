/**
 * asyncHandler — wraps async route handlers to eliminate try/catch boilerplate.
 * Passes any rejected promise directly to Express's next(err).
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
