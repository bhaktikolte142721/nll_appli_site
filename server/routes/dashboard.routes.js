const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Admin metrics
router.get(
  '/stats',
  authenticateToken,
  requireRole('admin'),
  DashboardController.getAdminStats
);

// Candidate dashboard state
router.get(
  '/candidate',
  authenticateToken,
  requireRole('candidate'),
  DashboardController.getCandidateDashboard
);

module.exports = router;
