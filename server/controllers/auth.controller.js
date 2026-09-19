const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const { signToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');

class AuthController {
  static async register(req, res, next) {
    try {
      const { full_name, email, password, phone } = req.body;

      if (!full_name || !email || !password) {
        return errorResponse(res, 'Full name, email, and password are required', 400);
      }

      const trimmedName = String(full_name).trim();
      const trimmedEmail = String(email).trim().toLowerCase();
      const strPassword = String(password);

      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return errorResponse(res, 'Full name must be between 2 and 100 characters', 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
        return errorResponse(res, 'Please provide a valid email address (max 100 characters)', 400);
      }

      if (strPassword.length < 6) {
        return errorResponse(res, 'Password must be at least 6 characters long', 400);
      }

      if (strPassword.length > 128) {
        return errorResponse(res, 'Password cannot exceed 128 characters', 400);
      }

      let cleanPhone = null;
      if (phone) {
        cleanPhone = String(phone).trim();
        if (cleanPhone.length > 20) {
          return errorResponse(res, 'Phone number cannot exceed 20 characters', 400);
        }
      }

      // Check for existing user
      const existing = await UserModel.findByEmail(trimmedEmail);
      if (existing) {
        return errorResponse(res, 'An account with this email already exists', 409);
      }

      // Security hardening: Public registration ONLY creates 'candidate' accounts
      const assignedRole = 'candidate';

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(strPassword, salt);

      const newUser = await UserModel.create({
        full_name: trimmedName,
        email: trimmedEmail,
        password_hash,
        phone: cleanPhone,
        role: assignedRole
      });

      const token = signToken({ userId: newUser.id, role: newUser.role });

      return successResponse(
        res,
        'Account registered successfully',
        {
          user: {
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            phone: newUser.phone,
            role: newUser.role
          },
          token
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return errorResponse(res, 'Email and password are required', 400);
      }

      const trimmedEmail = email.trim().toLowerCase();
      if (trimmedEmail.length > 100 || password.length > 128) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      const user = await UserModel.findByEmail(trimmedEmail);
      if (!user) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return errorResponse(res, 'Invalid email or password', 401);
      }

      const token = signToken({ userId: user.id, role: user.role });

      return successResponse(res, 'Login successful', {
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        token
      });
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const user = await UserModel.findById(req.user.userId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, 'User profile retrieved', { user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
