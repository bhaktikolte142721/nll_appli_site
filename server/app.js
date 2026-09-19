const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth.routes');
const applicationsRoutes = require('./routes/applications.routes');
const tasksRoutes = require('./routes/tasks.routes');
const interviewsRoutes = require('./routes/interviews.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const usersRoutes = require('./routes/users.routes');

const { authenticateToken } = require('./middleware/auth');
const { errorHandler } = require('./middleware/errorHandler');
const { successResponse, errorResponse } = require('./utils/response');
const { resumesDir, submissionsDir } = require('./middleware/upload');
const db = require('./config/db');

const { apiLimiter, testRateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Security headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'sameorigin' },
  dnsPrefetchControl: { allow: false },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-skip-rate-limit']
}));

// Global API rate limiting
app.use('/api', apiLimiter);

// Request parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await db.testConnection();
  return successResponse(res, 'New Leap Labs API is running', {
    status: 'healthy',
    database: dbStatus.success ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Dedicated endpoint to verify rate-limiting behavior in tests
app.get('/api/test-rate-limit', testRateLimiter, (req, res) => {
  return successResponse(res, 'Rate limit check passed');
});

// Secure static file downloads for Resumes
app.get('/uploads/resumes/:filename', authenticateToken, async (req, res) => {
  const { filename } = req.params;

  // Path traversal defense
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return errorResponse(res, 'Access forbidden: Path traversal attempt detected', 400);
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(resumesDir, safeFilename);

  // Verify resolved path stays strictly inside resumes directory
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(path.normalize(resumesDir))) {
    return errorResponse(res, 'Access forbidden: Invalid file path', 403);
  }

  if (!fs.existsSync(filePath)) {
    return errorResponse(res, 'File not found', 404);
  }

  // If candidate, verify they own the resume
  if (req.user.role === 'candidate') {
    const [appRows] = await db.query(
      `SELECT user_id FROM applications WHERE resume_path LIKE ? LIMIT 1`,
      [`%${safeFilename}`]
    );
    if (!appRows || appRows.user_id !== req.user.userId) {
      return errorResponse(res, 'Access forbidden: You cannot view this resume', 403);
    }
  }

  res.sendFile(filePath);
});

// Secure static file downloads for Submissions
app.get('/uploads/submissions/:filename', authenticateToken, async (req, res) => {
  const { filename } = req.params;

  // Path traversal defense
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return errorResponse(res, 'Access forbidden: Path traversal attempt detected', 400);
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(submissionsDir, safeFilename);

  // Verify resolved path stays strictly inside submissions directory
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(path.normalize(submissionsDir))) {
    return errorResponse(res, 'Access forbidden: Invalid file path', 403);
  }

  if (!fs.existsSync(filePath)) {
    return errorResponse(res, 'File not found', 404);
  }

  // If candidate, verify they own the submission
  if (req.user.role === 'candidate') {
    const [subRows] = await db.query(
      `SELECT candidate_id FROM task_submissions WHERE file_path LIKE ? LIMIT 1`,
      [`%${safeFilename}`]
    );
    if (!subRows || subRows.candidate_id !== req.user.userId) {
      return errorResponse(res, 'Access forbidden: You cannot view this submission file', 403);
    }
  }

  res.sendFile(filePath);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', usersRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  return errorResponse(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
