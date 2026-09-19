const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'new_leap_labs_default_dev_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('default_dev_secret'))) {
  throw new Error('FATAL SECURITY ERROR: Dedicated JWT_SECRET environment variable is required in production.');
}

/**
 * Sign a JWT for a user payload.
 * Payload should contain userId and role: { userId, role }
 */
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT string.
 * Returns decoded payload or throws error.
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  signToken,
  verifyToken
};
