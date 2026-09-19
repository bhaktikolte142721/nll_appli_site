const ApplicationModel = require('../models/application.model');
const TaskModel = require('../models/task.model');
const InterviewModel = require('../models/interview.model');
const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

class ApplicationsController {
  static async submitApplication(req, res, next) {
    try {
      const userId = req.user.userId;

      // Check if user already submitted an application
      const existing = await ApplicationModel.findByUserId(userId);
      if (existing) {
        return errorResponse(res, 'You have already submitted an active application', 409);
      }

      const {
        email,
        full_name,
        phone,
        date_of_birth,
        gender,
        branch,
        academic_year,
        domain,
        about
      } = req.body;

      if (!email || !full_name || !branch || !academic_year || !domain) {
        return errorResponse(res, 'Missing required application fields: email, full_name, branch, academic_year, and domain are required', 400);
      }

      // Handle resume file path if uploaded
      let resume_path = null;
      if (req.file) {
        resume_path = `/uploads/resumes/${req.file.filename}`;
      }

      // Submit inside transaction
      const application = await db.withTransaction(async (conn) => {
        return await ApplicationModel.create({
          user_id: userId,
          email: email.trim(),
          full_name: full_name.trim(),
          phone: phone ? phone.trim() : null,
          date_of_birth: date_of_birth || null,
          gender: gender || null,
          branch: branch.trim(),
          academic_year: academic_year.trim(),
          domain: domain.trim(),
          about: about ? about.trim() : null,
          resume_path,
          status: 'APPLIED'
        }, conn);
      });

      return successResponse(res, 'Application submitted successfully', { application }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMyApplication(req, res, next) {
    try {
      const userId = req.user.userId;
      const application = await ApplicationModel.findByUserId(userId);

      if (!application) {
        return successResponse(res, 'No application found for this candidate', { application: null });
      }

      // Fetch status history
      const history = await ApplicationModel.getStatusHistory(application.id);

      // Fetch candidate tasks
      const tasks = await TaskModel.findByApplicationId(application.id);

      // Fetch candidate interviews
      const interviews = await InterviewModel.findByApplicationId(application.id);

      return successResponse(res, 'Application details retrieved', {
        application,
        history,
        tasks,
        interviews
      });
    } catch (err) {
      next(err);
    }
  }

  static async listApplications(req, res, next) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        domain,
        branch,
        search,
        sortBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const result = await ApplicationModel.list({
        page,
        limit,
        status,
        domain,
        branch,
        search,
        sortBy,
        order
      });

      return successResponse(
        res,
        'Applications retrieved successfully',
        result.data,
        200,
        result.pagination
      );
    } catch (err) {
      next(err);
    }
  }

  static async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid application ID format. Must be a numeric integer.', 400);
      }

      const application = await ApplicationModel.findById(id);

      if (!application) {
        return errorResponse(res, 'Application not found', 404);
      }

      const history = await ApplicationModel.getStatusHistory(id);
      const tasks = await TaskModel.findByApplicationId(id);
      const interviews = await InterviewModel.findByApplicationId(id);

      return successResponse(res, 'Application details retrieved', {
        application,
        history,
        tasks,
        interviews
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid application ID format. Must be a numeric integer.', 400);
      }

      const { status, remarks } = req.body;

      const allowedStatuses = [
        'APPLIED',
        'SHORTLISTED',
        'TASK_ASSIGNED',
        'TASK_SUBMITTED',
        'TASK_UNDER_REVIEW',
        'INTERVIEW',
        'SECOND_INTERVIEW',
        'INTERVIEW_COMPLETED',
        'SELECTED',
        'REJECTED',
        'WAITLISTED'
      ];

      if (!status || !allowedStatuses.includes(status)) {
        return errorResponse(
          res,
          `Invalid status. Allowed values: [${allowedStatuses.join(', ')}]`,
          400
        );
      }

      const application = await ApplicationModel.findById(id);
      if (!application) {
        return errorResponse(res, 'Application not found', 404);
      }

      // Execute status update and history insertion inside transaction
      await db.withTransaction(async (conn) => {
        await ApplicationModel.updateStatus(
          id,
          status,
          req.user.userId,
          remarks || `Status updated to ${status} by admin`,
          conn
        );
      });

      const updated = await ApplicationModel.findById(id);
      const history = await ApplicationModel.getStatusHistory(id);

      return successResponse(res, `Application status updated to ${status}`, {
        application: updated,
        history
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationsController;
