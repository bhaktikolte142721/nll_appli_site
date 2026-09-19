const db = require('../config/db');

class InterviewFeedbackModel {
  // --- QUESTIONS ---
  static async addQuestion(interviewId, question, answer = null) {
    const sql = `
      INSERT INTO interview_questions (interview_id, question, answer)
      VALUES (?, ?, ?)
    `;
    const result = await db.query(sql, [interviewId, question, answer]);
    return {
      id: result.insertId,
      interview_id: interviewId,
      question,
      answer
    };
  }

  static async getQuestions(interviewId) {
    const sql = `
      SELECT * FROM interview_questions 
      WHERE interview_id = ? 
      ORDER BY created_at ASC
    `;
    return await db.query(sql, [interviewId]);
  }

  static async updateQuestion(questionId, question, answer) {
    const fields = [];
    const params = [];
    if (question !== undefined) {
      fields.push('question = ?');
      params.push(question);
    }
    if (answer !== undefined) {
      fields.push('answer = ?');
      params.push(answer);
    }
    if (fields.length === 0) return null;

    params.push(questionId);
    const sql = `UPDATE interview_questions SET ${fields.join(', ')} WHERE id = ?`;
    await db.query(sql, params);

    const rows = await db.query(`SELECT * FROM interview_questions WHERE id = ?`, [questionId]);
    return rows[0] || null;
  }

  static async deleteQuestion(questionId) {
    const sql = `DELETE FROM interview_questions WHERE id = ?`;
    const result = await db.query(sql, [questionId]);
    return result.affectedRows > 0;
  }

  // --- FEEDBACK ---
  static async addFeedback(interviewId, interviewerId, score, feedback) {
    const sql = `
      INSERT INTO interview_feedback (interview_id, interviewer_id, score, feedback)
      VALUES (?, ?, ?, ?)
    `;
    const result = await db.query(sql, [interviewId, interviewerId, score, feedback]);
    return {
      id: result.insertId,
      interview_id: interviewId,
      interviewer_id: interviewerId,
      score,
      feedback
    };
  }

  static async getFeedback(interviewId) {
    const sql = `
      SELECT fb.*, u.full_name AS interviewer_name
      FROM interview_feedback fb
      LEFT JOIN users u ON fb.interviewer_id = u.id
      WHERE fb.interview_id = ?
      ORDER BY fb.created_at ASC
    `;
    return await db.query(sql, [interviewId]);
  }
}

module.exports = InterviewFeedbackModel;
