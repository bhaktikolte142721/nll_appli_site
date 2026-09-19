/**
 * New Leap Labs - 21-Step Dynamic Data & Isolation Audit Verification
 */

const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const PORT = process.env.PORT || 5000;

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${message}`);
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
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runAudit() {
  console.log('======================================================================');
  console.log('STARTING 21-STEP DYNAMIC DATA & ISOLATION AUDIT SUITE');
  console.log('======================================================================\n');

  const ts = Date.now();
  const candA_email = `audit_cand_a_${ts}@test.com`;
  const candB_email = `audit_cand_b_${ts}@test.com`;
  const candA_name = `Candidate Alpha ${ts}`;
  const candB_name = `Candidate Beta ${ts}`;

  let tokenA = '';
  let tokenB = '';
  let adminToken = '';
  let appA_id = null;
  let appB_id = null;
  let taskA_id = null;
  let submissionA_id = null;
  let interviewA_id = null;

  // STEP 1: Create Candidate A
  console.log('Step 1: Create Candidate A...');
  const regA = await request('POST', '/auth/register', {
    full_name: candA_name,
    email: candA_email,
    password: 'Password123!',
    role: 'candidate'
  });
  assert(regA.status === 201 && regA.body.data?.token, `Candidate A created successfully (${candA_email})`);
  tokenA = regA.body.data.token;

  // Submit Candidate A application
  const appA_res = await request('POST', '/applications', {
    full_name: candA_name,
    email: candA_email,
    branch: 'Aerospace Engineering',
    academic_year: '3rd Year',
    domain: 'Propulsion Systems',
    phone: '+91 9876543210',
    about: 'Passionate about hybrid rocket engines'
  }, tokenA);
  appA_id = appA_res.body.data?.application?.id || appA_res.body.data?.id;
  assert(appA_res.status === 201 && appA_id, `Candidate A application submitted to MySQL (App ID: ${appA_id})`);

  // STEP 2: Create Candidate B
  console.log('\nStep 2: Create Candidate B...');
  const regB = await request('POST', '/auth/register', {
    full_name: candB_name,
    email: candB_email,
    password: 'Password123!',
    role: 'candidate'
  });
  assert(regB.status === 201 && regB.body.data?.token, `Candidate B created successfully (${candB_email})`);
  tokenB = regB.body.data.token;

  // Submit Candidate B application
  const appB_res = await request('POST', '/applications', {
    full_name: candB_name,
    email: candB_email,
    branch: 'Avionics & Electronics',
    academic_year: '4th Year',
    domain: 'Embedded Systems',
    phone: '+91 9123456780',
    about: 'Embedded firmware engineer for CubeSats'
  }, tokenB);
  appB_id = appB_res.body.data?.application?.id || appB_res.body.data?.id;
  assert(appB_res.status === 201 && appB_id, `Candidate B application submitted to MySQL (App ID: ${appB_id})`);

  // STEP 3: Login as Candidate A
  console.log('\nStep 3: Login as Candidate A...');
  const loginA = await request('POST', '/auth/login', {
    email: candA_email,
    password: 'Password123!'
  });
  assert(loginA.status === 200 && loginA.body.data?.token, 'Candidate A authenticated via JWT');
  tokenA = loginA.body.data.token;

  // STEP 4: Verify Candidate A sees only their data
  console.log('\nStep 4: Verify Candidate A data isolation...');
  const dashA = await request('GET', '/dashboard/candidate', null, tokenA);
  assert(dashA.status === 200, 'Candidate A fetched dashboard data from backend');
  assert(dashA.body.data?.candidate?.full_name === candA_name, `Candidate A sees their own name: "${candA_name}"`);
  assert(dashA.body.data?.application?.domain === 'Propulsion Systems', 'Candidate A sees domain "Propulsion Systems"');
  assert(dashA.body.data?.application?.email === candA_email, 'Candidate A sees their own email');
  assert(dashA.body.data?.status === 'APPLIED', 'Candidate A status is APPLIED');

  // Verify Candidate A cannot access Candidate B application directly
  const crossAccess = await request('GET', `/applications/${appB_id}`, null, tokenA);
  assert(crossAccess.status === 403 || crossAccess.status === 404, `Candidate A forbidden from accessing Candidate B app record (HTTP ${crossAccess.status})`);

  // STEP 5: Login as admin
  console.log('\nStep 5: Login as admin...');
  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@newleaplabs.com',
    password: 'Admin@123'
  });
  assert(adminLogin.status === 200 && adminLogin.body.data?.token, 'Admin authenticated via JWT');
  adminToken = adminLogin.body.data.token;

  // STEP 6: Verify both candidates appear in admin pipeline
  console.log('\nStep 6: Verify both candidates appear dynamically in admin dashboard...');
  const adminApps = await request('GET', '/applications?limit=100', null, adminToken);
  assert(adminApps.status === 200 && Array.isArray(adminApps.body.data), 'Admin retrieved dynamic applications list');
  const foundCandA = adminApps.body.data.find(a => a.id === appA_id);
  const foundCandB = adminApps.body.data.find(a => a.id === appB_id);
  assert(foundCandA && foundCandA.full_name === candA_name, `Candidate A found in admin list: ${foundCandA?.full_name}`);
  assert(foundCandB && foundCandB.full_name === candB_name, `Candidate B found in admin list: ${foundCandB?.full_name}`);

  // Also check admin stats
  const adminStats = await request('GET', '/dashboard/stats', null, adminToken);
  assert(adminStats.status === 200 && adminStats.body.data?.totalApplications >= 2, `Admin stats dynamic total applications: ${adminStats.body.data?.totalApplications}`);

  // STEP 7: Assign a unique custom task to Candidate A
  console.log('\nStep 7: Assign unique custom task to Candidate A...');
  const customTaskTitle = `Nozzle Simulation Benchmark ${ts}`;
  const customTaskDesc = `Perform ANSYS Fluent CFD thermal analysis on the converging-diverging rocket nozzle design. Submit detailed report and mesh data.`;
  const customDeadline = '2026-11-15T18:00:00.000Z';

  const assignTaskRes = await request('POST', '/tasks', {
    applicationId: appA_id,
    application_id: appA_id,
    title: customTaskTitle,
    description: customTaskDesc,
    deadline: customDeadline
  }, adminToken);
  taskA_id = assignTaskRes.body.data?.task?.id || assignTaskRes.body.data?.id;
  assert(assignTaskRes.status === 201 && taskA_id, `Custom task created via POST /api/tasks (Task ID: ${taskA_id})`);

  // STEP 8: Verify task is stored in MySQL
  console.log('\nStep 8: Verify task is stored in MySQL...');
  const verifyTaskAdmin = await request('GET', `/tasks/${taskA_id}`, null, adminToken);
  const taskRecord = verifyTaskAdmin.body.data?.task || verifyTaskAdmin.body.data;
  assert(verifyTaskAdmin.status === 200 && taskRecord?.title === customTaskTitle, `Task in MySQL matches title: "${taskRecord?.title}"`);
  assert(taskRecord?.description === customTaskDesc, 'Task in MySQL matches description exactly');

  // STEP 9: Login as Candidate A
  console.log('\nStep 9: Login as Candidate A...');
  const reLoginA = await request('POST', '/auth/login', {
    email: candA_email,
    password: 'Password123!'
  });
  assert(reLoginA.status === 200, 'Candidate A logged in');
  tokenA = reLoginA.body.data.token;

  // STEP 10: Verify exact task appears for Candidate A
  console.log('\nStep 10: Verify Candidate A retrieves exact task via GET /api/tasks/me...');
  const candATasks = await request('GET', '/tasks/me', null, tokenA);
  assert(candATasks.status === 200 && candATasks.body.data?.length === 1, 'Candidate A has 1 active task assigned');
  const taskMe = candATasks.body.data[0];
  assert(taskMe.title === customTaskTitle, `Task title matches exact input: "${taskMe.title}"`);
  assert(taskMe.description === customTaskDesc, 'Task description matches exact input');
  assert(new Date(taskMe.deadline).getTime() === new Date(customDeadline).getTime(), 'Task deadline matches exact input');

  // STEP 11: Submit a test file as Candidate A
  console.log('\nStep 11: Submit solution file as Candidate A...');
  const testSolutionBuffer = Buffer.from('SOLIDWORKS & ANSYS NOZZLE CFD DATA PACKAGE 2026', 'utf8');
  const submitRes = await sendMultipart(
    `/tasks/${taskA_id}/submit`,
    {},
    'solution',
    'nozzle_cfd_analysis.zip',
    testSolutionBuffer,
    tokenA
  );
  assert(submitRes.status === 201 && submitRes.body.data?.submission?.id, `Solution submitted (Submission ID: ${submitRes.body.data?.submission?.id})`);
  submissionA_id = submitRes.body.data.submission.id;

  // STEP 12: Login as admin
  console.log('\nStep 12: Login as admin...');
  const adminLogin2 = await request('POST', '/auth/login', {
    email: 'admin@newleaplabs.com',
    password: 'Admin@123'
  });
  adminToken = adminLogin2.body.data.token;
  assert(adminToken !== '', 'Admin session active');

  // STEP 13: Verify actual submission appears in admin
  console.log('\nStep 13: Verify submission appears dynamically in admin...');
  const subRes = await request('GET', `/tasks/${taskA_id}/submission`, null, adminToken);
  assert(subRes.status === 200, 'Admin retrieves candidate submission metadata');
  const foundSub = subRes.body.data?.submission;
  assert(foundSub && foundSub.file_name === 'nozzle_cfd_analysis.zip', `Found submitted file: "${foundSub?.file_name}"`);
  assert(foundSub?.status === 'SUBMITTED', 'Submission status is SUBMITTED');

  // Also verify secure file download
  const fileDownload = await request('GET', `/tasks/${taskA_id}/submission/file`, null, adminToken);
  assert(fileDownload.status === 200, 'Admin authorized to securely download submitted file');

  // STEP 14: Review the submission
  console.log('\nStep 14: Review submission as admin (PATCH /tasks/:id/review)...');
  const reviewRes = await request('PATCH', `/tasks/${taskA_id}/review`, {
    marks: 95,
    comments: 'Excellent CFD mesh convergence and thermal flux calculations.',
    decision: 'SECOND_INTERVIEW'
  }, adminToken);
  assert(reviewRes.status === 200 && reviewRes.body.data?.submission?.marks === 95, `Submission reviewed (Marks: ${reviewRes.body.data?.submission?.marks}, Comments recorded)`);

  // STEP 15: Advance Candidate A to second interview
  console.log('\nStep 15: Verify Candidate A advanced to second interview...');
  assert(reviewRes.body.data?.application?.status === 'SECOND_INTERVIEW', 'Candidate A status advanced to SECOND_INTERVIEW');

  // STEP 16: Schedule second interview
  console.log('\nStep 16: Schedule interview for Candidate A...');
  const interviewTime = new Date(Date.now() + 86400000 * 2).toISOString();
  const meetUrl = 'https://meet.google.com/nll-prop-test';
  const scheduleRes = await request('POST', '/interviews', {
    applicationId: appA_id,
    application_id: appA_id,
    scheduledAt: interviewTime,
    scheduled_at: interviewTime,
    mode: 'Online (Google Meet)',
    notes: meetUrl
  }, adminToken);
  console.log('DEBUG scheduleRes:', scheduleRes.status, JSON.stringify(scheduleRes.body));
  interviewA_id = scheduleRes.body.data?.interview?.id || scheduleRes.body.data?.id;
  assert(scheduleRes.status === 201 && interviewA_id, `Interview scheduled (Interview ID: ${interviewA_id})`);

  // Record an interview question
  const addQRes = await request('POST', `/interviews/${interviewA_id}/questions`, {
    question: 'How do you prevent boundary layer separation at Mach 3.2?',
    answer: 'Using contour nozzle optimization and boundary layer suction ports.'
  }, adminToken);
  assert(addQRes.status === 201, 'Interview question & candidate answer recorded dynamically in MySQL');

  // STEP 17: Login as Candidate A
  console.log('\nStep 17: Login as Candidate A...');
  const candALogin3 = await request('POST', '/auth/login', {
    email: candA_email,
    password: 'Password123!'
  });
  tokenA = candALogin3.body.data.token;
  assert(tokenA !== '', 'Candidate A re-authenticated');

  // STEP 18: Verify interview details for Candidate A
  console.log('\nStep 18: Verify Candidate A dashboard displays scheduled interview...');
  const candADashInt = await request('GET', '/dashboard/candidate', null, tokenA);
  assert(candADashInt.status === 200, 'Fetched Candidate A dashboard');
  assert(candADashInt.body.data?.status === 'SECOND_INTERVIEW', 'Dashboard status reflects SECOND_INTERVIEW');
  assert(candADashInt.body.data?.currentInterview?.id === interviewA_id, `Interview ID matches: ${interviewA_id}`);
  assert(candADashInt.body.data?.currentInterview?.notes.includes(meetUrl), 'Google Meet URL present in interview details');

  // STEP 19: Set final outcome (SELECTED)
  console.log('\nStep 19: Record final decision (SELECTED) as admin...');
  const completeInterviewRes = await request('PATCH', `/interviews/${interviewA_id}`, {
    status: 'COMPLETED',
    score: 98,
    result: 'SELECTED',
    notes: 'Outstanding technical knowledge. Highly recommended for flight telemetry & propulsion team.'
  }, adminToken);
  assert(completeInterviewRes.status === 200, 'Interview marked COMPLETED with result SELECTED');

  const finalDecisionRes = await request('PATCH', `/applications/${appA_id}/status`, {
    status: 'SELECTED',
    remarks: 'Welcome to New Leap Labs!'
  }, adminToken);
  assert(finalDecisionRes.status === 200 && finalDecisionRes.body.data?.application?.status === 'SELECTED', 'Application status updated to SELECTED in MySQL');

  // STEP 20: Verify Candidate A dashboard updates to SELECTED
  console.log('\nStep 20: Verify Candidate A dashboard reflects SELECTED...');
  const finalDashA = await request('GET', '/dashboard/candidate', null, tokenA);
  assert(finalDashA.status === 200, 'Fetched updated Candidate A dashboard');
  assert(finalDashA.body.data?.status === 'SELECTED', 'Candidate A status is SELECTED');
  assert(finalDashA.body.data?.candidate?.full_name === candA_name, `Candidate A name is "${candA_name}"`);

  // STEP 21: Verify Candidate B dashboard remains completely unchanged
  console.log('\nStep 21: Verify Candidate B dashboard remains completely isolated and unchanged...');
  const loginB = await request('POST', '/auth/login', {
    email: candB_email,
    password: 'Password123!'
  });
  tokenB = loginB.body.data.token;
  const dashB = await request('GET', '/dashboard/candidate', null, tokenB);
  assert(dashB.status === 200, 'Candidate B dashboard fetched');
  assert(dashB.body.data?.candidate?.full_name === candB_name, `Candidate B sees only their name: "${candB_name}"`);
  assert(dashB.body.data?.status === 'APPLIED', 'Candidate B status remains untouched (APPLIED)');
  assert(!dashB.body.data?.currentTask, 'Candidate B has NO task assigned');
  assert(!dashB.body.data?.currentInterview, 'Candidate B has NO interview scheduled');
  assert(dashB.body.data?.tasks?.length === 0, 'Candidate B task list is empty');
  assert(dashB.body.data?.interviews?.length === 0, 'Candidate B interview list is empty');

  console.log('\n======================================================================');
  console.log(`AUDIT COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
