# New Leap Labs - Interview Management Platform

A robust, enterprise-grade full stack Interview Management Platform built for **New Leap Labs**, managing candidates across the complete recruitment lifecycle:

$$\text{Applied} \longrightarrow \text{Shortlisted} \longrightarrow \text{Task Assigned} \longrightarrow \text{Task Submitted} \longrightarrow \text{Interview} \longrightarrow \text{Selected / Rejected}$$

---

## 1. Architecture Overview

The system strictly adheres to a **three-tier architecture**:

```
[ Frontend: HTML5 / CSS3 / Vanilla JS ] (Port 3000)
                  │
                  ▼  JSON REST APIs & Multipart Form-Data
[ Express.js REST API Backend ] (Port 5000)
   ├── Security: Helmet & Configurable CORS
   ├── Auth: JWT Bearer Tokens & bcryptjs
   ├── File Handling: Multer (Resumes & Task Submissions)
   └── Controllers & Transactional Models
                  │
                  ▼  mysql2 connection pool & transactions
[ MySQL Relational Database: new_leap_labs ] (Port 3306)
   ├── Normalized tables with Foreign Keys & CASCADE rules
   ├── Audit trail (application_status_history)
   └── B-Tree Indexes for fast lookups
```

> [!IMPORTANT]
> The frontend never connects directly to MySQL. All database operations, role authorization guards, status transitions, and file validations are handled by the Express backend.

---

## 2. Directory Structure

```
new_appli_nll/
├── client/ (preserved existing UI)
│   ├── login.html                 # Login page (Figma-accurate space theme)
│   ├── pages/
│   │   ├── application1.html      # Candidate Registration Step 1
│   │   ├── application2.html      # Personal Details Step 2
│   │   ├── application3.html      # Academic & Domain Info Step 3
│   │   ├── dashboard-user.html    # Candidate Application & Status Dashboard
│   │   ├── user-task.html         # Candidate Task Submission & Review Status
│   │   ├── dashboard-admin.html   # Admin Metrics & Candidate Evaluation
│   │   └── task-assignment.html   # Admin Task Assignment Center
│   ├── css/                       # Curated space-themed styles & typography
│   ├── js/
│   │   ├── api.js                 # Shared REST API Client & Auth Guard
│   │   ├── script.js              # Login Page Controller
│   │   ├── app-pages.js           # Multi-step Application Submission Logic
│   │   ├── dashboard-user.js      # Candidate Real-time Dashboard
│   │   ├── dashboard-admin.js     # Admin Real-time Metrics & Table
│   │   ├── task-assignment.js     # Admin Task Dispatching
│   │   └── user-task.js           # Candidate Task Upload & Modal
│   └── assets/                    # Figma vectors, icons & satellite graphics
│
├── server/
│   ├── config/
│   │   └── db.js                  # MySQL2 connection pool & transaction helper
│   ├── middleware/
│   │   ├── auth.js                # JWT verification middleware
│   │   ├── role.js                # Role-based authorization guard (candidate/admin)
│   │   ├── upload.js              # Multer configuration with filename sanitization
│   │   └── errorHandler.js        # Centralized HTTP & MySQL error handler
│   ├── routes/
│   │   ├── auth.routes.js         # Register, Login, Current User
│   │   ├── applications.routes.js # Application submission, list, and lifecycle status
│   │   ├── tasks.routes.js        # Assignment, submission upload, and review
│   │   ├── interviews.routes.js   # Interview scheduling, feedback, questions
│   │   ├── dashboard.routes.js    # Dynamic metrics computation
│   │   └── users.routes.js        # Candidate & evaluator directory
│   ├── controllers/               # Business logic controllers
│   ├── models/                    # Parameterized SQL models with transactions
│   ├── uploads/                   # Secure storage
│   │   ├── resumes/               # Candidate CVs/resumes (PDF, DOCX)
│   │   └── submissions/           # Solution archives (ZIP, PDF, DOCX, TXT, PNG)
│   ├── utils/
│   │   ├── jwt.js                 # Token signing & verification
│   │   └── response.js            # Standardized API response formatter
│   ├── scripts/
│   │   ├── setupDb.js             # Automated schema and seed runner
│   │   └── testApi.js             # 22-step automated verification suite
│   ├── app.js                     # Express application configuration
│   └── server.js                  # Server entry point (Port 5000)
│
├── database/
│   ├── schema.sql                 # DDL: 8 normalized tables with foreign keys
│   └── seed.sql                   # Sample admin, candidates, tasks, interviews
│
├── .env                           # Environment configuration
├── .env.example                   # Template environment variables
├── package.json                   # Dependencies & scripts
└── server.js                      # Static frontend dev server (Port 3000)
```

