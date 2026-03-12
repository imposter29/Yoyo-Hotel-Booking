/**
 * AppError — operational (known) application errors.
 * These are sent to the client with a specific status code and message.
 * Programming/unexpected errors use the default 500 path.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
