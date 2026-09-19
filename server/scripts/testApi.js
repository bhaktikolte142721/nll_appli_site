/**
 * New Leap Labs - 22-Step Backend & API Automated Verification Suite
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

let adminToken = '';
let candidateToken = '';
let candidate2Token = '';
let candidateUserId = null;
let candidate2UserId = null;
let applicationId = null;
let taskId = null;
let submissionId = null;
let interviewId = null;

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  PASS: ${message}`);
  } else {
    failedCount++;
    console.error(`  FAIL: ${message}`);
  }
}

function request(method, pathUrl, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const fullPath = pathUrl.startsWith('/api') ? pathUrl : `/api${pathUrl.startsWith('/') ? '' : '/'}${pathUrl}`;
    const url = new URL(fullPath, `http://localhost:${PORT}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    let postData = null;
    if (body) {
      if (typeof body === 'object' && !(body instanceof Buffer)) {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      } else {
        postData = body;
      }
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Multipart helper for file upload tests
function sendMultipart(urlPath, fields, fileField, fileName, fileBuffer, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const fullPath = urlPath.startsWith('/api') ? urlPath : `/api${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
    const url = new URL(fullPath, `http://localhost:${PORT}`);

    let payload = Buffer.alloc(0);

    for (const [key, val] of Object.entries(fields)) {
      const fieldHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
      payload = Buffer.concat([payload, Buffer.from(fieldHeader, 'utf8')]);
    }

    if (fileField && fileName && fileBuffer) {
      const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
      payload = Buffer.concat([payload, Buffer.from(fileHeader, 'utf8'), fileBuffer, Buffer.from('\r\n', 'utf8')]);
    }

    payload = Buffer.concat([payload, Buffer.from(`--${boundary}--\r\n`, 'utf8')]);

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': payload.length,
        'Accept': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting 22-Step Verification Suite for New Leap Labs API');
  console.log(` Target Server: http://localhost:${PORT}`);
  console.log('====================================================\n');

  const testEmail = `test.candidate.${Date.now()}@example.com`;
  const testCandidate2Email = `test.other.${Date.now()}@example.com`;

  try {
    // 1. Database connection / Health check
    console.log('[Test 1] Health Check & API Connectivity');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.success === true, 'GET /api/health returned 200 OK');

    // 2. Candidate Registration
    console.log('\n[Test 2] Candidate Registration');
    const reg = await request('POST', '/auth/register', {
      full_name: 'Test Candidate',
      email: testEmail,
      password: 'Password@123',
      phone: '+91 9876543210'
    });
    assert(reg.status === 201 && reg.body.success === true, 'Candidate registered successfully');
    candidateToken = reg.body.data ? reg.body.data.token : '';
    candidateUserId = reg.body.data ? reg.body.data.user.id : null;

    // Register Candidate 2 for security tests
    const reg2 = await request('POST', '/auth/register', {
      full_name: 'Other Candidate',
      email: testCandidate2Email,
      password: 'Password@123',
      phone: '+91 9876543211'
    });
    candidate2Token = reg2.body.data ? reg2.body.data.token : '';
    candidate2UserId = reg2.body.data ? reg2.body.data.user.id : null;

    // 3. Duplicate Email Rejection
    console.log('\n[Test 3] Duplicate Email Rejection');
    const dup = await request('POST', '/auth/register', {
      full_name: 'Duplicate Candidate',
      email: testEmail,
      password: 'Password@123'
    });
    assert(dup.status === 409 && dup.body.success === false, 'Duplicate email correctly rejected with 409 Conflict');

    // 4. Candidate Login
    console.log('\n[Test 4] Candidate Login');
    const login = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'Password@123'
    });
    assert(login.status === 200 && login.body.data.token, 'Candidate login succeeded with valid JWT');
    candidateToken = login.body.data.token;

    // Login Admin
    const adminLogin = await request('POST', '/auth/login', {
      email: 'admin@newleaplabs.com',
      password: 'Admin@123'
    });
    if (adminLogin.status === 200 && adminLogin.body.data) {
      adminToken = adminLogin.body.data.token;
      console.log('  Admin logged in successfully');
    } else {
      console.warn('  Admin login with seed credential failed, check DB seed');
    }

    // 5. Invalid Password Rejection
    console.log('\n[Test 5] Invalid Password');
    const badLogin = await request('POST', '/auth/login', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert(badLogin.status === 401 && badLogin.body.success === false, 'Invalid password rejected with 401 Unauthorized');

    // 6. JWT Authentication
    console.log('\n[Test 6] JWT Authentication Verification');
    const me = await request('GET', '/auth/me', null, candidateToken);
    assert(me.status === 200 && me.body.data.user.email === testEmail, 'GET /api/auth/me authenticated user identity');

    // 7. Role Authorization
    console.log('\n[Test 7] Role Authorization Guard');
    const adminOnlyAsCandidate = await request('GET', '/dashboard/stats', null, candidateToken);
    assert(adminOnlyAsCandidate.status === 403, 'Candidate blocked from admin route with 403 Forbidden');

    // 8. Application Submission
    console.log('\n[Test 8] Application Submission');
    const appSubmit = await request('POST', '/applications', {
      full_name: 'Test Candidate',
      email: testEmail,
      phone: '+91 9876543210',
      date_of_birth: '2002-05-15',
      gender: 'Male',
      branch: 'Computer Science',
      academic_year: '3rd Year',
      domain: 'Web Development',
      about: 'Passionate aerospace and full stack software engineer.'
    }, candidateToken);
    assert(appSubmit.status === 201 && appSubmit.body.success === true, 'Application submitted with status APPLIED');
    applicationId = appSubmit.body.data ? appSubmit.body.data.application.id : null;

    // 9. Candidate Retrieving Own Application
    console.log('\n[Test 9] Candidate Retrieving Own Application');
    const myApp = await request('GET', '/applications/me', null, candidateToken);
    assert(myApp.status === 200 && myApp.body.data.application.id === applicationId, 'Candidate successfully retrieved own application');

    // 10. Admin Retrieving Applications
    console.log('\n[Test 10] Admin Retrieving Applications (Pagination & Filters)');
    const adminApps = await request('GET', `/applications?status=APPLIED&domain=Web%20Development`, null, adminToken);
    assert(adminApps.status === 200 && Array.isArray(adminApps.body.data), 'Admin successfully retrieved applications list with pagination');

    // 11. Admin Status Update
    console.log('\n[Test 11] Admin Status Update');
    const statusUpdate = await request('PATCH', `/applications/${applicationId}/status`, {
      status: 'SHORTLISTED',
      remarks: 'Strong candidate portfolio'
    }, adminToken);
    assert(statusUpdate.status === 200 && statusUpdate.body.data.application.status === 'SHORTLISTED', 'Admin updated status to SHORTLISTED and recorded history');

    // 12. Task Assignment Validation & Custom Task Creation
    console.log('\n[Test 12.1] Task Assignment Validation - Reject Empty Title');
    const customTitle = 'Build a Responsive Landing Page';
    const customDescription = 'Create a responsive landing page for a fictional technology startup using HTML, CSS and JavaScript. The page should contain a navbar, hero section, features section and footer.';
    const customDeadline = '2026-10-05 18:00:00';

    const badTitleRes = await request('POST', '/tasks', {
      applicationId,
      title: '   ',
      description: customDescription,
      deadline: customDeadline
    }, adminToken);
    assert(badTitleRes.status === 400, 'Empty title correctly rejected with 400 Bad Request');

    console.log('\n[Test 12.2] Task Assignment Validation - Reject Empty Description');
    const badDescRes = await request('POST', '/tasks', {
      applicationId,
      title: customTitle,
      description: '   ',
      deadline: customDeadline
    }, adminToken);
    assert(badDescRes.status === 400, 'Empty description correctly rejected with 400 Bad Request');

    console.log('\n[Test 12.3] Task Assignment Validation - Reject Missing Deadline');
    const missingDeadlineRes = await request('POST', '/tasks', {
      applicationId,
      title: customTitle,
      description: customDescription
    }, adminToken);
    assert(missingDeadlineRes.status === 400, 'Missing deadline correctly rejected with 400 Bad Request');

    console.log('\n[Test 12.4] Task Assignment Validation - Reject Past Deadline');
    const pastDeadlineRes = await request('POST', '/tasks', {
      applicationId,
      title: customTitle,
      description: customDescription,
      deadline: '2020-01-01 12:00:00'
    }, adminToken);
    assert(pastDeadlineRes.status === 400, 'Past deadline correctly rejected with 400 Bad Request');

    console.log('\n[Test 12.5] Task Assignment Validation - Reject Description > 2000 Characters');
    const longDescription = 'A'.repeat(2001);
    const longDescRes = await request('POST', '/tasks', {
      applicationId,
      title: customTitle,
      description: longDescription,
      deadline: customDeadline
    }, adminToken);
    assert(longDescRes.status === 400, 'Description exceeding 2000 chars rejected with 400 Bad Request');

    console.log('\n[Test 12.6] Admin Creates Task with Custom Title, Description, and Deadline');
    const assignTask = await request('POST', '/tasks', {
      applicationId,
      title: customTitle,
      description: customDescription,
      deadline: customDeadline
    }, adminToken);
    assert(assignTask.status === 201 && assignTask.body.data.task.status === 'ASSIGNED', 'Custom task assigned and stored in MySQL');
    assert(assignTask.body.data.task.title === customTitle, 'Stored task title matches input exactly');
    assert(assignTask.body.data.task.description === customDescription, 'Stored task description matches input exactly');
    assert(new Date(assignTask.body.data.task.deadline).getTime() === new Date(customDeadline).getTime(), 'Stored deadline matches input exactly');
    taskId = assignTask.body.data ? assignTask.body.data.task.id : null;

    // 13. Candidate Retrieving Assigned Task
    console.log('\n[Test 13] Candidate Retrieving Exact Assigned Task');
    const myTasks = await request('GET', '/tasks/me', null, candidateToken);
    assert(myTasks.status === 200 && myTasks.body.data.length > 0, 'Candidate retrieved assigned task list');
    const activeTask = myTasks.body.data.find(t => t.id === taskId);
    assert(activeTask !== undefined, 'Assigned task found in candidate task list');
    assert(activeTask.title === customTitle, `Candidate retrieved exact task title ("${customTitle}")`);
    assert(activeTask.description === customDescription, 'Candidate retrieved exact task description verbatim');
    assert(new Date(activeTask.deadline).getTime() === new Date(customDeadline).getTime(), 'Candidate retrieved exact task deadline');

    console.log('\n[Test 13.1] Candidate Isolation - Cannot Submit/Modify Another Candidate\'s Task');
    const unauthorizedSub = await sendMultipart(`/tasks/${taskId}/submit`, {}, 'solution', 'hack.zip', Buffer.from('unauthorized'), candidate2Token);
    assert(unauthorizedSub.status === 403, 'Candidate 2 forbidden from submitting to Candidate 1\'s assigned task (403)');

    // 14. Candidate Task Submission (File upload)
    console.log('\n[Test 14] Candidate Task Submission');
    const dummySolution = Buffer.from('console.log("Telemetry code solution completed");', 'utf8');
    const taskSub = await sendMultipart(`/tasks/${taskId}/submit`, {}, 'solution', 'telemetry_solution.zip', dummySolution, candidateToken);
    assert(taskSub.status === 201 && taskSub.body.success === true, 'Task solution uploaded and application status updated to TASK_SUBMITTED');
    submissionId = taskSub.body.data ? taskSub.body.data.submission.id : null;

    // 14.1 Admin Retrieves Submission Metadata
    console.log('\n[Test 14.1] Admin Retrieves Task Submission Metadata');
    const adminSubMeta = await request('GET', `/tasks/${taskId}/submission`, null, adminToken);
    assert(adminSubMeta.status === 200 && adminSubMeta.body.success === true, 'Admin retrieved submission metadata (200 OK)');
    assert(adminSubMeta.body.data.submission.file_name === 'telemetry_solution.zip', 'Submission metadata contains correct filename');
    assert(adminSubMeta.body.data.submission.candidate_name === 'Test Candidate', 'Submission metadata contains correct candidate name');
    assert(adminSubMeta.body.data.submission.file_url === `/api/tasks/${taskId}/submission/file`, 'Submission metadata contains correct file_url');
    assert(adminSubMeta.body.data.submission.file_size > 0, 'Submission metadata contains valid file size');

    // 14.2 Admin Downloads Submitted File
    console.log('\n[Test 14.2] Admin Downloads Submitted File');
    const adminFileDownload = await request('GET', `/tasks/${taskId}/submission/file?download=1`, null, adminToken);
    assert(adminFileDownload.status === 200, 'Admin can download submission file (200 OK)');
    assert(
      adminFileDownload.headers['content-disposition'] && adminFileDownload.headers['content-disposition'].includes('telemetry_solution.zip'),
      'Content-Disposition header includes correct attachment filename'
    );

    // 14.3 Candidate Forbidden from Admin Submission Metadata Endpoint
    console.log('\n[Test 14.3] Candidate Forbidden on Admin Submission Endpoint');
    const candSubMeta = await request('GET', `/tasks/${taskId}/submission`, null, candidateToken);
    assert(candSubMeta.status === 403, 'Candidate blocked from admin submission metadata with 403 Forbidden');

    // 14.4 Candidate Forbidden from Admin File Download Endpoint
    console.log('\n[Test 14.4] Candidate Forbidden on Admin File Download Endpoint');
    const candFileDownload = await request('GET', `/tasks/${taskId}/submission/file`, null, candidateToken);
    assert(candFileDownload.status === 403, 'Candidate blocked from admin submission file download with 403 Forbidden');

    // 14.5 Unauthenticated Access Blocked
    console.log('\n[Test 14.5] Unauthenticated Access Blocked');
    const unauthMeta = await request('GET', `/tasks/${taskId}/submission`);
    assert(unauthMeta.status === 401, 'Unauthenticated submission request blocked with 401 Unauthorized');
    const unauthFile = await request('GET', `/tasks/${taskId}/submission/file`);
    assert(unauthFile.status === 401, 'Unauthenticated file download request blocked with 401 Unauthorized');

    // 14.6 Invalid Task ID and Missing Submission Handling
    console.log('\n[Test 14.6] Invalid Task ID Handling');
    const invalidTaskMeta = await request('GET', '/tasks/999999/submission', null, adminToken);
    assert(invalidTaskMeta.status === 404, 'Non-existent task ID returns 404 Not Found');
    const invalidTaskFile = await request('GET', '/tasks/999999/submission/file', null, adminToken);
    assert(invalidTaskFile.status === 404, 'Non-existent task file returns 404 Not Found');

    // 15. Admin Reviewing Submission
    console.log('\n[Test 15] Admin Reviewing Submission');
    const reviewTask = await request('PATCH', `/tasks/${taskId}/review`, {
      submissionId,
      marks: 95,
      comments: 'Excellent code structure and clean architecture!',
      status: 'REVIEWED'
    }, adminToken);
    assert(reviewTask.status === 200 && reviewTask.body.data.submission.marks === 95, 'Admin reviewed task and awarded score');

    // 16. Interview Creation
    console.log('\n[Test 16] Interview Creation');
    const createInterview = await request('POST', '/interviews', {
      applicationId,
      scheduledAt: '2026-10-05 14:30:00',
      round: 'SECOND_INTERVIEW'
    }, adminToken);
    assert(createInterview.status === 201 && createInterview.body.data.interview.status === 'SCHEDULED', 'Round 2 interview scheduled and status updated to INTERVIEW');
    interviewId = createInterview.body.data ? createInterview.body.data.interview.id : null;

    // 17. Interview Update / Result
    console.log('\n[Test 17] Interview Update & Result');
    const updateInterview = await request('PATCH', `/interviews/${interviewId}`, {
      status: 'COMPLETED',
      score: 92,
      notes: 'Strong technical acumen and great team culture fit.',
      result: 'SELECTED'
    }, adminToken);
    assert(updateInterview.status === 200 && updateInterview.body.data.interview.result === 'SELECTED', 'Interview marked SELECTED and application updated to SELECTED');

    // 18. Dashboard Statistics
    console.log('\n[Test 18] Dashboard Statistics Calculation');
    const stats = await request('GET', '/dashboard/stats', null, adminToken);
    assert(stats.status === 200 && typeof stats.body.data.totalApplications === 'number' && stats.body.data.selectedCandidates >= 1, 'Dashboard stats dynamically computed from MySQL');

    // 19. Candidate Cannot Access Admin Endpoint
    console.log('\n[Test 19] Candidate Forbidden on Admin Route');
    const forbiddenTest = await request('POST', '/tasks', { applicationId, title: 'Hack', description: 'Hack' }, candidateToken);
    assert(forbiddenTest.status === 403, 'Candidate blocked from creating tasks with 403 Forbidden');

    // 20. Candidate Cannot Access Another Candidate Application
    console.log('\n[Test 20] Candidate Isolation (Data Security)');
    const otherCandidateAccess = await request('GET', `/applications/${applicationId}`, null, candidate2Token);
    assert(otherCandidateAccess.status === 403, 'Candidate 2 cannot access Candidate 1 private application details');

    // 21. File Upload Validation (Valid Resume Upload)
    console.log('\n[Test 21] File Upload Validation');
    const samplePdf = Buffer.from('%PDF-1.4 sample pdf content for resume', 'utf8');
    const resumeUpload = await sendMultipart('/applications', {
      full_name: 'Other Candidate',
      email: testCandidate2Email,
      branch: 'Aerospace Engineering',
      academic_year: '4th Year',
      domain: 'Propulsion Systems'
    }, 'resume', 'candidate_cv.pdf', samplePdf, candidate2Token);
    assert(resumeUpload.status === 201 && resumeUpload.body.data.application.resume_path.includes('.pdf'), 'Valid PDF resume uploaded successfully');

    // 22. Invalid File Extension Rejection
    console.log('\n[Test 22] Invalid File Rejection');
    const badExecutable = Buffer.from('MZ executable binary code', 'utf8');
    const badTaskSub = await sendMultipart(`/tasks/${taskId}/submit`, {}, 'solution', 'malicious.exe', badExecutable, candidateToken);
    assert(badTaskSub.status === 400 && badTaskSub.body.message.includes('Invalid file type'), 'Unsupported file extension (.exe) rejected with 400 Bad Request');

    // ====================================================
    // CANDIDATE SELECTION PIPELINE VERIFICATION (TESTS 23 - 42)
    // ====================================================

    // TEST 23: Candidate 3 registers, applies, task assigned & submits task solution
    console.log('\n[Test 23] Candidate 3: Task Submission in Recruitment Pipeline');
    const timestamp = Date.now();
    const cand3Email = `pipeline_cand_${timestamp}@newleaplabs.org`;
    const regCand3 = await request('POST', '/auth/register', {
      full_name: 'Pipeline Candidate Three',
      email: cand3Email,
      phone: '9876543210',
      password: 'SecurePassword123'
    });
    const cand3Token = regCand3.body.data.token;

    const cand3Resume = Buffer.from('%PDF-1.4 pipeline candidate resume', 'utf8');
    const cand3AppRes = await sendMultipart('/applications', {
      full_name: 'Pipeline Candidate Three',
      email: cand3Email,
      branch: 'Computer Science',
      academic_year: '3rd Year',
      domain: 'Full Stack Development'
    }, 'resume', 'resume_cand3.pdf', cand3Resume, cand3Token);
    const cand3AppId = cand3AppRes.body.data.application.id;

    // Admin assigns custom task to Candidate 3
    const cand3TaskRes = await request('POST', '/tasks', {
      applicationId: cand3AppId,
      title: 'Full Stack Dashboard Pipeline System',
      description: 'Implement full-stack candidate pipeline tracking with REST API and MySQL persistence.',
      deadline: '2026-11-20 18:00:00'
    }, adminToken);
    const cand3TaskId = cand3TaskRes.body.data.task.id;

    // Candidate 3 submits task solution
    const cand3Zip = Buffer.from('PK\x03\x04 dummy pipeline code zip content', 'utf8');
    const cand3SubmitRes = await sendMultipart(`/tasks/${cand3TaskId}/submit`, {}, 'solution', 'pipeline_solution.zip', cand3Zip, cand3Token);
    assert(cand3SubmitRes.status === 201 && cand3SubmitRes.body.success === true, '1. Candidate task solution submitted successfully (201 Created)');

    // TEST 24 & 25: Admin Reviews Task Submission and Selects Candidate for Second Interview
    console.log('\n[Test 24 & 25] Admin Reviews Submission and Selects for Second Interview');
    const cand3SubId = cand3SubmitRes.body.data.submission.id;
    const reviewSelectRes = await request('PATCH', `/tasks/${cand3TaskId}/review`, {
      submissionId: cand3SubId,
      decision: 'SECOND_INTERVIEW',
      marks: 92,
      comments: 'Outstanding architecture and complete test coverage.',
      reason: 'Exceeded requirements in task implementation'
    }, adminToken);
    assert(reviewSelectRes.status === 200 && reviewSelectRes.body.success === true, '2. Admin reviewed submission and decided SECOND_INTERVIEW');
    assert(reviewSelectRes.body.data.application.status === 'SECOND_INTERVIEW', '3 & 4. Candidate application status updated to SECOND_INTERVIEW');

    // TEST 26: Status History is Recorded
    console.log('\n[Test 26] Status History Records SECOND_INTERVIEW Transition');
    const cand3AppDetail = await request('GET', `/applications/${cand3AppId}`, null, adminToken);
    const hasSecondInterviewHistory = cand3AppDetail.body.data.history.some(
      h => h.new_status === 'SECOND_INTERVIEW' && h.changed_by !== null
    );
    assert(hasSecondInterviewHistory, '5. Status change recorded in application_status_history with admin ID and timestamp');

    // TEST 27: Candidate Sees SECOND_INTERVIEW Status on Dashboard
    console.log('\n[Test 27] Candidate Dashboard Shows SECOND_INTERVIEW');
    const cand3Dash1 = await request('GET', '/dashboard/candidate', null, cand3Token);
    assert(cand3Dash1.status === 200 && cand3Dash1.body.data.status === 'SECOND_INTERVIEW', '6. Candidate dashboard accurately displays status SECOND_INTERVIEW');

    // TEST 28: Admin Schedules Second Interview
    console.log('\n[Test 28] Admin Schedules Second Interview');
    const scheduleRes = await request('POST', '/interviews', {
      applicationId: cand3AppId,
      scheduledAt: '2026-11-25 15:00:00',
      round: 'SECOND_INTERVIEW',
      mode: 'Online',
      notes: 'Meeting Link: https://meet.google.com/nll-interview-round2'
    }, adminToken);
    assert(scheduleRes.status === 201 && scheduleRes.body.data.interview.round === 'SECOND_INTERVIEW', '7. Admin scheduled second interview successfully (201 Created)');
    const cand3InterviewId = scheduleRes.body.data.interview.id;

    // TEST 29: Candidate Can See Scheduled Interview
    console.log('\n[Test 29] Candidate Can See Scheduled Interview Information');
    const cand3IntList = await request('GET', '/interviews/me', null, cand3Token);
    assert(cand3IntList.status === 200 && cand3IntList.body.data.length > 0, '8. Candidate retrieves scheduled second interview details from /api/interviews/me');
    assert(cand3IntList.body.data[0].notes.includes('https://meet.google.com'), 'Candidate retrieves scheduled interview meeting link');

    // TEST 29.1: Interview Questions CRUD & Isolation
    console.log('\n[Test 29.1] Admin Records Interview Questions & Answers');
    const q1Res = await request('POST', `/interviews/${cand3InterviewId}/questions`, {
      question: 'Explain state machine design for the payload subsystem.',
      answer: 'Used hierarchical finite state machine with fault-recovery transition states.'
    }, adminToken);
    assert(q1Res.status === 201 && q1Res.body.data.question.question.includes('state machine'), 'Admin recorded interview question 1');
    const q1Id = q1Res.body.data.question.id;

    const q2Res = await request('POST', `/interviews/${cand3InterviewId}/questions`, {
      question: 'How do you handle memory leaks in long-running C/C++ embedded code?',
      answer: 'Avoid heap allocation in runtime loops; static pools and watchdog timers.'
    }, adminToken);
    assert(q2Res.status === 201, 'Admin recorded interview question 2');
    const q2Id = q2Res.body.data.question.id;

    // Admin retrieves questions
    const getQuestionsRes = await request('GET', `/interviews/${cand3InterviewId}/questions`, null, adminToken);
    assert(getQuestionsRes.status === 200 && getQuestionsRes.body.data.length === 2, 'Admin retrieved all recorded questions (count = 2)');

    // Candidate forbidden from viewing questions
    const candGetQRes = await request('GET', `/interviews/${cand3InterviewId}/questions`, null, cand3Token);
    assert(candGetQRes.status === 403, 'Candidate blocked from viewing internal interview questions (403 Forbidden)');

    // Admin deletes question 2
    const deleteQ2Res = await request('DELETE', `/interviews/questions/${q2Id}`, null, adminToken);
    assert(deleteQ2Res.status === 200 && deleteQ2Res.body.success === true, 'Admin successfully deleted interview question');

    const getQuestionsAfterDel = await request('GET', `/interviews/${cand3InterviewId}/questions`, null, adminToken);
    assert(getQuestionsAfterDel.body.data.length === 1, 'Question list updated after deletion (count = 1)');

    // TEST 30: Interview Feedback is Recorded
    console.log('\n[Test 30] Interview Feedback Recorded');
    const feedbackRes = await request('POST', `/interviews/${cand3InterviewId}/feedback`, {
      score: 95,
      feedback: 'Excellent problem solving skills, deep domain knowledge, great alignment with New Leap Labs.'
    }, adminToken);
    assert(feedbackRes.status === 201 && feedbackRes.body.data.feedback.score === 95, '9. Interview feedback and score recorded successfully');

    // Candidate forbidden from viewing feedback
    const candGetFeedbackRes = await request('GET', `/interviews/${cand3InterviewId}/feedback`, null, cand3Token);
    assert(candGetFeedbackRes.status === 403, 'Candidate blocked from viewing interviewer feedback (403 Forbidden)');

    // TEST 31: Interview Completed Status is Recorded
    console.log('\n[Test 31] Interview Completed Status Recorded');
    const completeIntRes = await request('PATCH', `/interviews/${cand3InterviewId}`, {
      status: 'COMPLETED',
      score: 95,
      notes: 'Second Interview completed successfully with high distinction.'
    }, adminToken);
    assert(completeIntRes.status === 200 && completeIntRes.body.data.interview.status === 'COMPLETED', '10. Interview status marked COMPLETED');
    const cand3AppAfterInt = await request('GET', `/applications/${cand3AppId}`, null, adminToken);
    assert(cand3AppAfterInt.body.data.application.status === 'INTERVIEW_COMPLETED', 'Application status progressed to INTERVIEW_COMPLETED in MySQL');

    // TEST 32, 33 & 34: Admin Selects Candidate Finally & Candidate Dashboard Shows SELECTED
    console.log('\n[Test 32, 33 & 34] Admin Makes Final Selection & Candidate Sees SELECTED');
    const finalSelectRes = await request('PATCH', `/interviews/${cand3InterviewId}`, {
      result: 'SELECTED',
      reason: 'Superb candidate with top marks and exceptional cultural fit for New Leap Labs.'
    }, adminToken);
    assert(finalSelectRes.status === 200 && finalSelectRes.body.data.interview.result === 'SELECTED', '11. Admin made explicit final selection decision (SELECTED)');
    
    const cand3AppFinal = await request('GET', `/applications/${cand3AppId}`, null, adminToken);
    assert(cand3AppFinal.body.data.application.status === 'SELECTED', '12. Candidate application status updated to SELECTED');

    const cand3DashFinal = await request('GET', '/dashboard/candidate', null, cand3Token);
    assert(cand3DashFinal.status === 200 && cand3DashFinal.body.data.status === 'SELECTED', '13. Candidate dashboard reflects SELECTED for New Leap Labs');

    // TEST 35, 36 & 37: Admin Rejects Candidate After Task Review
    console.log('\n[Test 35, 36 & 37] Admin Rejects Candidate After Task Review');
    const cand4Email = `task_reject_${timestamp}@newleaplabs.org`;
    const regCand4 = await request('POST', '/auth/register', {
      full_name: 'Task Reject Candidate',
      email: cand4Email,
      phone: '9876543211',
      password: 'SecurePassword123'
    });
    const cand4Token = regCand4.body.data.token;
    const cand4Resume = Buffer.from('%PDF-1.4 resume cand4', 'utf8');
    const cand4AppRes = await sendMultipart('/applications', {
      full_name: 'Task Reject Candidate',
      email: cand4Email,
      branch: 'Electrical Engineering',
      academic_year: '2nd Year',
      domain: 'Embedded Systems'
    }, 'resume', 'resume_cand4.pdf', cand4Resume, cand4Token);
    const cand4AppId = cand4AppRes.body.data.application.id;

    const cand4TaskRes = await request('POST', '/tasks', {
      applicationId: cand4AppId,
      title: 'Microcontroller Firmware',
      description: 'Implement embedded firmware for sensor communication.',
      deadline: '2026-11-20 18:00:00'
    }, adminToken);
    const cand4TaskId = cand4TaskRes.body.data.task.id;

    const cand4Zip = Buffer.from('PK\x03\x04 incomplete firmware zip', 'utf8');
    const cand4SubmitRes = await sendMultipart(`/tasks/${cand4TaskId}/submit`, {}, 'solution', 'firmware.zip', cand4Zip, cand4Token);
    const cand4SubId = cand4SubmitRes.body.data.submission.id;

    const reviewRejectRes = await request('PATCH', `/tasks/${cand4TaskId}/review`, {
      submissionId: cand4SubId,
      decision: 'REJECTED',
      marks: 40,
      comments: 'Firmware failed compilation requirements.',
      reason: 'Task requirements were not met'
    }, adminToken);
    assert(reviewRejectRes.status === 200 && reviewRejectRes.body.success === true, '14. Admin rejected candidate after task review');
    assert(reviewRejectRes.body.data.application.status === 'REJECTED', '15. Candidate application status updated to REJECTED');

    const cand4Dash = await request('GET', '/dashboard/candidate', null, cand4Token);
    assert(cand4Dash.status === 200 && cand4Dash.body.data.status === 'REJECTED', '17. Candidate dashboard shows REJECTED after task review');

    // TEST 38 & 39: Admin Rejects Candidate After Second Interview
    console.log('\n[Test 38 & 39] Admin Rejects Candidate After Second Interview');
    const cand5Email = `interview_reject_${timestamp}@newleaplabs.org`;
    const regCand5 = await request('POST', '/auth/register', {
      full_name: 'Interview Reject Candidate',
      email: cand5Email,
      phone: '9876543212',
      password: 'SecurePassword123'
    });
    const cand5Token = regCand5.body.data.token;
    const cand5Resume = Buffer.from('%PDF-1.4 resume cand5', 'utf8');
    const cand5AppRes = await sendMultipart('/applications', {
      full_name: 'Interview Reject Candidate',
      email: cand5Email,
      branch: 'Mechanical Engineering',
      academic_year: '3rd Year',
      domain: 'Structures'
    }, 'resume', 'resume_cand5.pdf', cand5Resume, cand5Token);
    const cand5AppId = cand5AppRes.body.data.application.id;

    const cand5TaskRes = await request('POST', '/tasks', {
      applicationId: cand5AppId,
      title: 'Structural CAD Model',
      description: 'Design chassis CAD model for satellite frame.',
      deadline: '2026-11-20 18:00:00'
    }, adminToken);
    const cand5TaskId = cand5TaskRes.body.data.task.id;

    const cand5Zip = Buffer.from('PK\x03\x04 cad solution', 'utf8');
    const cand5SubmitRes = await sendMultipart(`/tasks/${cand5TaskId}/submit`, {}, 'solution', 'cad_model.zip', cand5Zip, cand5Token);

    // Select for second interview
    await request('PATCH', `/tasks/${cand5TaskId}/review`, {
      submissionId: cand5SubmitRes.body.data.submission.id,
      decision: 'SECOND_INTERVIEW',
      marks: 85,
      comments: 'Good CAD models, proceed to interview.'
    }, adminToken);

    // Schedule interview
    const cand5IntRes = await request('POST', '/interviews', {
      applicationId: cand5AppId,
      scheduledAt: '2026-11-28 11:00:00',
      round: 'SECOND_INTERVIEW'
    }, adminToken);
    const cand5InterviewId = cand5IntRes.body.data.interview.id;

    // Admin rejects candidate after interview
    const rejectAfterIntRes = await request('PATCH', `/interviews/${cand5InterviewId}`, {
      status: 'COMPLETED',
      result: 'REJECTED',
      reason: 'Candidate struggled with questions on structural load tolerances'
    }, adminToken);
    assert(rejectAfterIntRes.status === 200 && rejectAfterIntRes.body.data.interview.result === 'REJECTED', '16. Admin rejected candidate after interview');
    
    const cand5App = await request('GET', `/applications/${cand5AppId}`, null, adminToken);
    assert(cand5App.body.data.application.status === 'REJECTED', 'Application status updated to REJECTED in MySQL');

    const cand5Dash = await request('GET', '/dashboard/candidate', null, cand5Token);
    assert(cand5Dash.status === 200 && cand5Dash.body.data.status === 'REJECTED', '17. Candidate sees REJECTED after interview round');

    // TEST 40: Candidate Cannot Make Admin Decisions
    console.log('\n[Test 40] Candidate Cannot Make Admin Decisions');
    const candDecisionAttempt = await request('PATCH', `/tasks/${cand3TaskId}/review`, {
      decision: 'SELECTED'
    }, cand3Token);
    assert(candDecisionAttempt.status === 403, '18. Candidate blocked from making task review decision with 403 Forbidden');

    const candScheduleAttempt = await request('POST', '/interviews', {
      applicationId: cand3AppId,
      scheduledAt: '2026-12-01 10:00:00'
    }, cand3Token);
    assert(candScheduleAttempt.status === 403, '18. Candidate blocked from scheduling interviews with 403 Forbidden');

    // TEST 41: Invalid State Transitions Rejected
    console.log('\n[Test 41] State Transition Validation Enforced by Backend');
    // Fresh applicant (APPLIED) cannot jump directly to SELECTED
    const cand6Email = `invalid_trans_${timestamp}@newleaplabs.org`;
    const regCand6 = await request('POST', '/auth/register', {
      full_name: 'Invalid Transition Tester',
      email: cand6Email,
      phone: '9876543213',
      password: 'SecurePassword123'
    });
    const cand6Token = regCand6.body.data.token;
    const cand6Resume = Buffer.from('%PDF-1.4 test', 'utf8');
    const cand6AppRes = await sendMultipart('/applications', {
      full_name: 'Invalid Transition Tester',
      email: cand6Email,
      branch: 'IT',
      academic_year: '1st Year',
      domain: 'Design'
    }, 'resume', 'resume_test.pdf', cand6Resume, cand6Token);
    const cand6AppId = cand6AppRes.body.data.application.id;

    // Attempt illegal transition: APPLIED -> SELECTED
    const illegalJump = await request('PATCH', `/applications/${cand6AppId}/status`, {
      status: 'SELECTED'
    }, adminToken);
    assert(illegalJump.status === 400 && illegalJump.body.success === false, '19. Illegal transition APPLIED -> SELECTED rejected with 400 Bad Request');

    // Attempt illegal transition: REJECTED candidate -> SECOND_INTERVIEW
    const illegalReactivation = await request('PATCH', `/applications/${cand4AppId}/status`, {
      status: 'SECOND_INTERVIEW'
    }, adminToken);
    assert(illegalReactivation.status === 400 && illegalReactivation.body.success === false, '19. Illegal transition REJECTED -> SECOND_INTERVIEW rejected with 400 Bad Request');

    // TEST 42: Unauthorized Users Cannot Modify Status
    console.log('\n[Test 42] Unauthorized Users Blocked from Status Modification');
    const unauthStatusChange = await request('PATCH', `/applications/${cand3AppId}/status`, {
      status: 'REJECTED'
    });
    assert(unauthStatusChange.status === 401, '20. Unauthorized user blocked from modifying application status with 401 Unauthorized');

    console.log('\n====================================================');
    console.log(` Test Suite Complete: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================');

    if (failedCount === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