---

## 3. Database Design & Relational Tables

Database: `new_leap_labs`

| Table | Primary Key | Key Foreign Keys | Purpose |
| :--- | :--- | :--- | :--- |
| `users` | `id` | - | Accounts with bcrypt hashes, role (`admin` or `candidate`) |
| `applications` | `id` | `user_id -> users(id)` | 3-step application record with domain, academic year, status |
| `application_status_history` | `id` | `application_id -> applications(id)` | Immutable audit trail for every status transition |
| `tasks` | `id` | `application_id -> applications(id)` | Admin-assigned evaluation tasks with deadlines |
| `task_submissions` | `id` | `task_id -> tasks(id)` | Uploaded solution files, scores, and evaluator comments |
| `interviews` | `id` | `application_id -> applications(id)` | Scheduled Round 2 interviews with scores and outcomes |
| `interview_questions` | `id` | `interview_id -> interviews(id)` | Technical questions and candidate answers |
| `interview_feedback` | `id` | `interview_id -> interviews(id)` | Structured interviewer scores and written evaluations |

---

## 4. Installation & Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MySQL Server](https://dev.mysql.com/) 8.0+ running on port 3306

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and set your MySQL password:
```ini
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_NAME=new_leap_labs
DB_USER=root
DB_PASSWORD=your_mysql_root_password

JWT_SECRET=new_leap_labs_super_secret_jwt_key_2026_aerospace
JWT_EXPIRES_IN=1d

CLIENT_URL=http://localhost:3000
```

### Step 3: Run Database Migrations & Seeds
```bash
npm run db:setup
```
*Alternatively, load `database/schema.sql` and `database/seed.sql` directly using MySQL Workbench or the MySQL CLI:*
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p new_leap_labs < database/seed.sql
```

### Step 4: Start the Backend Server
```bash
# Production mode
npm start

# Or Development mode with hot-reloading
npm run dev
```
Backend API will be live at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### Step 5: Start the Frontend
In a separate terminal:
```bash
npm run serve:frontend
```
Frontend will be accessible at: `http://localhost:3000`

---

## 5. Sample Credentials

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@newleaplabs.com` | `Admin@123` | Full admin dashboard, task dispatch, interview evaluations |
| **Candidate 1** | `bhakti@example.com` | `Candidate@123` | Active candidate (`APPLIED` stage) |
| **Candidate 2** | `rohan.deshmukh@example.com` | `Candidate@123` | Candidate with assigned task (`TASK_ASSIGNED`) |
| **Candidate 3** | `aarav.sharma@example.com` | `Candidate@123` | Candidate with submitted solution (`TASK_SUBMITTED`) |

---

## 6. Running Automated Verification Tests

A complete 22-step integration test suite is provided to verify:
- Authentication & JWT issuance
- Candidate registration and duplicate prevention
- Role-based authorization & route guards
- Application multi-step relational submission
- Task assignment & file upload verification (Multer)
- Malicious file rejection (`.exe`)
- MySQL database transactions & status audit log
- Dynamic admin metrics computation

Run the test suite:
```bash
npm run test:api
```
