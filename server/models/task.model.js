const db = require('../config/db');

class TaskModel {
  static async create({ application_id, assigned_by, title, description, deadline }, conn = null) {
    const sql = `
      INSERT INTO tasks (application_id, assigned_by, title, description, deadline, status)
      VALUES (?, ?, ?, ?, ?, 'ASSIGNED')
    `;
    const params = [application_id, assigned_by, title, description, deadline];

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
      application_id,
      assigned_by,
      title,
      description,
      deadline,
      status: 'ASSIGNED'
    };
  }

  static async findById(id) {
    const sql = `
      SELECT t.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.user_id AS candidate_user_id,
             u.full_name AS assigned_by_name
      FROM tasks t
      JOIN applications a ON t.application_id = a.id
      LEFT JOIN users u ON t.assigned_by = u.id
      WHERE t.id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async findByApplicationId(applicationId) {
    const sql = `
      SELECT t.*, u.full_name AS assigned_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_by = u.id
      WHERE t.application_id = ?
      ORDER BY t.created_at DESC
    `;
    return await db.query(sql, [applicationId]);
  }

  static async findByCandidateId(candidateUserId) {
    const sql = `
      SELECT t.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.user_id AS candidate_user_id,
             u.full_name AS assigned_by_name
      FROM tasks t
      JOIN applications a ON t.application_id = a.id
      LEFT JOIN users u ON t.assigned_by = u.id
      WHERE a.user_id = ?
      ORDER BY t.created_at DESC
    `;
    return await db.query(sql, [candidateUserId]);
  }

  static async list({
    status = null,
    applicationId = null,
    page = 1,
    limit = 10
  } = {}) {
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    if (applicationId) {
      conditions.push('t.application_id = ?');
      params.push(applicationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM tasks t ${whereClause}`;
    const countRows = await db.query(countSql, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataSql = `
      SELECT t.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.domain AS candidate_domain,
             u.full_name AS assigned_by_name
      FROM tasks t
      JOIN applications a ON t.application_id = a.id
      LEFT JOIN users u ON t.assigned_by = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
    const rows = await db.query(dataSql, dataParams);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async updateStatus(id, status, conn = null) {
    const sql = `UPDATE tasks SET status = ?, updated_at = NOW() WHERE id = ?`;
    if (conn) {
      await conn.execute(sql, [status, id]);
    } else {
      await db.query(sql, [status, id]);
    }
    return { id, status };
  }
}

module.exports = TaskModel;
