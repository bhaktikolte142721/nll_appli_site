const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/response');

/**
 * General API rate limiter.
 * Allows up to 500 requests per 15-minute window per IP.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'Too many requests from this IP. Please try again later.', 429);
  },
  skip: (req) => process.env.NODE_ENV === 'test' && req.headers['x-skip-rate-limit'] === 'true'
});

/**
 * Strict authentication rate limiter for login and registration.
 * Allows up to 25 attempts per 15-minute window per IP to thwart brute force attacks.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 100 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      429
    );
  },
  skip: (req) => req.headers['x-skip-rate-limit'] === 'true'
});

/**
 * Dedicated test limiter to specifically verify 429 response behavior
 */
const testRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, 'Rate limit exceeded for testing.', 429);
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  testRateLimiter
};
