const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const resumesDir = path.join(__dirname, '..', 'uploads', 'resumes');
const submissionsDir = path.join(__dirname, '..', 'uploads', 'submissions');

[resumesDir, submissionsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Explicit list of dangerous executable and script extensions to unconditionally reject
const DANGEROUS_EXTS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.mjs', '.html', '.htm',
  '.svg', '.php', '.phtml', '.jsp', '.asp', '.aspx', '.cgi', '.pl', '.py',
  '.jar', '.vbs', '.com', '.scr', '.dll', '.so', '.wasm'
];

// Helper to generate safe unique filename
function generateSafeFilename(file, prefix = '') {
  const ext = path.extname(file.originalname).toLowerCase();
  const safeBase = path.basename(file.originalname, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 100000);
  return `${prefix ? prefix + '-' : ''}${safeBase}-${timestamp}-${random}${ext}`;
}

// 1. Storage & filter for Resumes
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumesDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateSafeFilename(file, 'resume'));
  }
});

const allowedResumeExts = ['.pdf', '.doc', '.docx'];
const allowedResumeMimes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const resumeFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (DANGEROUS_EXTS.includes(ext)) {
    return cb(new Error(`Invalid file type: Executable or script files are strictly prohibited (${ext})`), false);
  }

  if (!allowedResumeExts.includes(ext)) {
    return cb(new Error(`Invalid file type for resume (${ext}). Allowed formats: ${allowedResumeExts.join(', ')}`), false);
  }

  if (file.mimetype && !allowedResumeMimes.includes(file.mimetype.toLowerCase()) && file.mimetype !== 'application/octet-stream') {
    return cb(new Error(`Invalid MIME type for resume (${file.mimetype}).`), false);
  }

  cb(null, true);
};

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 2. Storage & filter for Task Submissions
const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, submissionsDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateSafeFilename(file, 'submission'));
  }
});

const allowedSubExts = ['.pdf', '.zip', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
const allowedSubMimes = [
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png'
];

const submissionFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (DANGEROUS_EXTS.includes(ext)) {
    return cb(new Error(`Invalid file type: Executable or script files are strictly prohibited (${ext})`), false);
  }

  if (!allowedSubExts.includes(ext)) {
    return cb(new Error(`Invalid file type for submission (${ext}). Allowed formats: ${allowedSubExts.join(', ')}`), false);
  }

  if (file.mimetype && !allowedSubMimes.includes(file.mimetype.toLowerCase())) {
    return cb(new Error(`Invalid MIME type for submission (${file.mimetype}).`), false);
  }

  cb(null, true);
};

const uploadSubmission = multer({
  storage: submissionStorage,
  fileFilter: submissionFileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

module.exports = {
  uploadResume,
  uploadSubmission,
  resumesDir,
  submissionsDir
};
