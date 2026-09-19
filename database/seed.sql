-- =============================================================================
-- New Leap Labs - Seed Data
-- =============================================================================

USE new_leap_labs;

-- 1. Insert Initial Users
-- Passwords:
-- Admin: Admin@123
-- Candidates: Candidate@123
INSERT INTO users (id, full_name, email, password_hash, phone, role) VALUES
(1, 'System Administrator', 'admin@newleaplabs.com', '$2a$10$yoq64tHMMSa..hCxBgGxn.A/s5vicd6Bfay8WDi0SFJpzZ6aEvaUy', '+91 9876543210', 'admin'),
(2, 'Aarav Sharma', 'aarav.sharma@example.com', '$2a$10$FpqpVF8/lTt9XJtKUpbweerPyDHFcK5NWZZacx5WmJo8Iz9OKaWES', '+91 9811122233', 'candidate'),
(3, 'Diya Patel', 'diya.patel@example.com', '$2a$10$FpqpVF8/lTt9XJtKUpbweerPyDHFcK5NWZZacx5WmJo8Iz9OKaWES', '+91 9822233344', 'candidate'),
(4, 'Rohan Verma', 'rohan.verma@example.com', '$2a$10$FpqpVF8/lTt9XJtKUpbweerPyDHFcK5NWZZacx5WmJo8Iz9OKaWES', '+91 9833344455', 'candidate'),
(5, 'Ananya Iyer', 'ananya.iyer@example.com', '$2a$10$FpqpVF8/lTt9XJtKUpbweerPyDHFcK5NWZZacx5WmJo8Iz9OKaWES', '+91 9844455566', 'candidate'),
(6, 'Kabir Mehta', 'kabir.mehta@example.com', '$2a$10$FpqpVF8/lTt9XJtKUpbweerPyDHFcK5NWZZacx5WmJo8Iz9OKaWES', '+91 9855566677', 'candidate')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- 2. Insert Applications across stages
INSERT INTO applications (id, user_id, email, full_name, phone, date_of_birth, gender, branch, academic_year, domain, about, status) VALUES
(1, 2, 'aarav.sharma@example.com', 'Aarav Sharma', '+91 9811122233', '2003-05-14', 'male', 'Aerospace Engineering', '3rd Year', 'Flight Dynamics', 'Passionate about orbital mechanics and cubesat flight software design.', 'SHORTLISTED'),
(2, 3, 'diya.patel@example.com', 'Diya Patel', '+91 9822233344', '2002-11-20', 'female', 'Computer Science', '4th Year', 'Full Stack Space Systems', 'Experienced in building mission control telemetry web dashboards.', 'TASK_ASSIGNED'),
(3, 4, 'rohan.verma@example.com', 'Rohan Verma', '+91 9833344455', '2003-02-08', 'male', 'Mechanical Engineering', '3rd Year', 'Propulsion Systems', 'Focused on rocket nozzle fluid simulations and CAD propulsion assemblies.', 'TASK_SUBMITTED'),
(4, 5, 'ananya.iyer@example.com', 'Ananya Iyer', '+91 9844455566', '2002-09-17', 'female', 'Electronics & Comm.', '4th Year', 'Avionics & Embedded', 'Embedded C specialist with STM32 satellite sensor bus integration projects.', 'INTERVIEW'),
(5, 6, 'kabir.mehta@example.com', 'Kabir Mehta', '+91 9855566677', '2003-07-29', 'male', 'Data Science', '3rd Year', 'AI / Orbit Prediction', 'Machine learning enthusiast working on space debris tracking algorithms.', 'SELECTED')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 3. Insert Application Status History (Audit Trail)
INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks) VALUES
(1, 'APPLIED', 'SHORTLISTED', 1, 'Profile matches Aerospace Flight Dynamics requirements.'),
(2, 'APPLIED', 'SHORTLISTED', 1, 'Strong full stack development skills.'),
(2, 'SHORTLISTED', 'TASK_ASSIGNED', 1, 'Assigned Round 1 Telemetry Interface Task.'),
(3, 'APPLIED', 'SHORTLISTED', 1, 'Propulsion CAD portfolio approved.'),
(3, 'SHORTLISTED', 'TASK_ASSIGNED', 1, 'Assigned Nozzle Stress Analysis Task.'),
(3, 'TASK_ASSIGNED', 'TASK_SUBMITTED', 4, 'Solution uploaded by candidate.'),
(4, 'APPLIED', 'SHORTLISTED', 1, 'Avionics background verified.'),
(4, 'SHORTLISTED', 'TASK_ASSIGNED', 1, 'Sensor bus protocol task assigned.'),
(4, 'TASK_ASSIGNED', 'TASK_SUBMITTED', 5, 'Candidate submitted solution.'),
(4, 'TASK_SUBMITTED', 'INTERVIEW', 1, 'Task scored 92/100. Scheduled for Second Interview.'),
(5, 'APPLIED', 'SHORTLISTED', 1, 'High GPA and relevant AI papers.'),
(5, 'SHORTLISTED', 'TASK_ASSIGNED', 1, 'Orbit Prediction model task assigned.'),
(5, 'TASK_ASSIGNED', 'TASK_SUBMITTED', 6, 'Solution code submitted.'),
(5, 'TASK_SUBMITTED', 'INTERVIEW', 1, 'Task passed. Second interview conducted.'),
(5, 'INTERVIEW', 'SELECTED', 1, 'Exceptional interview score. Offer letter issued.');

