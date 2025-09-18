const { pool } = require('../config/database');

class SelectionsModel {
  static async add(userId, targetId, priority) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO selections (user_id, target_id, priority) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE priority = VALUES(priority)`,
        [userId, targetId, priority]
      );
      return result.insertId || 0;
    } catch (err) {
      throw err;
    }
  }

  static async remove(userId, targetId) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM selections WHERE user_id = ? AND target_id = ?`,
        [userId, targetId]
      );
      return result.affectedRows > 0;
    } catch (err) {
      throw err;
    }
  }

  static async listByUser(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT s.id, s.user_id, s.target_id, s.priority, s.created_at,
                p.username AS target_username, p.name AS target_name, p.baptismal_name AS target_baptismal,
                pp.photo_url AS target_photo_url
         FROM selections s
         JOIN participants p ON p.id = s.target_id
         LEFT JOIN participant_photos pp ON pp.participant_id = p.id AND pp.is_primary = 1
         WHERE s.user_id = ?
         ORDER BY s.priority ASC`,
        [userId]
      );
      return rows;
    } catch (err) {
      throw err;
    }
  }

  static async updatePriorities(userId, items) {
    // items: [{ target_id, priority }, ...]
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const it of items) {
        await connection.execute(
          `UPDATE selections SET priority = ? WHERE user_id = ? AND target_id = ?`,
          [it.priority, userId, it.target_id]
        );
      }
      await connection.commit();
      return true;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = SelectionsModel;
