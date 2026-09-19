const TaskModel = require('../models/task.model');
const TaskSubmissionModel = require('../models/taskSubmission.model');
const ApplicationModel = require('../models/application.model');
const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');
const path = require('path');
const fs = require('fs');
const { submissionsDir } = require('../middleware/upload');

class TasksController {
  static async assignTask(req, res, next) {
    try {
      const { applicationId, application_id, candidate_id, candidateId, title, description, deadline } = req.body;

      // 1. Resolve target application
      let targetAppId = applicationId || application_id;
      if (!targetAppId && (candidate_id || candidateId)) {
        const candidateApp = await ApplicationModel.findByUserId(candidate_id || candidateId);
        if (candidateApp) {
          targetAppId = candidateApp.id;
        }
      }

      if (!targetAppId) {
        return errorResponse(res, 'Candidate application selection is required', 400);
      }

      // 2. Validate Task Title
      if (!title || typeof title !== 'string' || !title.trim()) {
        return errorResponse(res, 'Task title is required and cannot be empty', 400);
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length > 200) {
        return errorResponse(res, 'Task title cannot exceed 200 characters', 400);
      }

      // 3. Validate Task Description
      if (!description || typeof description !== 'string' || !description.trim()) {
        return errorResponse(res, 'Task description/instructions are required and cannot be empty', 400);
      }
      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 2000) {
        return errorResponse(res, 'Task description cannot exceed 2000 characters', 400);
      }

      // 4. Validate Deadline (Mandatory, Valid, Future date/time)
      if (!deadline) {
        return errorResponse(res, 'Deadline is required', 400);
      }
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return errorResponse(res, 'Valid deadline date and time is required', 400);
      }
      // Allow 60 seconds tolerance for clock skew
      if (deadlineDate.getTime() < Date.now() - 60000) {
        return errorResponse(res, 'Deadline cannot be in the past', 400);
      }

      // 5. Validate Target Application Existence
      const application = await ApplicationModel.findById(targetAppId);
      if (!application) {
        return errorResponse(res, 'Target candidate application not found', 404);
      }

      // 6. Execute task assignment inside database transaction
      const newTask = await db.withTransaction(async (conn) => {
        // 1. Create task record with exact admin-provided title, description, and deadline
        const task = await TaskModel.create({
          application_id: targetAppId,
          assigned_by: req.user.userId,
          title: trimmedTitle,
          description: trimmedDescription,
          deadline: deadlineDate
        }, conn);

        // 2. Transition application status to TASK_ASSIGNED
        await ApplicationModel.updateStatus(
          targetAppId,
          'TASK_ASSIGNED',
          req.user.userId,
          `Task assigned: ${trimmedTitle}`,
          conn
        );

        return task;
      });

      return successResponse(res, 'Task assigned successfully', { task: newTask }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMyTasks(req, res, next) {
    try {
      const candidateUserId = req.user.userId;
      const tasks = await TaskModel.findByCandidateId(candidateUserId);

      // Attach submission history for each task
      const tasksWithSubmissions = await Promise.all(
        tasks.map(async (task) => {
          const submissions = await TaskSubmissionModel.findByTaskId(task.id);
          return {
            ...task,
            submissions,
            latestSubmission: submissions[0] || null
          };
        })
      );

      return successResponse(res, 'Candidate tasks retrieved', tasksWithSubmissions);
    } catch (err) {
      next(err);
    }
  }

  static async listTasks(req, res, next) {
    try {
      const { status, applicationId, page = 1, limit = 10 } = req.query;

      const result = await TaskModel.list({
        status,
        applicationId,
        page,
        limit
      });

      // Attach latest submission summary
      const itemsWithSubmissions = await Promise.all(
        result.data.map(async (task) => {
          const submissions = await TaskSubmissionModel.findByTaskId(task.id);
          const latest = submissions[0] || null;
          const safeSubmission = latest ? {
            id: latest.id,
            file_name: latest.file_name,
            file_type: latest.file_type,
            file_size: latest.file_size,
            submitted_at: latest.submitted_at,
            status: latest.status
          } : null;

          return {
            ...task,
            submission_status: latest ? 'SUBMITTED' : 'NOT_SUBMITTED',
            submission: safeSubmission,
            latestSubmission: safeSubmission
          };
        })
      );

      return successResponse(
        res,
        'Tasks retrieved successfully',
        itemsWithSubmissions,
        200,
        result.pagination
      );
    } catch (err) {
      next(err);
    }
  }

  static async getTaskById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid task ID format. Must be a numeric integer.', 400);
      }

      const task = await TaskModel.findById(id);

      if (!task) {
        return errorResponse(res, 'Task not found', 404);
      }

      // Security check: Candidate can only access their own task
      if (req.user.role === 'candidate' && task.candidate_user_id !== req.user.userId) {
        return errorResponse(res, 'Access forbidden: You cannot view tasks assigned to other candidates', 403);
      }

      const submissions = await TaskSubmissionModel.findByTaskId(id);

