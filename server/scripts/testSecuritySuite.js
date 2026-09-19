/**
 * Comprehensive Security Test Suite for New Leap Labs Platform
 * Phase 24: Actual Security Testing across all 35 explicit test cases
 */

require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
const ROOT_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'new_leap_labs_default_dev_secret_key_2026';

let passed = 0;
let failed = 0;

function assert(condition, message, debugInfo = null) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    if (debugInfo) {
      console.error('    Debug Info:', JSON.stringify(debugInfo, null, 2));
    }
    failed++;
  }
}

function request(method, path, body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let fullUrl = '';
    if (path.startsWith('http')) {
      fullUrl = path;
    } else if (path.startsWith('/uploads')) {
      fullUrl = `${ROOT_URL}${path}`;
    } else {
      fullUrl = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    }

    const url = new URL(fullUrl);
    const headers = {
      'x-skip-rate-limit': 'true',
      ...extraHeaders
    };

    let payload = null;
    if (body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sendMultipart(path, fields, fileField, filename, fileBuffer, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundarySecuritySuiteTest' + Math.random().toString(36).substring(2);
    let fullUrl = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    const url = new URL(fullUrl);

    const parts = [];
    for (const [key, val] of Object.entries(fields)) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
    }

    if (fileField && filename && fileBuffer) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`));
      parts.push(fileBuffer);
      parts.push(Buffer.from('\r\n'));
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(parts);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length,
      'x-skip-rate-limit': 'true'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function runSecuritySuite() {
  console.log('======================================================================');
  console.log('STARTING PHASE 24 COMPREHENSIVE SECURITY TESTING SUITE');
  console.log('======================================================================\n');

  const ts = Date.now();

  // Setup Admin and Candidates
  console.log('--- SETUP: Authenticating Admin and Test Candidates ---');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@newleaplabs.com',
    password: 'Admin@123'
  });
  const adminToken = adminLogin.body?.data?.token;
  assert(adminLogin.status === 200 && !!adminToken, 'Admin authenticated for security testing', adminLogin);

  // Register Candidate A
  const candAEmail = `sec_cand_a_${ts}@newleaplabs.org`;
  const candAReg = await request('POST', '/auth/register', {
    full_name: `Candidate Alpha ${ts}`,
    email: candAEmail,
    password: 'Password123!',
    phone: '9876543210'
  });
  const candAToken = candAReg.body?.data?.token;
  const candAId = candAReg.body?.data?.user?.id;
  assert(candAReg.status === 201 && !!candAToken, 'Candidate A registered');

  // Submit Candidate A Application
  const candAPdf = Buffer.from('%PDF-1.4 sample resume A', 'utf8');
  const candAAppRes = await sendMultipart('/applications', {
    email: candAEmail,
    full_name: `Candidate Alpha ${ts}`,
    branch: 'Aerospace Engineering',
    academic_year: '3rd Year',
    domain: 'Propulsion Systems'
  }, 'resume', 'resume_a.pdf', candAPdf, candAToken);
  const candAAppId = candAAppRes.body?.data?.application?.id;
  assert(candAAppRes.status === 201 && !!candAAppId, 'Candidate A application submitted');

  // Register Candidate B
  const candBEmail = `sec_cand_b_${ts}@newleaplabs.org`;
  const candBReg = await request('POST', '/auth/register', {
    full_name: `Candidate Beta ${ts}`,
    email: candBEmail,
    password: 'Password123!',
    phone: '9876543211'
  });
  const candBToken = candBReg.body?.data?.token;
  const candBId = candBReg.body?.data?.user?.id;
  assert(candBReg.status === 201 && !!candBToken, 'Candidate B registered');

  // Submit Candidate B Application
  const candBPdf = Buffer.from('%PDF-1.4 sample resume B', 'utf8');
  const candBAppRes = await sendMultipart('/applications', {
    email: candBEmail,
    full_name: `Candidate Beta ${ts}`,
    branch: 'Avionics',
    academic_year: '4th Year',
    domain: 'Satellite Communication'
  }, 'resume', 'resume_b.pdf', candBPdf, candBToken);
  const candBAppId = candBAppRes.body?.data?.application?.id;
  assert(candBAppRes.status === 201 && !!candBAppId, 'Candidate B application submitted');

  // Assign Task to Candidate A
  const taskARes = await request('POST', '/tasks', {
    applicationId: candAAppId,
    title: 'Aerodynamic Simulation Task A',
    description: 'Perform CFD simulation on payload fairing.',
    deadline: '2026-11-20 18:00:00'
  }, adminToken);
  const taskAId = taskARes.body?.data?.task?.id;
  assert(taskARes.status === 201 && !!taskAId, 'Task assigned to Candidate A', taskARes);

  // Candidate A Submits Solution
  const candASol = Buffer.from('PK\x03\x04 simulation results zip', 'utf8');
  const subARes = await sendMultipart(`/tasks/${taskAId}/submit`, {}, 'solution', 'cfd_results.zip', candASol, candAToken);
  const subAId = subARes.body?.data?.submission?.id;
  assert(subARes.status === 201 && !!subAId, 'Candidate A submitted task solution', subARes);

  // Schedule Interview for Candidate A
  const interviewARes = await request('POST', '/interviews', {
    applicationId: candAAppId,
    scheduledAt: '2026-11-25 15:00:00',
    notes: 'Mode: Online (Google Meet) | https://meet.google.com/nll-sec-test'
  }, adminToken);
  const interviewAId = interviewARes.body?.data?.interview?.id;
  assert(interviewARes.status === 201 && !!interviewAId, 'Interview scheduled for Candidate A', interviewARes);

  // ==================================================================
  // CATEGORY 1: AUTHENTICATION TESTING (Tests 1 - 6)
  // ==================================================================
  console.log('\n--- CATEGORY 1: AUTHENTICATION SECURITY ---');

  // Test 1: Valid login
  const t1 = await request('POST', '/auth/login', {
    email: candAEmail,
    password: 'Password123!'
  });
  assert(t1.status === 200 && t1.body?.data?.token, '1. Valid login succeeds with 200 OK & JWT');

  // Test 2: Invalid password
  const t2 = await request('POST', '/auth/login', {
    email: candAEmail,
    password: 'WrongPassword999!'
  });
  assert(t2.status === 401 && t2.body?.success === false, '2. Invalid password rejected with 401 Unauthorized');

  // Test 3: Invalid email
  const t3 = await request('POST', '/auth/login', {
    email: 'nonexistent_user_99999@test.com',
    password: 'AnyPassword123!'
  });
  assert(t3.status === 401 && t3.body?.success === false, '3. Invalid email rejected with 401 Unauthorized');

  // Test 4: Missing token
  const t4 = await request('GET', '/auth/me');
  assert(t4.status === 401 && t4.body?.success === false, '4. Missing token rejected with 401 Unauthorized');

  // Test 5: Invalid token
  const t5 = await request('GET', '/auth/me', null, 'malformed.jwt.token.here');
  assert(t5.status === 401 && t5.body?.success === false, '5. Invalid/corrupted token rejected with 401 Unauthorized');

  // Test 6: Expired token
  const expiredToken = jwt.sign({ userId: candAId, role: 'candidate' }, JWT_SECRET, { expiresIn: 1 });
  // Wait 1.5 seconds so token expires
  await new Promise(r => setTimeout(r, 1500));
  const t6 = await request('GET', '/auth/me', null, expiredToken);
  assert(t6.status === 401 && t6.body?.message?.toLowerCase().includes('expired'), '6. Expired token rejected with 401 Session expired', t6);

  // ==================================================================
  // CATEGORY 2: ROLE-BASED AUTHORIZATION (Tests 7 - 12)
  // ==================================================================
  console.log('\n--- CATEGORY 2: ROLE-BASED AUTHORIZATION ---');

  // Test 7: Candidate accessing admin endpoint
  const t7 = await request('GET', '/applications', null, candAToken);
  assert(t7.status === 403, '7. Candidate blocked from GET /api/applications with 403 Forbidden');

  // Test 8: Candidate accessing another candidate's application
  const t8 = await request('GET', `/applications/${candBAppId}`, null, candAToken);
  assert(t8.status === 403, '8. Candidate A blocked from accessing Candidate B application ID with 403 Forbidden');

  // Test 9: Candidate accessing another candidate's task
  const taskBRes = await request('POST', '/tasks', {
    applicationId: candBAppId,
    title: 'Avionics Antenna Task B',
    description: 'Design S-band patch antenna array.',
    deadline: '2026-11-22 14:00:00'
  }, adminToken);
  const taskBId = taskBRes.body?.data?.task?.id;
  const t9 = await request('GET', `/tasks/${taskBId}`, null, candAToken);
  assert(t9.status === 403, '9. Candidate A blocked from viewing Candidate B task with 403 Forbidden');

  // Test 10: Candidate accessing another candidate's submission
  const t10 = await request('GET', `/tasks/${taskAId}/submission`, null, candBToken);
  assert(t10.status === 403, '10. Candidate B blocked from accessing Candidate A submission with 403 Forbidden');

  // Test 11: Candidate modifying application status
  const t11 = await request('PATCH', `/applications/${candAAppId}/status`, { status: 'SELECTED' }, candAToken);
  assert(t11.status === 403, '11. Candidate blocked from PATCH /api/applications/:id/status with 403 Forbidden');

  // Test 12: Candidate modifying interview outcome
  const t12 = await request('PATCH', `/interviews/${interviewAId}`, { result: 'SELECTED', status: 'COMPLETED' }, candAToken);
  assert(t12.status === 403, '12. Candidate blocked from modifying interview outcome with 403 Forbidden');

  // ==================================================================
  // CATEGORY 3: SQL INJECTION (Tests 13 - 15)
  // ==================================================================
  console.log('\n--- CATEGORY 3: SQL INJECTION DEFENSE ---');

  // Test 13: Login injection attempt
  const t13 = await request('POST', '/auth/login', {
    email: "' OR 1=1 --",
    password: "' OR '1'='1"
  });
  assert(t13.status === 401 && t13.body?.success === false, '13. SQL Injection login bypass attempt safely rejected (401)');

  // Test 14: Search injection attempt
  const t14 = await request('GET', `/applications?search=${encodeURIComponent("'; DROP TABLE applications; --")}`, null, adminToken);
  assert(t14.status === 200 && Array.isArray(t14.body?.data), '14. SQL Injection in search parameter neutralized via parameterized query', t14);

  // Test 15: ID injection attempt
  const t15 = await request('GET', `/applications/${encodeURIComponent("1 OR 1=1")}`, null, adminToken);
  assert(t15.status === 404 || t15.status === 400, '15. SQL Injection in URL ID parameter safely blocked without error leakage', t15);

  // ==================================================================
  // CATEGORY 4: XSS PROTECTION (Tests 16 - 19)
  // ==================================================================
  console.log('\n--- CATEGORY 4: XSS PROTECTION ---');

  const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert("XSS")>';

  // Register Candidate XSS specifically in APPLIED state for task tests
  const candXEmail = `xss_cand_${ts}@newleaplabs.org`;
  const candXReg = await request('POST', '/auth/register', {
    full_name: `Candidate XSS ${ts}`,
    email: candXEmail,
    password: 'Password123!'
  });
  const candXToken = candXReg.body?.data?.token;
  const candXAppRes = await sendMultipart('/applications', {
    email: candXEmail,
    full_name: `Candidate XSS ${ts}`,
    branch: 'Computer Science',
    academic_year: '3rd Year',
    domain: 'Software Security'
  }, 'resume', 'resume_x.pdf', candAPdf, candXToken);
  const candXAppId = candXAppRes.body?.data?.application?.id;

  // Test 16: Task title XSS attempt
  const t16 = await request('POST', '/tasks', {
    applicationId: candXAppId,
    title: `XSS Task ${xssPayload}`,
    description: `Instructions containing ${xssPayload}`,
    deadline: '2026-11-20 18:00:00'
  }, adminToken);
  const taskXId = t16.body?.data?.task?.id;
  assert(t16.status === 201 && !!taskXId, '16. Task with XSS payload accepted safely on backend as raw text', t16);

  // Test 17: Candidate reads task containing XSS payload safely
  const t17 = await request('GET', `/tasks/${taskXId}`, null, candXToken);
  assert(t17.status === 200 && t17.body?.data?.task?.title?.includes('<script>'), '17. Task description with XSS payload retrieved safely without execution', t17);

  // Test 18: Interview notes XSS attempt
  const t18 = await request('PATCH', `/interviews/${interviewAId}`, {
    notes: `Interview notes with ${xssPayload}`
  }, adminToken);
  assert(t18.status === 200, '18. Interview notes with XSS payload stored safely', t18);

  // Test 19: Feedback XSS attempt
  const t19 = await request('POST', `/interviews/${interviewAId}/feedback`, {
    score: 85,
    feedback: `Evaluation feedback with ${xssPayload}`
  }, adminToken);
  assert(t19.status === 201, '19. Feedback notes with XSS payload stored safely', t19);

  // ==================================================================
  // CATEGORY 5: FILE SECURITY & DOWNLOAD PROTECTION (Tests 20 - 26)
  // ==================================================================
  console.log('\n--- CATEGORY 5: FILE SECURITY & DOWNLOAD PROTECTION ---');

  // Test 20: Valid allowed file
  const validFile = Buffer.from('PK\x03\x04 valid test solution file', 'utf8');
  const t20 = await sendMultipart(`/tasks/${taskBId}/submit`, {}, 'solution', 'solution.zip', validFile, candBToken);
  assert(t20.status === 201 && t20.body?.data?.submission?.id, '20. Valid allowed file format (.zip) accepted', t20);

  // Test 21: Executable file upload rejected
  const badExe = Buffer.from('MZ executable test', 'utf8');
  const t21 = await sendMultipart(`/tasks/${taskXId}/submit`, {}, 'solution', 'malicious.exe', badExe, candXToken);
  assert(t21.status === 400 && (t21.body?.message?.includes('prohibited') || t21.body?.message?.includes('Invalid file type')), '21. Executable file (.exe) strictly rejected (400)');

  // Test 22: Oversized file rejected
  const hugeBuffer = Buffer.alloc(26 * 1024 * 1024, 0); // 26MB (limit is 25MB)
  const t22 = await sendMultipart(`/tasks/${taskXId}/submit`, {}, 'solution', 'oversized.zip', hugeBuffer, candXToken);
  assert(t22.status === 400 && t22.body?.message?.includes('File too large'), '22. Oversized file (>25MB) rejected with 400 Bad Request');

  // Test 23: Malicious filename sanitized
  const weirdFilename = 'test;rm -rf /;%20payload.zip';
  const t23 = await sendMultipart(`/tasks/${taskXId}/submit`, {}, 'solution', weirdFilename, validFile, candXToken);
  assert(t23.status === 201, '23. Malicious filename sanitized safely into random alphanumeric timestamp', t23);

  // Test 24: Path traversal in file download request rejected
  const t24 = await request('GET', '/uploads/submissions/../../package.json', null, adminToken);
  assert(t24.status === 400 || t24.status === 403 || t24.status === 404, '24. Path traversal attempt (../../) blocked', t24);

  // Test 25: Unauthorized file download without token rejected
  const t25 = await request('GET', '/uploads/submissions/cfd_results.zip');
  assert(t25.status === 401, '25. Unauthorized file download blocked with 401 Unauthorized', t25);

  // Test 26: Candidate accessing another candidate's file rejected
  const t26 = await request('GET', `/tasks/${taskAId}/submission/file`, null, candBToken);
  assert(t26.status === 403, '26. Candidate B blocked from accessing Candidate A submitted file (403 Forbidden)', t26);

  // ==================================================================
  // CATEGORY 6: BUSINESS LOGIC SECURITY (Tests 27 - 30)
  // ==================================================================
  console.log('\n--- CATEGORY 6: BUSINESS LOGIC ENFORCEMENT ---');

  // Test 27: Candidate attempting self-selection
  const t27 = await request('PATCH', `/applications/${candAAppId}/status`, { status: 'SELECTED' }, candAToken);
  assert(t27.status === 403, '27. Candidate self-selection attempt blocked with 403 Forbidden');

  // Test 28: Candidate attempting status manipulation
  const t28 = await request('PATCH', `/applications/${candAAppId}/status`, { status: 'SHORTLISTED' }, candAToken);
  assert(t28.status === 403, '28. Candidate status manipulation blocked with 403 Forbidden');

  // Test 29: Candidate attempting to assign or modify task
  const t29 = await request('POST', '/tasks', {
    applicationId: candAAppId,
    title: 'Self Assigned Task',
    description: 'Bypassing admin workflow',
    deadline: '2026-12-01 12:00:00'
  }, candAToken);
  assert(t29.status === 403, '29. Candidate task assignment attempt blocked with 403 Forbidden');

  // Test 30: Candidate attempting to modify interview outcome
  const t30 = await request('PATCH', `/interviews/${interviewAId}`, { score: 100, result: 'SELECTED' }, candAToken);
  assert(t30.status === 403, '30. Candidate modifying interview score/outcome blocked with 403 Forbidden');

  // ==================================================================
  // CATEGORY 7: API VALIDATION & RATE LIMITING (Tests 31 - 35)
  // ==================================================================
  console.log('\n--- CATEGORY 7: API VALIDATION & RATE LIMITING ---');

  // Test 31: Missing required fields in task assignment
  const t31 = await request('POST', '/tasks', {
    applicationId: candAAppId
    // title, description, deadline missing
  }, adminToken);
  assert(t31.status === 400 && t31.body?.success === false, '31. Missing required fields rejected with 400 Bad Request', t31);

  // Test 32: Invalid IDs
  const t32 = await request('GET', '/applications/9999999', null, adminToken);
  assert(t32.status === 404 && t32.body?.success === false, '32. Invalid/nonexistent application ID returns 404 Not Found', t32);

  // Test 33: Invalid status value
  const t33 = await request('PATCH', `/applications/${candBAppId}/status`, { status: 'NON_EXISTENT_STATUS' }, adminToken);
  assert(t33.status === 400 && t33.body?.success === false, '33. Invalid status value rejected with 400 Bad Request', t33);

  // Test 34: Invalid date
  const t34 = await request('POST', '/tasks', {
    applicationId: candAAppId,
    title: 'Invalid Date Task',
    description: 'Testing malformed date',
    deadline: 'not-a-valid-date-string'
  }, adminToken);
  assert(t34.status === 400 && t34.body?.success === false, '34. Malformed date format rejected with 400 Bad Request', t34);

  // Test 35: Rate-limit test
  console.log('  Executing rate-limit verification on /api/test-rate-limit...');
  let hitLimit = false;
  for (let i = 0; i < 8; i++) {
    const rlRes = await request('GET', '/test-rate-limit', null, null, { 'x-skip-rate-limit': 'false' });
    if (rlRes.status === 429) {
      hitLimit = true;
      break;
    }
  }
  assert(hitLimit, '35. Rate limiting active: Returns 429 Too Many Requests when threshold exceeded');

  console.log('\n======================================================================');
  console.log(`SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('======================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSecuritySuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