-- 4. Insert Sample Tasks
INSERT INTO tasks (id, application_id, assigned_by, title, description, deadline, status) VALUES
(1, 2, 1, 'Telemetry Web Interface', 'Build a real-time satellite telemetry visualization dashboard using HTML5 Canvas / CSS and mock sensor stream.', DATE_ADD(NOW(), INTERVAL 7 DAY), 'ASSIGNED'),
(2, 3, 1, 'Nozzle Thermal Stress Simulation', 'Perform structural finite element analysis on the regeneratively cooled rocket nozzle bell.', DATE_ADD(NOW(), INTERVAL 3 DAY), 'SUBMITTED'),
(3, 4, 1, 'SPI / I2C Avionics Sensor Bus Driver', 'Develop bare-metal C driver for the high-g accelerometer and barometric altitude sensor.', DATE_SUB(NOW(), INTERVAL 2 DAY), 'REVIEWED'),
(4, 5, 1, 'Space Debris Orbit Predictor', 'Implement SGP4 simplified orbital perturbation model for LEO satellite tracking.', DATE_SUB(NOW(), INTERVAL 5 DAY), 'COMPLETED')
ON DUPLICATE KEY UPDATE title=VALUES(title);

-- 5. Insert Task Submissions
INSERT INTO task_submissions (id, task_id, candidate_id, file_name, file_path, file_type, file_size, submitted_at, marks, comments, status) VALUES
(1, 2, 4, 'thermal_stress_report.pdf', 'server/uploads/submissions/seed_thermal_stress.pdf', 'application/pdf', 1048576, DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL, 'SUBMITTED'),
(2, 3, 5, 'avionics_driver_code.zip', 'server/uploads/submissions/seed_avionics.zip', 'application/zip', 2097152, DATE_SUB(NOW(), INTERVAL 3 DAY), 92, 'Excellent interrupt handling and documentation.', 'REVIEWED'),
(3, 4, 6, 'orbit_predictor_solution.zip', 'server/uploads/submissions/seed_orbit.zip', 'application/zip', 1572864, DATE_SUB(NOW(), INTERVAL 6 DAY), 96, 'High precision orbital propagation.', 'REVIEWED')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 6. Insert Second Interviews
INSERT INTO interviews (id, application_id, scheduled_at, interviewer_id, round, status, score, result, notes) VALUES
(1, 4, DATE_ADD(NOW(), INTERVAL 2 DAY), 1, 'SECOND_INTERVIEW', 'SCHEDULED', NULL, 'PENDING', 'Technical panel review focusing on embedded RTOS constraints.'),
(2, 5, DATE_SUB(NOW(), INTERVAL 2 DAY), 1, 'SECOND_INTERVIEW', 'COMPLETED', 95, 'SELECTED', 'Demonstrated deep mathematical knowledge and passion for space systems.')
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- 7. Insert Interview Questions & Notes
INSERT INTO interview_questions (interview_id, question, answer) VALUES
(2, 'Explain how Keplerian orbital elements are updated over time under J2 perturbation.', 'Candidate derived nodal precession and perigee drift equations cleanly.'),
(2, 'How would you handle telemetry packet loss over radio link in deep space?', 'Described Reed-Solomon forward error correction and sliding window ARQ.');

-- 8. Insert Interview Feedback
INSERT INTO interview_feedback (interview_id, interviewer_id, score, feedback) VALUES
(2, 1, 95, 'Top candidate. Strong analytical and aerospace problem-solving skills.');
