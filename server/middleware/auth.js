const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/response');

/**
 * Middleware to authenticate requests via JWT.
 * Expects header: "Authorization: Bearer <token>"
 */
function authenticateToken(req, res, next) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    } else {
      return errorResponse(res, 'Invalid authorization header format. Expected "Bearer <token>"', 401);
    }
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return errorResponse(res, 'Authentication token required', 401);
  }

  try {
    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'Session token has expired. Please log in again.', 401);
    }
    return errorResponse(res, 'Invalid or corrupted authentication token', 401);
  }
}

module.exports = {
  authenticateToken
};
