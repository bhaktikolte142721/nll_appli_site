const db = require('../config/db');

class UserModel {
  static async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const rows = await db.query(sql, [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const sql = `SELECT id, full_name, email, phone, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1`;
    const rows = await db.query(sql, [id]);
    return rows[0] || null;
  }

  static async create({ full_name, email, password_hash, phone = null, role = 'candidate' }) {
    const sql = `
      INSERT INTO users (full_name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    const result = await db.query(sql, [full_name, email, password_hash, phone, role]);
    return {
      id: result.insertId,
      full_name,
      email,
      phone,
      role
    };
  }

  static async getAllCandidates() {
    const sql = `
      SELECT id, full_name, email, phone, role, created_at 
      FROM users 
      WHERE role = 'candidate' 
      ORDER BY created_at DESC
    `;
    return await db.query(sql);
  }
}

module.exports = UserModel;
