const express = require('express');
const router = express.Router();
const ApplicationsController = require('../controllers/applications.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadResume } = require('../middleware/upload');

// Candidate routes
router.post(
  '/',
  authenticateToken,
  requireRole('candidate'),
  uploadResume.single('resume'),
  ApplicationsController.submitApplication
);

router.get(
  '/me',
  authenticateToken,
  requireRole('candidate'),
  ApplicationsController.getMyApplication
);

// Admin routes
router.get(
  '/',
  authenticateToken,
  requireRole('admin'),
  ApplicationsController.listApplications
);

router.get(
  '/:id',
  authenticateToken,
  requireRole('admin'),
  ApplicationsController.getApplicationById
);

router.patch(
  '/:id/status',
  authenticateToken,
  requireRole('admin'),
  ApplicationsController.updateApplicationStatus
);

module.exports = router;
