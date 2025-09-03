const { pool } = require('../config/database');

class MatchmakerRecommendation {
  constructor({ id, matchmaker_id, person1_id, person2_id, stars, created_at, updated_at }) {
    this.id = id;
    this.matchmaker_id = matchmaker_id;
    this.person1_id = person1_id;
    this.person2_id = person2_id;
    this.stars = stars;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  /**
   * 创建或更新配对推荐
   */
  static async createOrUpdate(matchmaker_id, person1_id, person2_id, stars) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO matchmaker_recommendations (matchmaker_id, person1_id, person2_id, stars)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         stars = VALUES(stars),
         updated_at = CURRENT_TIMESTAMP`,
        [matchmaker_id, person1_id, person2_id, stars]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除配对推荐
   */
  static async delete(matchmaker_id, person1_id, person2_id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_id, person1_id, person2_id]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据ID删除配对推荐
   */
  static async deleteById(id) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM matchmaker_recommendations WHERE id = ?',
        [id]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取某个参与者的所有配对推荐（针对特定红娘）
   */
  static async getRecommendationsForParticipant(matchmaker_id, participant_id) {
    const connection = await pool.getConnection();
    try {
      // 获取所有异性参与者，包括已配对的推荐信息
      const [rows] = await connection.execute(
        `SELECT 
          p.id, p.username, p.name, p.baptismal_name, p.gender, p.phone, p.is_checked_in,
          p.created_at, p.updated_at,
          mr.id as recommendation_id, mr.stars,
          mr.created_at as recommendation_created_at
        FROM participants p
        LEFT JOIN matchmaker_recommendations mr 
          ON mr.matchmaker_id = ? 
          AND ((mr.person1_id = ? AND mr.person2_id = p.id) 
               OR (mr.person2_id = ? AND mr.person1_id = p.id))
        WHERE p.id != ? 
          AND p.gender != (SELECT gender FROM participants WHERE id = ?)
        ORDER BY 
          CASE WHEN mr.id IS NOT NULL THEN 0 ELSE 1 END,
          mr.stars DESC,
          p.name ASC`,
        [matchmaker_id, participant_id, participant_id, participant_id, participant_id]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取红娘的所有配对推荐
   */
  static async getMatchmakerRecommendations(matchmaker_id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          mr.id, mr.stars, mr.created_at, mr.updated_at,
          p1.id as person1_id, p1.username as person1_username, p1.name as person1_name, 
          p1.baptismal_name as person1_baptismal_name, p1.gender as person1_gender,
          p2.id as person2_id, p2.username as person2_username, p2.name as person2_name, 
          p2.baptismal_name as person2_baptismal_name, p2.gender as person2_gender
        FROM matchmaker_recommendations mr
        JOIN participants p1 ON mr.person1_id = p1.id
        JOIN participants p2 ON mr.person2_id = p2.id
        WHERE mr.matchmaker_id = ?
        ORDER BY mr.created_at DESC`,
        [matchmaker_id]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查配对是否存在
   */
  static async exists(matchmaker_id, person1_id, person2_id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_id, person1_id, person2_id]
      );
      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取特定配对的详细信息
   */
  static async getRecommendation(matchmaker_id, person1_id, person2_id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_id, person1_id, person2_id]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }
}

module.exports = MatchmakerRecommendation;
