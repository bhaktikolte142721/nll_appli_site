const db = require('../config/db');

async function run() {
  const alterSql = `
    ALTER TABLE applications 
    MODIFY COLUMN status ENUM(
      'APPLIED', 
      'SHORTLISTED', 
      'TASK_ASSIGNED', 
      'TASK_SUBMITTED', 
      'TASK_UNDER_REVIEW', 
      'INTERVIEW', 
      'SECOND_INTERVIEW', 
      'INTERVIEW_COMPLETED', 
      'SELECTED', 
      'REJECTED', 
      'WAITLISTED'
    ) NOT NULL DEFAULT 'APPLIED';
  `;

  try {
    await db.query(alterSql);
    console.log('MIGRATION_OK: applications.status ENUM updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
