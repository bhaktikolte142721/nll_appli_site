const InterviewModel = require('../models/interview.model');
const InterviewFeedbackModel = require('../models/interviewFeedback.model');
const ApplicationModel = require('../models/application.model');
const db = require('../config/db');
const { successResponse, errorResponse } = require('../utils/response');

class InterviewsController {
  static async scheduleInterview(req, res, next) {
    try {
      const { applicationId, application_id, scheduledAt, scheduled_at, interviewerId, interviewer_id, round = 'SECOND_INTERVIEW', notes, mode } = req.body;

      const targetAppId = applicationId || application_id;
      const targetScheduledAt = scheduledAt || scheduled_at;

      if (!targetAppId || !targetScheduledAt) {
        return errorResponse(res, 'applicationId and scheduledAt date/time are required', 400);
      }

      const application = await ApplicationModel.findById(targetAppId);
      if (!application) {
        return errorResponse(res, 'Application not found', 404);
      }

      // Combine mode and notes if mode is provided
      let combinedNotes = notes || null;
      if (mode && (!combinedNotes || !combinedNotes.includes('Mode:'))) {
        combinedNotes = `Mode: ${mode}${combinedNotes ? ' | ' + combinedNotes : ''}`;
      }

      // Format valid Date object for MySQL DATETIME column
      const parsedDate = new Date(targetScheduledAt);
      const scheduledDate = !isNaN(parsedDate.getTime()) ? parsedDate : targetScheduledAt;

      // Execute scheduling and status update inside transaction
      const interview = await db.withTransaction(async (conn) => {
        // 1. Create interview record
        const newInterview = await InterviewModel.create({
          application_id: targetAppId,
          scheduled_at: scheduledDate,
          interviewer_id: interviewerId || interviewer_id || req.user.userId,
          round,
          notes: combinedNotes
        }, conn);

        // 2. Transition application status if not already SECOND_INTERVIEW
        const targetStatus = application.status === 'SECOND_INTERVIEW' ? 'SECOND_INTERVIEW' : 'SECOND_INTERVIEW';
        await ApplicationModel.updateStatus(
          targetAppId,
          targetStatus,
          req.user.userId,
          `Second Interview scheduled for ${targetScheduledAt}${mode ? ` (Mode: ${mode})` : ''}`,
          conn
        );

        return newInterview;
      });

      return successResponse(res, 'Interview scheduled successfully', { interview }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getMyInterview(req, res, next) {
    try {
      const candidateUserId = req.user.userId;
      const interviews = await InterviewModel.findByCandidateId(candidateUserId);

      return successResponse(res, 'Candidate interview details retrieved', interviews);
    } catch (err) {
      next(err);
    }
  }

  static async listInterviews(req, res, next) {
    try {
      const { status, date, applicationId, page = 1, limit = 10 } = req.query;

      const result = await InterviewModel.list({
        status,
        date,
        applicationId,
        page,
        limit
      });

      return successResponse(
        res,
        'Interviews retrieved successfully',
        result.data,
        200,
        result.pagination
      );
    } catch (err) {
      next(err);
    }
  }

  static async getInterviewById(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid interview ID format. Must be a numeric integer.', 400);
      }

      const interview = await InterviewModel.findById(id);

      if (!interview) {
        return errorResponse(res, 'Interview not found', 404);
      }

      const questions = await InterviewFeedbackModel.getQuestions(id);
      const feedback = await InterviewFeedbackModel.getFeedback(id);

      return successResponse(res, 'Interview details retrieved', {
        interview,
        questions,
        feedback
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateInterview(req, res, next) {
    try {
      const { id } = req.params;

      if (!id || !/^\d+$/.test(String(id).trim())) {
        return errorResponse(res, 'Invalid interview ID format. Must be a numeric integer.', 400);
      }

      const { scheduledAt, status, score, notes, result, reason } = req.body;

      const interview = await InterviewModel.findById(id);
      if (!interview) {
        return errorResponse(res, 'Interview not found', 404);
      }

      const updated = await db.withTransaction(async (conn) => {
        const item = await InterviewModel.update(id, {
          scheduled_at: scheduledAt,
          status,
          score,
          notes,
          result
        }, conn);

        // If interview outcome determines selection or rejection, update application
        if (result === 'SELECTED' || result === 'REJECTED' || result === 'WAITLISTED') {
          const appStatus = result;
          const remarks = reason || notes || `Interview completed with result: ${result}${score ? ` (Score: ${score})` : ''}`;
          await ApplicationModel.updateStatus(
            interview.application_id,
            appStatus,
            req.user.userId,
            remarks,
            conn
          );
        } else if (status === 'COMPLETED') {
          await ApplicationModel.updateStatus(
            interview.application_id,
            'INTERVIEW_COMPLETED',
            req.user.userId,
            `Second Interview completed${score ? ` (Score: ${score})` : ''}`,
            conn
          );
        }

        return item;
      });

      return successResponse(res, 'Interview updated successfully', { interview: updated });
    } catch (err) {
      next(err);
    }
  }

  // --- QUESTIONS ---
  static async addQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { question, answer } = req.body;

      if (!question) {
        return errorResponse(res, 'Question text is required', 400);
      }

      const interview = await InterviewModel.findById(id);
      if (!interview) {
        return errorResponse(res, 'Interview not found', 404);
      }

      const newQuestion = await InterviewFeedbackModel.addQuestion(id, question.trim(), answer ? answer.trim() : null);
      return successResponse(res, 'Question added successfully', { question: newQuestion }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getQuestions(req, res, next) {
    try {
      const { id } = req.params;
      const questions = await InterviewFeedbackModel.getQuestions(id);
      return successResponse(res, 'Questions retrieved', questions);
    } catch (err) {
      next(err);
    }
  }

  static async updateQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const { question, answer } = req.body;

      const updated = await InterviewFeedbackModel.updateQuestion(questionId, question, answer);
      if (!updated) {
        return errorResponse(res, 'Question not found', 404);
      }

      return successResponse(res, 'Question updated', { question: updated });
    } catch (err) {
      next(err);
    }
  }

  static async deleteQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const deleted = await InterviewFeedbackModel.deleteQuestion(questionId);

      if (!deleted) {
        return errorResponse(res, 'Question not found', 404);
      }

      return successResponse(res, 'Question deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  // --- FEEDBACK ---
  static async addFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const { score, feedback } = req.body;

      if (score === undefined || !feedback) {
        return errorResponse(res, 'Score and feedback notes are required', 400);
      }

      const interview = await InterviewModel.findById(id);
      if (!interview) {
        return errorResponse(res, 'Interview not found', 404);
      }

      const fb = await InterviewFeedbackModel.addFeedback(
        id,
        req.user.userId,
        parseInt(score, 10) || 0,
        feedback.trim()
      );

      return successResponse(res, 'Feedback submitted successfully', { feedback: fb }, 201);
    } catch (err) {
      next(err);
    }
  }

  static async getFeedback(req, res, next) {
    try {
      const { id } = req.params;
      const feedback = await InterviewFeedbackModel.getFeedback(id);
      return successResponse(res, 'Feedback retrieved', feedback);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InterviewsController;
