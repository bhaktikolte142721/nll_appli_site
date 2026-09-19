/**
 * Standardized API Response Formatter
 * 
 * Success format:
 * {
 *   "success": true,
 *   "message": "Human readable message",
 *   "data": {},
 *   "pagination": { page, limit, total, totalPages } // optional
 * }
 * 
 * Error format:
 * {
 *   "success": false,
 *   "message": "Human readable error",
 *   "errors": []
 * }
 */

function successResponse(res, message = 'Operation successful', data = null, statusCode = 200, pagination = null) {
  const payload = {
    success: true,
    message
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
}

function errorResponse(res, message = 'An error occurred', statusCode = 500, errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors]
  });
}

module.exports = {
  successResponse,
  errorResponse
};
