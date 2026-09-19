const db = require('../config/db');

function formatMySqlDatetime(d) {
  if (!d) return null;
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  const pad = (n) => (n < 10 ? '0' + n : n);
  const Y = dateObj.getFullYear();
  const M = pad(dateObj.getMonth() + 1);
  const D = pad(dateObj.getDate());
  const h = pad(dateObj.getHours());
  const m = pad(dateObj.getMinutes());
  const s = pad(dateObj.getSeconds());
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

class InterviewModel {
  static async create({
    application_id,
    scheduled_at,
    interviewer_id = null,
    round = 'SECOND_INTERVIEW',
    notes = null
  }, conn = null) {
    const formattedDatetime = formatMySqlDatetime(scheduled_at);
    const sql = `
      INSERT INTO interviews (application_id, scheduled_at, interviewer_id, round, notes, status, result)
      VALUES (?, ?, ?, ?, ?, 'SCHEDULED', 'PENDING')
    `;
    const params = [application_id, formattedDatetime, interviewer_id, round, notes];

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
      scheduled_at,
      interviewer_id,
      round,
      notes,
      status: 'SCHEDULED',
      result: 'PENDING'
    };
  }

  static async findById(id, conn = null) {
    const sql = `
      SELECT i.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.domain AS candidate_domain,
             a.user_id AS candidate_user_id,
             u.full_name AS interviewer_name
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      LEFT JOIN users u ON i.interviewer_id = u.id
      WHERE i.id = ?
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

  static async findByApplicationId(applicationId) {
    const sql = `
      SELECT i.*, u.full_name AS interviewer_name
      FROM interviews i
      LEFT JOIN users u ON i.interviewer_id = u.id
      WHERE i.application_id = ?
      ORDER BY i.scheduled_at DESC
    `;
    return await db.query(sql, [applicationId]);
  }

  static async findByCandidateId(candidateUserId) {
    const sql = `
      SELECT i.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.domain AS candidate_domain,
             u.full_name AS interviewer_name
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      LEFT JOIN users u ON i.interviewer_id = u.id
      WHERE a.user_id = ?
      ORDER BY i.scheduled_at DESC
    `;
    return await db.query(sql, [candidateUserId]);
  }

  static async list({
    status = null,
    date = null,
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
      conditions.push('i.status = ?');
      params.push(status);
    }
    if (date) {
      conditions.push('DATE(i.scheduled_at) = ?');
      params.push(date);
    }
    if (applicationId) {
      conditions.push('i.application_id = ?');
      params.push(applicationId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS total FROM interviews i ${whereClause}`;
    const countRows = await db.query(countSql, params);
    const total = countRows[0].total;
    const totalPages = Math.ceil(total / limit) || 1;

    const dataSql = `
      SELECT i.*, 
             a.full_name AS candidate_name, 
             a.email AS candidate_email,
             a.domain AS candidate_domain,
             u.full_name AS interviewer_name
      FROM interviews i
      JOIN applications a ON i.application_id = a.id
      LEFT JOIN users u ON i.interviewer_id = u.id
      ${whereClause}
      ORDER BY i.scheduled_at DESC
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

  static async update(id, updateData, conn = null) {
    const fields = [];
    const params = [];

    if (updateData.scheduled_at !== undefined) {
      fields.push('scheduled_at = ?');
      params.push(updateData.scheduled_at);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      params.push(updateData.status);
    }
    if (updateData.score !== undefined) {
      fields.push('score = ?');
      params.push(updateData.score);
    }
    if (updateData.notes !== undefined) {
      fields.push('notes = ?');
      params.push(updateData.notes);
    }
    if (updateData.result !== undefined) {
      fields.push('result = ?');
      params.push(updateData.result);
    }

    if (fields.length === 0) return await this.findById(id);

    const sql = `UPDATE interviews SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`;
    params.push(id);

    if (conn) {
      await conn.execute(sql, params);
    } else {
      await db.query(sql, params);
    }

    return await this.findById(id, conn);
  }
}

module.exports = InterviewModel;
