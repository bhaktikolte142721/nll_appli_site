const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/users.controller');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.get(
  '/candidates',
  authenticateToken,
  requireRole('admin'),
  UsersController.getCandidates
);

router.get(
  '/:id',
  authenticateToken,
  UsersController.getUserById
);

module.exports = router;