      return successResponse(res, 'Task details retrieved', {
        task,
        submissions,
        latestSubmission: submissions[0] || null
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitTask(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid task ID format. Must be a numeric integer.', 400);
      }

      const candidateUserId = req.user.userId;

      if (!req.file) {
        return errorResponse(res, 'Please upload a solution file', 400);
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        return errorResponse(res, 'Task not found', 404);
      }

      // Ensure candidate owns this task
      if (task.candidate_user_id !== candidateUserId) {
        return errorResponse(res, 'Forbidden: You cannot submit solutions for tasks assigned to other candidates', 403);
      }

      const filePath = `/uploads/submissions/${req.file.filename}`;

      // Submit solution inside transaction
      const submission = await db.withTransaction(async (conn) => {
        // 1. Create task_submissions record
        const sub = await TaskSubmissionModel.create({
          task_id: id,
          candidate_id: candidateUserId,
          file_name: req.file.originalname,
          file_path: filePath,
          file_type: req.file.mimetype,
          file_size: req.file.size
        }, conn);

        // 2. Update task status to SUBMITTED
        await TaskModel.updateStatus(id, 'SUBMITTED', conn);

        // 3. Update application status to TASK_SUBMITTED
        await ApplicationModel.updateStatus(
          task.application_id,
          'TASK_SUBMITTED',
          candidateUserId,
          `Solution submitted for task: ${task.title} (${req.file.originalname})`,
          conn
        );

        return sub;
      });

      return successResponse(res, 'Task solution submitted successfully', { submission }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async reviewTask(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid task ID format. Must be a numeric integer.', 400);
      }

      const { marks, comments, status = 'REVIEWED', submissionId, decision, reason } = req.body;

      const task = await TaskModel.findById(id);
      if (!task) {
        return errorResponse(res, 'Task not found', 404);
      }

      const submissions = await TaskSubmissionModel.findByTaskId(id);
      if (submissions.length === 0) {
        return errorResponse(res, 'No submissions found for this task to review', 400);
      }

      if (decision && !['SECOND_INTERVIEW', 'REJECTED', 'TASK_UNDER_REVIEW'].includes(decision)) {
        return errorResponse(res, "Invalid review decision. Allowed: 'SECOND_INTERVIEW', 'REJECTED', 'TASK_UNDER_REVIEW'", 400);
      }

      const targetSubmissionId = submissionId || submissions[0].id;

      // Update submission, task, and application inside transaction
      const result = await db.withTransaction(async (conn) => {
        const sub = await TaskSubmissionModel.review(
          targetSubmissionId,
          { marks: marks !== undefined ? marks : 100, comments: comments || reason || null, status },
          conn
        );
        await TaskModel.updateStatus(id, status === 'REVIEWED' ? 'REVIEWED' : 'COMPLETED', conn);

        let updatedApp = null;
        if (decision) {
          const remarkText = reason || comments || (decision === 'SECOND_INTERVIEW'
            ? `Selected for Second Interview Round after task review: ${task.title}`
            : `Rejected after task review: ${task.title}`);
          updatedApp = await ApplicationModel.updateStatus(
            task.application_id,
            decision,
            req.user.userId,
            remarkText,
            conn
          );
        }

        return { sub, updatedApp };
      });

      return successResponse(res, 'Task reviewed successfully', {
        submission: result.sub,
        application: result.updatedApp
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTaskSubmission(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid task ID format. Must be a numeric integer.', 400);
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        return errorResponse(res, 'Task not found', 404);
      }

      const submissions = await TaskSubmissionModel.findByTaskId(id);
      if (!submissions || submissions.length === 0) {
        return errorResponse(res, 'No submission found for this task', 404);
      }

      const sub = submissions[0];
      const app = await ApplicationModel.findById(task.application_id);

      return successResponse(res, 'Task submission retrieved', {
        submission: {
          id: sub.id,
          task_id: task.id,
          application_id: task.application_id,
          application_status: app ? app.status : null,
          candidate_id: sub.candidate_id,
          candidate_name: sub.candidate_name || (app ? app.full_name : task.candidate_name),
          candidate_email: sub.candidate_email || (app ? app.email : task.candidate_email),
          candidate_domain: app ? app.domain : null,
          candidate_branch: app ? app.branch : null,
          task_title: task.title,
          task_description: task.description,
          task_deadline: task.deadline,
          status: sub.status,
          submitted_at: sub.submitted_at,
          file_name: sub.file_name,
          file_type: sub.file_type,
          file_size: sub.file_size,
          file_url: `/api/tasks/${task.id}/submission/file`
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTaskSubmissionFile(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid task ID format. Must be a numeric integer.', 400);
      }

      const task = await TaskModel.findById(id);
      if (!task) {
        return errorResponse(res, 'Task not found', 404);
      }

      const submissions = await TaskSubmissionModel.findByTaskId(id);
      if (!submissions || submissions.length === 0) {
        return errorResponse(res, 'No submission found for this task', 404);
      }

      const sub = submissions[0];

      // Sanitize filename and prevent path traversal
      const rawStoredName = path.basename(sub.file_path);
      const filePath = path.join(submissionsDir, rawStoredName);

      // Verify the resolved path is within submissionsDir
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(path.normalize(submissionsDir))) {
        return errorResponse(res, 'Access forbidden: Invalid file path', 403);
      }

      if (!fs.existsSync(filePath)) {
        return errorResponse(res, 'Submitted file not found', 404);
      }

      // Safe filename for Content-Disposition
      const safeOriginalName = path.basename(sub.file_name).replace(/["\r\n\/\\]/g, '_');
      const isDownload = req.query.download === '1' || req.query.download === 'true';
      const dispositionType = isDownload ? 'attachment' : 'inline';

      res.setHeader('Content-Type', sub.file_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeOriginalName}"`);

      return res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = TasksController;
