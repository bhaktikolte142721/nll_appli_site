# New Leap Labs - REST API Specification

Base URL: `http://localhost:5000/api`

All JSON request bodies must include `Content-Type: application/json`.  
Authenticated requests must include `Authorization: Bearer <JWT_TOKEN>`.

---

## 1. Health & Status

### GET `/health`
Checks server and API status.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "New Leap Labs API is running",
  "data": {
    "timestamp": "2026-09-19T04:30:00.000Z",
    "env": "development"
  }
}
```

---

## 2. Authentication (`/auth`)

### POST `/auth/register`
Candidate registration.

**Request Body**:
```json
{
  "full_name": "Bhakti Patel",
  "email": "bhakti@example.com",
  "password": "Candidate@123",
  "phone": "+91 9876543210"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Account registered successfully",
  "data": {
    "user": {
      "id": 2,
      "full_name": "Bhakti Patel",
      "email": "bhakti@example.com",
      "phone": "+91 9876543210",
      "role": "candidate"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST `/auth/login`
User authentication (Candidate or Admin).

**Request Body**:
```json
{
  "email": "admin@newleaplabs.com",
  "password": "Admin@123"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Admin Evaluation Lead",
      "email": "admin@newleaplabs.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### GET `/auth/me`
Retrieves authenticated user profile.
*Requires Bearer Token.*

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "user": {
      "id": 1,
      "full_name": "Admin Evaluation Lead",
      "email": "admin@newleaplabs.com",
      "role": "admin",
      "created_at": "2026-09-19 04:00:00"
    }
  }
}
```

---

## 3. Applications (`/applications`)

### POST `/applications`
Candidate submits multi-step application form.  
*Role: Candidate*

Supports JSON or `multipart/form-data` with optional `resume` file.

**Request Body**:
```json
{
  "email": "bhakti@example.com",
  "full_name": "Bhakti Patel",
  "phone": "+91 9876543210",
  "date_of_birth": "2002-08-14",
  "gender": "Female",
  "branch": "Aerospace Engineering",
  "academic_year": "3rd Year",
  "domain": "Propulsion & Guidance",
  "about": "Aspiring satellite systems propulsion specialist."
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "application": {
      "id": 1,
      "user_id": 2,
      "status": "APPLIED",
      "branch": "Aerospace Engineering",
      "academic_year": "3rd Year",
      "domain": "Propulsion & Guidance"
    }
  }
}
```

---

### GET `/applications/me`
Candidate views their own application, status history, tasks, and interview details.  
*Role: Candidate*

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Application details retrieved",
  "data": {
    "application": {
      "id": 1,
      "full_name": "Bhakti Patel",
      "status": "SHORTLISTED"
    },
    "history": [
      {
        "id": 1,
        "old_status": null,
        "new_status": "APPLIED",
        "created_at": "2026-09-19 04:10:00"
      },
      {
        "id": 2,
        "old_status": "APPLIED",
        "new_status": "SHORTLISTED",
        "remarks": "Shortlisted based on academic merit"
      }
    ],
    "tasks": [],
    "interviews": []
  }
}
```

---

### GET `/applications`
Admin lists all applications with pagination and filters.  
*Role: Admin*

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `status` (e.g. `SHORTLISTED`, `APPLIED`)
- `domain` (e.g. `Avionics`)
- `branch` (e.g. `Computer Science`)
- `search` (Search name, email, or phone)
- `sortBy` (e.g. `created_at`, `full_name`)
- `order` (`ASC` or `DESC`)

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Applications retrieved successfully",
  "data": [
    {
      "id": 1,
      "full_name": "Bhakti Patel",
      "email": "bhakti@example.com",
      "domain": "Propulsion & Guidance",
      "branch": "Aerospace Engineering",
      "status": "SHORTLISTED"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 35,
    "totalPages": 4
  }
}
```

---

### PATCH `/applications/:id/status`
Admin updates candidate status. Automatically updates status audit history in a transaction.  
*Role: Admin*

**Request Body**:
```json
{
  "status": "SHORTLISTED",
  "remarks": "Qualified for task assignment round"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Application status updated to SHORTLISTED",
  "data": {
    "application": {
      "id": 1,
      "status": "SHORTLISTED"
    }
  }
}
```

---

## 4. Tasks (`/tasks`)

### POST `/tasks`
Admin assigns an evaluation task to a candidate.  
*Role: Admin*  
*Transitions candidate application status to `TASK_ASSIGNED` in a transaction.*

**Request Body**:
```json
{
  "applicationId": 1,
  "title": "Satellite Payload Simulation",
  "description": "Build an altitude sensor visualization module in Vanilla JS.",
  "deadline": "2026-10-15 18:00:00"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Task assigned successfully",
  "data": {
    "task": {
      "id": 1,
      "application_id": 1,
      "title": "Satellite Payload Simulation",
      "status": "ASSIGNED",
      "deadline": "2026-10-15 18:00:00"
    }
  }
}
```

---

### GET `/tasks/me`
Candidate views tasks assigned to them.  
*Role: Candidate*

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Candidate tasks retrieved",
  "data": [
    {
      "id": 1,
      "title": "Satellite Payload Simulation",
      "description": "Build an altitude sensor visualization module in Vanilla JS.",
      "status": "ASSIGNED",
      "deadline": "2026-10-15 18:00:00",
      "latestSubmission": null
    }
  ]
}
```

---

### POST `/tasks/:id/submit`
Candidate uploads task solution file (PDF, ZIP, DOCX, TXT, PNG).  
*Role: Candidate*  
*Uses Multer. Transitions task status to `SUBMITTED` and application status to `TASK_SUBMITTED` in a transaction.*

**Form Data**:
- `solution`: [File]

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Task solution submitted successfully",
  "data": {
    "submission": {
      "id": 1,
      "task_id": 1,
      "file_name": "payload_sim_v1.zip",
      "file_path": "/uploads/submissions/submission-payload_sim_v1-1726718400-421.zip",
      "status": "SUBMITTED"
    }
  }
}
```

---

### PATCH `/tasks/:id/review`
Admin reviews candidate solution, assigns score and remarks.  
*Role: Admin*

**Request Body**:
```json
{
  "submissionId": 1,
  "marks": 95,
  "comments": "Exceptional mathematical modeling and clean modular architecture.",
  "status": "REVIEWED"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Task reviewed successfully",
  "data": {
    "submission": {
      "id": 1,
      "marks": 95,
      "comments": "Exceptional mathematical modeling and clean modular architecture.",
      "status": "REVIEWED"
    }
  }
}
```

---

## 5. Interviews (`/interviews`)

### POST `/interviews`
Admin schedules Round 2 interview.  
*Role: Admin*  
*Transitions candidate status to `INTERVIEW` in a transaction.*

**Request Body**:
```json
{
  "applicationId": 1,
  "scheduledAt": "2026-10-20 15:30:00",
  "round": "SECOND_INTERVIEW"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "message": "Interview scheduled successfully",
  "data": {
    "interview": {
      "id": 1,
      "application_id": 1,
      "scheduled_at": "2026-10-20 15:30:00",
      "status": "SCHEDULED",
      "result": "PENDING"
    }
  }
}
```

---

### PATCH `/interviews/:id`
Admin submits interview outcome (Marks candidate `SELECTED` or `REJECTED`).  
*Role: Admin*

**Request Body**:
```json
{
  "status": "COMPLETED",
  "score": 92,
  "notes": "Excellent performance during technical Q&A.",
  "result": "SELECTED"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Interview updated successfully",
  "data": {
    "interview": {
      "id": 1,
      "status": "COMPLETED",
      "score": 92,
      "result": "SELECTED"
    }
  }
}
```

---

## 6. Dashboard (`/dashboard`)

### GET `/dashboard/stats`
Admin dashboard summary metrics calculated dynamically from MySQL tables.  
*Role: Admin*

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Admin dashboard statistics retrieved",
  "data": {
    "totalApplications": 35,
    "shortlistedCandidates": 12,
    "pendingTaskSubmissions": 8,
    "awaitingInterview": 6,
    "selectedCandidates": 4,
    "rejectedCandidates": 3,
    "domainStats": [
      { "domain": "Avionics", "count": 14 },
      { "domain": "Propulsion", "count": 11 }
    ]
  }
}
```

---

### GET `/dashboard/candidate`
Candidate dashboard state.  
*Role: Candidate*

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "Candidate dashboard retrieved",
  "data": {
    "candidate": {
      "id": 2,
      "full_name": "Bhakti Patel",
      "email": "bhakti@example.com",
      "role": "candidate"
    },
    "hasApplication": true,
    "application": {
      "id": 1,
      "status": "SELECTED"
    },
    "status": "SELECTED",
    "history": [...],
    "currentTask": {...},
    "currentInterview": {...}
  }
}
```
