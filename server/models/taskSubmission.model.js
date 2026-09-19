const db = require('../config/db');

class TaskSubmissionModel {
  static async create({
    task_id,
    candidate_id,
    file_name,
    file_path,
    file_type,
    file_size
  }, conn = null) {
    const sql = `
      INSERT INTO task_submissions (
        task_id, candidate_id, file_name, file_path, file_type, file_size, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED')
    `;
    const params = [task_id, candidate_id, file_name, file_path, file_type, file_size];

    let insertId;
    if (conn) {
      const [res] = await conn.execute(sql, params);
      insertId = res.insertId;
    } else {
      const res = await db.query(sql, params);
      insertId = res.insertId;
    }

    return {
      id: insertId,
      task_id,
      candidate_id,
      file_name,
      file_path,
      file_type,
      file_size,
      status: 'SUBMITTED'
    };
  }

  static async findByTaskId(taskId) {
    const sql = `
      SELECT ts.*, u.full_name AS candidate_name, u.email AS candidate_email
      FROM task_submissions ts
      JOIN users u ON ts.candidate_id = u.id
      WHERE ts.task_id = ?
      ORDER BY ts.submitted_at DESC
    `;
    return await db.query(sql, [taskId]);
  }

  static async findById(id, conn = null) {
    const sql = `
      SELECT ts.*, 
             t.title AS task_title, 
             t.application_id, 
             a.user_id AS candidate_user_id
      FROM task_submissions ts
      JOIN tasks t ON ts.task_id = t.id
      JOIN applications a ON t.application_id = a.id
      WHERE ts.id = ?
      LIMIT 1
    `;
    let rows;
    if (conn) {
      [rows] = await conn.execute(sql, [id]);
    } else {
      rows = await db.query(sql, [id]);
    }
    return rows[0] || null;
  }

  static async review(id, { marks, comments, status = 'REVIEWED' }, conn = null) {
    const sql = `
      UPDATE task_submissions 
      SET marks = ?, comments = ?, status = ?
      WHERE id = ?
    `;
    const params = [marks, comments, status, id];

    if (conn) {
      await conn.execute(sql, params);
    } else {
      await db.query(sql, params);
    }

    return await this.findById(id, conn);
  }
}

module.exports = TaskSubmissionModel;
