const UserModel = require('../models/user.model');
const { successResponse, errorResponse } = require('../utils/response');

class UsersController {
  static async getCandidates(req, res, next) {
    try {
      const candidates = await UserModel.getAllCandidates();
      return successResponse(res, 'Candidates retrieved successfully', candidates);
    } catch (err) {
      next(err);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;

      // Candidate can only view their own user profile
      if (req.user.role === 'candidate' && parseInt(id, 10) !== req.user.userId) {
        return errorResponse(res, 'Access forbidden: You cannot view other user profiles', 403);
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, 'User retrieved', { user });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UsersController;
