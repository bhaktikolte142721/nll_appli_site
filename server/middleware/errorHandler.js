const { errorResponse } = require('../utils/response');

/**
 * Centralized Express error handler middleware.
 */
function errorHandler(err, req, res, next) {
  // Check if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Multer Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File too large. Please check maximum size limit.', 400);
    }
    return errorResponse(res, `Upload error: ${err.message}`, 400);
  }

  // Custom File filter validation errors
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('strictly prohibited') || err.message.includes('Invalid MIME type'))) {
    return errorResponse(res, err.message, 400);
  }

  // JSON syntax errors in request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 'Malformed JSON in request body', 400);
  }

  // MySQL Duplicate Entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return errorResponse(res, 'A record with this unique field already exists.', 409);
  }

  // MySQL Foreign Key Constraint failure
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return errorResponse(res, 'Referenced parent record does not exist.', 400);
  }

  // MySQL Connection & Host unreachable errors
  if (['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ER_ACCESS_DENIED_ERROR', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)) {
    return errorResponse(res, `Database unavailable (${err.code}). Please verify cloud database status and Vercel environment variables.`, 503);
  }

  // Log unexpected errors for debugging in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled Server Error:', err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message || 'An unexpected error occurred';

  return errorResponse(res, message, statusCode);
}

module.exports = {
  errorHandler
};
