const express = require('express');
const router = express.Router();
const TasksController = require('../controllers/tasks.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadSubmission } = require('../middleware/upload');

// Admin assign task
router.post(
  '/',
  authenticateToken,
  requireRole('admin'),
  TasksController.assignTask
);

// Candidate get their assigned tasks
router.get(
  '/me',
  authenticateToken,
  requireRole('candidate'),
  TasksController.getMyTasks
);

// Admin list tasks
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  TasksController.listTasks
);

// Get task by ID (Candidate own task OR Admin any task)
router.get(
  '/:id',
  authenticateToken,
  TasksController.getTaskById
);

// Candidate submit task solution
router.post(
  '/:id/submit',
  authenticateToken,
  requireRole('candidate'),
  uploadSubmission.single('solution'),
  TasksController.submitTask
);

// Admin review task
router.patch(
  '/:id/review',
  authenticateToken,
  requireRole('admin'),
  TasksController.reviewTask
);

// Admin get task submission metadata
router.get(
  '/:id/submission',
  authenticateToken,
  requireRole('admin'),
  TasksController.getTaskSubmission
);

// Admin view/download task submission file
router.get(
  '/:id/submission/file',
  authenticateToken,
  requireRole('admin'),
  TasksController.getTaskSubmissionFile
);

module.exports = router;
