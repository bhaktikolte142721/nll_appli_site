const express = require('express');
const router = express.Router();
const InterviewsController = require('../controllers/interviews.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Admin schedule interview
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.scheduleInterview
);

// Candidate view own interview details
router.get(
  '/me',
  authenticateToken,
  requireRole('candidate'),
  InterviewsController.getMyInterview
);

// Admin list interviews
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.listInterviews
);

// Admin get interview by ID
router.get(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.getInterviewById
);

// Admin update interview (status, notes, score, result)
router.patch(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.updateInterview
);

// Interview Questions CRUD (Admin only)
router.post(
  '/:id/questions',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.addQuestion
);

router.get(
  '/:id/questions',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.getQuestions
);

router.patch(
  '/questions/:questionId',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.updateQuestion
);

router.delete(
  '/questions/:questionId',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.deleteQuestion
);

// Interview Feedback (Admin only)
router.post(
  '/:id/feedback',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.addFeedback
);

router.get(
  '/:id/feedback',
  authenticateToken,
  requireRole('admin'),
  InterviewsController.getFeedback
);

module.exports = router;
