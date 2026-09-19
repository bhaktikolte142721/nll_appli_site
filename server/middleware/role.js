const { errorResponse } = require('../utils/response');

/**
 * Middleware factory to authorize access based on user roles.
 * Usage: requireRole('admin') or requireRole('admin', 'candidate')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return errorResponse(res, 'Unauthorized access: user identity missing', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`,
        403
      );
    }

    next();
  };
}

module.exports = {
  requireRole
};
