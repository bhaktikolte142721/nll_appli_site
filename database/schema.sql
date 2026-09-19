-- =============================================================================
-- New Leap Labs - Interview Management Platform Database Schema
-- Database: new_leap_labs
-- Compatible with MySQL 8.0+
-- =============================================================================

CREATE DATABASE IF NOT EXISTS new_leap_labs 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE new_leap_labs;

-- Disable foreign key checks during schema re-creation if needed
SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(25) NULL,
  role ENUM('candidate', 'admin') NOT NULL DEFAULT 'candidate',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- 2. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NULL,
  date_of_birth DATE NULL,
  gender VARCHAR(20) NULL,
  branch VARCHAR(100) NOT NULL,
  academic_year VARCHAR(50) NOT NULL,
  domain VARCHAR(100) NOT NULL,
  about TEXT NULL,
  resume_path VARCHAR(255) NULL,
  status ENUM('APPLIED', 'SHORTLISTED', 'TASK_ASSIGNED', 'TASK_SUBMITTED', 'TASK_UNDER_REVIEW', 'INTERVIEW', 'SECOND_INTERVIEW', 'INTERVIEW_COMPLETED', 'SELECTED', 'REJECTED', 'WAITLISTED') NOT NULL DEFAULT 'APPLIED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_applications_status (status),
  INDEX idx_applications_domain (domain),
  INDEX idx_applications_branch (branch),
  INDEX idx_applications_created (created_at)
) ENGINE=InnoDB;

-- 3. APPLICATION STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS application_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  old_status VARCHAR(50) NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by INT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_history_app (application_id)
) ENGINE=InnoDB;

-- 4. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  assigned_by INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  deadline DATETIME NULL,
  status ENUM('ASSIGNED', 'SUBMITTED', 'REVIEWED', 'COMPLETED') NOT NULL DEFAULT 'ASSIGNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tasks_app (application_id),
  INDEX idx_tasks_status (status)
) ENGINE=InnoDB;

-- 5. TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS task_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  candidate_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NULL,
  file_size INT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  marks INT NULL,
  comments TEXT NULL,
  status ENUM('SUBMITTED', 'REVIEWED') NOT NULL DEFAULT 'SUBMITTED',
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sub_task (task_id),
  INDEX idx_sub_candidate (candidate_id)
) ENGINE=InnoDB;

-- 6. INTERVIEWS TABLE
CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  interviewer_id INT NULL,
  round VARCHAR(50) NOT NULL DEFAULT 'SECOND_INTERVIEW',
  status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  score INT NULL,
  result ENUM('SELECTED', 'REJECTED', 'WAITLISTED', 'PENDING') NOT NULL DEFAULT 'PENDING',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (interviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_interviews_app (application_id),
  INDEX idx_interviews_date (scheduled_at),
  INDEX idx_interviews_status (status)
) ENGINE=InnoDB;

-- 7. INTERVIEW QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS interview_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_id INT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  INDEX idx_questions_interview (interview_id)
) ENGINE=InnoDB;

-- 8. INTERVIEW FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS interview_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_id INT NOT NULL,
  interviewer_id INT NULL,
  score INT NOT NULL DEFAULT 0,
  feedback TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  FOREIGN KEY (interviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_feedback_interview (interview_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
