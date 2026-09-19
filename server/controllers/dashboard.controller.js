const db = require('../config/db');
const UserModel = require('../models/user.model');
const ApplicationModel = require('../models/application.model');
const TaskModel = require('../models/task.model');
const TaskSubmissionModel = require('../models/taskSubmission.model');
const InterviewModel = require('../models/interview.model');
const { successResponse, errorResponse } = require('../utils/response');

class DashboardController {
  static async getAdminStats(req, res, next) {
    try {
      // 1. Total Applications
      const [totalAppRow] = await db.query(`SELECT COUNT(*) AS count FROM applications`);
      const totalApplications = totalAppRow.count;

      // 2. Shortlisted Candidates
      const [shortlistedRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status = 'SHORTLISTED'`);
      const shortlistedCandidates = shortlistedRow.count;

      // 3. Task Assigned Candidates
      const [taskAssignedRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status = 'TASK_ASSIGNED'`);
      const taskAssigned = taskAssignedRow.count;

      // 4. Task Submitted / Under Review Candidates
      const [taskSubmittedRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status IN ('TASK_SUBMITTED', 'TASK_UNDER_REVIEW')`);
      const taskSubmitted = taskSubmittedRow.count;

      // 5. Second Interview Candidates (including INTERVIEW and INTERVIEW_COMPLETED)
      const [secondInterviewRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status IN ('SECOND_INTERVIEW', 'INTERVIEW', 'INTERVIEW_COMPLETED')`);
      const secondInterview = secondInterviewRow.count;

      // 6. Pending Task Submissions (Tasks assigned but not yet submitted or reviewed)
      const [pendingTaskRow] = await db.query(`SELECT COUNT(*) AS count FROM tasks WHERE status = 'ASSIGNED'`);
      const pendingTaskSubmissions = pendingTaskRow.count;

      // 7. Awaiting Interview
      const [interviewRow] = await db.query(`
        SELECT COUNT(*) AS count 
        FROM applications 
        WHERE status IN ('TASK_SUBMITTED', 'TASK_UNDER_REVIEW', 'INTERVIEW', 'SECOND_INTERVIEW')
      `);
      const awaitingInterview = interviewRow.count;

      // 8. Selected Candidates
      const [selectedRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status = 'SELECTED'`);
      const selectedCandidates = selectedRow.count;

      // 9. Rejected Candidates
      const [rejectedRow] = await db.query(`SELECT COUNT(*) AS count FROM applications WHERE status = 'REJECTED'`);
      const rejectedCandidates = rejectedRow.count;

      // 10. Domain breakdown
      const domainStats = await db.query(`
        SELECT domain, COUNT(*) AS count 
        FROM applications 
        GROUP BY domain 
        ORDER BY count DESC
      `);

      // 11. Recent 5 applications
      const recentApplications = await db.query(`
        SELECT id, full_name, email, domain, branch, status, created_at 
        FROM applications 
        ORDER BY created_at DESC 
        LIMIT 5
      `);

      return successResponse(res, 'Admin dashboard statistics retrieved', {
        totalApplications,
        shortlistedCandidates,
        taskAssigned,
        taskSubmitted,
        secondInterview,
        pendingTaskSubmissions,
        awaitingInterview,
        selectedCandidates,
        rejectedCandidates,
        domainStats,
        recentApplications
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCandidateDashboard(req, res, next) {
    try {
      const userId = req.user.userId;

      // User details
      const user = await UserModel.findById(userId);
      if (!user) {
        return errorResponse(res, 'User account not found', 404);
      }

      // Application details
      const application = await ApplicationModel.findByUserId(userId);
      let history = [];
      let tasks = [];
      let interviews = [];

      if (application) {
        history = await ApplicationModel.getStatusHistory(application.id);
        const rawTasks = await TaskModel.findByApplicationId(application.id);
        tasks = await Promise.all(
          rawTasks.map(async (task) => {
            const submissions = await TaskSubmissionModel.findByTaskId(task.id);
            return {
              ...task,
              submissions,
              latestSubmission: submissions[0] || null
            };
          })
        );
        interviews = await InterviewModel.findByApplicationId(application.id);
      }

      return successResponse(res, 'Candidate dashboard retrieved', {
        candidate: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        hasApplication: !!application,
        application,
        status: application ? application.status : 'NOT_APPLIED',
        history,
        tasks,
        currentTask: tasks[0] || null,
        interviews,
        currentInterview: interviews[0] || null
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = DashboardController;
