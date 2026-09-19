const db = require('../config/db');

class ApplicationModel {
  /**
   * Create a new application record.
   * If conn is provided, runs on that transaction connection.
   */
  static async create(appData, conn = null) {
    const {
      user_id,
      email,
      full_name,
      phone = null,
      date_of_birth = null,
      gender = null,
      branch,
      academic_year,
      domain,
      about = null,
      resume_path = null,
      status = 'APPLIED'
    } = appData;

    const sql = `
      INSERT INTO applications (
        user_id, email, full_name, phone, date_of_birth, gender,
        branch, academic_year, domain, about, resume_path, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user_id, email, full_name, phone, date_of_birth, gender,
      branch, academic_year, domain, about, resume_path, status
    ];

    const executor = conn ? conn.execute.bind(conn) : db.query.bind(db);
    const [result] = conn ? await conn.execute(sql, params) : [await db.query(sql, params)];
    const insertId = result.insertId;

    // Add initial status history
    const historySql = `
      INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks)
      VALUES (?, NULL, ?, ?, ?)
    `;
    const historyParams = [insertId, status, user_id, 'Initial application submission'];
    if (conn) {
      await conn.execute(historySql, historyParams);
    } else {
      await db.query(historySql, historyParams);
    }

    return { id: insertId, ...appData };
  }

  static async findByUserId(userId) {
    const sql = `SELECT * FROM applications WHERE user_id = ? LIMIT 1`;
    const rows = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  static async findById(id) {
    const sql = `
      SELECT a.*, u.phone AS user_phone
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async list({
    page = 1,
    limit = 10,
    status = null,
    domain = null,
    branch = null,
    search = null,
    sortBy = 'created_at',
    order = 'DESC'
  } = {}) {
    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('a.status = ?');
      params.push(status);
    }
    if (domain) {
      conditions.push('a.domain = ?');
      params.push(domain);
    }
    if (branch) {
      conditions.push('a.branch = ?');
      params.push(branch);
    }
    if (search) {
      conditions.push('(a.full_name LIKE ? OR a.email LIKE ? OR a.phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortColumns = ['created_at', 'full_name', 'status', 'domain', 'branch', 'id'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? `a.${sortBy}` : 'a.created_at';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const countSql = `SELECT COUNT(*) AS total FROM applications a ${whereClause}`;
    const countRows = await db.query(countSql, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    // Data query
    const dataSql = `
      SELECT a.*, u.email AS user_email
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeOrder}
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

  static async updateStatus(id, newStatus, changedBy = null, remarks = null, conn = null) {
    const getOldStatusSql = `SELECT status FROM applications WHERE id = ? LIMIT 1`;
    let oldStatus = null;
    if (conn) {
      const [rows] = await conn.execute(getOldStatusSql, [id]);
      if (rows.length > 0) oldStatus = rows[0].status;
    } else {
      const rows = await db.query(getOldStatusSql, [id]);
      if (rows.length > 0) oldStatus = rows[0].status;
    }

    if (!oldStatus) {
      const err = new Error(`Application with ID ${id} not found`);
      err.status = 404;
      throw err;
    }

    // Enforce pipeline state transition validation
    const VALID_TRANSITIONS = {
      APPLIED: ['SHORTLISTED', 'TASK_ASSIGNED', 'REJECTED'],
      SHORTLISTED: ['TASK_ASSIGNED', 'REJECTED'],
      TASK_ASSIGNED: ['TASK_SUBMITTED', 'REJECTED'],
      TASK_SUBMITTED: ['TASK_UNDER_REVIEW', 'SECOND_INTERVIEW', 'INTERVIEW', 'REJECTED'],
      TASK_UNDER_REVIEW: ['SECOND_INTERVIEW', 'INTERVIEW', 'REJECTED'],
      SECOND_INTERVIEW: ['INTERVIEW_COMPLETED', 'SELECTED', 'REJECTED'],
      INTERVIEW: ['INTERVIEW_COMPLETED', 'SELECTED', 'REJECTED'],
      INTERVIEW_COMPLETED: ['SELECTED', 'REJECTED'],
      SELECTED: [],
      REJECTED: [],
      WAITLISTED: ['SELECTED', 'REJECTED']
    };

    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    if (oldStatus !== newStatus && !allowed.includes(newStatus)) {
      const err = new Error(`Invalid state transition: Cannot transition application from ${oldStatus} to ${newStatus}`);
      err.status = 400;
      throw err;
    }

    const updateSql = `UPDATE applications SET status = ?, updated_at = NOW() WHERE id = ?`;
    const historySql = `
      INSERT INTO application_status_history (application_id, old_status, new_status, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?)
    `;

    if (conn) {
      await conn.execute(updateSql, [newStatus, id]);
      await conn.execute(historySql, [id, oldStatus, newStatus, changedBy, remarks]);
    } else {
      await db.query(updateSql, [newStatus, id]);
      await db.query(historySql, [id, oldStatus, newStatus, changedBy, remarks]);
    }

    return { id, status: newStatus, oldStatus, newStatus };
  }

  static async getStatusHistory(applicationId) {
    const sql = `
      SELECT h.*, u.full_name AS changed_by_name, u.role AS changed_by_role
      FROM application_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.application_id = ?
      ORDER BY h.created_at ASC
    `;
    return await db.query(sql, [applicationId]);
  }
}

module.exports = ApplicationModel;
