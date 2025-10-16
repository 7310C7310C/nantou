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
  static async createOrUpdate(matchmaker_username, person1_username, person2_username, stars) {
    // 确保 person1_username 始终小于 person2_username，以保证配对的唯一性
    if (person1_username > person2_username) {
      [person1_username, person2_username] = [person2_username, person1_username];
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO matchmaker_recommendations (matchmaker_id, person1_id, person2_id, stars)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         stars = VALUES(stars),
         updated_at = CURRENT_TIMESTAMP`,
        [matchmaker_username, person1_username, person2_username, stars]
      );
      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除配对推荐
   */
  static async delete(matchmaker_username, person1_username, person2_username) {
    // 确保 person1_username 始终小于 person2_username
    if (person1_username > person2_username) {
      [person1_username, person2_username] = [person2_username, person1_username];
    }

    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_username, person1_username, person2_username]
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
  static async getRecommendationsForParticipant(matchmaker_username, participant_username) {
    const connection = await pool.getConnection();
    try {
      // 获取所有异性参与者，包括已配对的推荐信息
      // 已配对的参与者排在前面，按星级降序排列
      // 未配对的参与者按四位数账号排序
      const [rows] = await connection.execute(
        `SELECT 
          p.id, p.username, p.name, p.baptismal_name, p.gender, p.phone, p.is_checked_in,
          p.created_at, p.updated_at,
          mr.id as recommendation_id, mr.stars,
          mr.created_at as recommendation_created_at
        FROM participants p
        LEFT JOIN matchmaker_recommendations mr 
          ON mr.matchmaker_id = ? 
          AND ((mr.person1_id = ? AND mr.person2_id = p.username) OR (mr.person1_id = p.username AND mr.person2_id = ?))
        WHERE p.gender != (SELECT gender FROM participants WHERE username = ?)
          AND p.username != ?
        ORDER BY 
          CASE WHEN mr.id IS NOT NULL THEN 0 ELSE 1 END,
          mr.stars DESC,
          CAST(p.username AS UNSIGNED) ASC`,
        [matchmaker_username, participant_username, participant_username, participant_username, participant_username]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取红娘的所有配对推荐
   */
  static async getMatchmakerRecommendations(matchmaker_username) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          mr.id, mr.stars, mr.created_at, mr.updated_at,
          p1.id as person1_internal_id, p1.username as person1_username, p1.name as person1_name, 
          p1.baptismal_name as person1_baptismal_name, p1.gender as person1_gender,
          p2.id as person2_internal_id, p2.username as person2_username, p2.name as person2_name, 
          p2.baptismal_name as person2_baptismal_name, p2.gender as person2_gender
        FROM matchmaker_recommendations mr
        INNER JOIN participants p1 ON mr.person1_id = p1.username
        INNER JOIN participants p2 ON mr.person2_id = p2.username
        WHERE mr.matchmaker_id = ?
        ORDER BY mr.created_at DESC`,
        [matchmaker_username]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * 检查配对是否存在
   */
  static async exists(matchmaker_username, person1_username, person2_username) {
    // 确保 person1_username 始终小于 person2_username
    if (person1_username > person2_username) {
      [person1_username, person2_username] = [person2_username, person1_username];
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_username, person1_username, person2_username]
      );
      return rows.length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取特定配对的详细信息
   */
  static async getRecommendation(matchmaker_username, person1_username, person2_username) {
    // 确保 person1_username 始终小于 person2_username
    if (person1_username > person2_username) {
      [person1_username, person2_username] = [person2_username, person1_username];
    }

    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM matchmaker_recommendations WHERE matchmaker_id = ? AND person1_id = ? AND person2_id = ?',
        [matchmaker_username, person1_username, person2_username]
      );
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取所有红娘的配对统计
   * 返回每一对参与者及其所有红娘配对的星数总和、红娘人数
   */
  static async getAllMatchmakingStats() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          mr.person1_id,
          mr.person2_id,
          p1.id as person1_participant_id,
          p1.name as person1_name,
          p1.baptismal_name as person1_baptismal_name,
          p1.gender as person1_gender,
          pp1.photo_url as person1_photo,
          p2.id as person2_participant_id,
          p2.name as person2_name,
          p2.baptismal_name as person2_baptismal_name,
          p2.gender as person2_gender,
          pp2.photo_url as person2_photo,
          SUM(mr.stars) as total_stars,
          COUNT(DISTINCT mr.matchmaker_id) as matchmaker_count,
          GROUP_CONCAT(DISTINCT s.username ORDER BY s.username SEPARATOR ', ') as matchmakers
        FROM matchmaker_recommendations mr
        INNER JOIN participants p1 ON mr.person1_id = p1.username
        INNER JOIN participants p2 ON mr.person2_id = p2.username
        LEFT JOIN participant_photos pp1 ON pp1.participant_id = p1.id AND pp1.is_primary = 1
        LEFT JOIN participant_photos pp2 ON pp2.participant_id = p2.id AND pp2.is_primary = 1
        LEFT JOIN staff_users s ON mr.matchmaker_id = s.username
        GROUP BY mr.person1_id, mr.person2_id, p1.id, p1.name, p1.baptismal_name, p1.gender, pp1.photo_url,
                 p2.id, p2.name, p2.baptismal_name, p2.gender, pp2.photo_url
        ORDER BY total_stars DESC, mr.person1_id, mr.person2_id`
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取按红娘分组的配对统计
   */
  static async getMatchmakingStatsByMatchmaker() {
    const connection = await pool.getConnection();
    try {
      // 先获取所有红娘账号
      const [matchmakers] = await connection.execute(
        `SELECT username 
         FROM staff_users 
         WHERE role = 'matchmaker'
         ORDER BY username`
      );

      // 获取每个红娘的配对统计
      const [stats] = await connection.execute(
        `SELECT 
          mr.matchmaker_id,
          COUNT(DISTINCT CONCAT(mr.person1_id, '-', mr.person2_id)) as match_count
        FROM matchmaker_recommendations mr
        GROUP BY mr.matchmaker_id`
      );

      // 创建一个映射，方便查找每个红娘的配对数
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.matchmaker_id] = stat.match_count;
      });

      // 合并数据，确保所有红娘都被列出
      const result = matchmakers.map(m => ({
        matchmaker_username: m.username,
        match_count: statsMap[m.username] || 0
      }));

      // 按配对数降序排序
      result.sort((a, b) => b.match_count - a.match_count);

      return result;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取某个红娘的所有配对详情
   */
  static async getMatchmakerPairings(matchmaker_username) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT 
          mr.person1_id,
          mr.person2_id,
          mr.stars,
          p1.id as person1_participant_id,
          p1.name as person1_name,
          p1.baptismal_name as person1_baptismal_name,
          p1.gender as person1_gender,
          pp1.photo_url as person1_photo,
          p2.id as person2_participant_id,
          p2.name as person2_name,
          p2.baptismal_name as person2_baptismal_name,
          p2.gender as person2_gender,
          pp2.photo_url as person2_photo
        FROM matchmaker_recommendations mr
        INNER JOIN participants p1 ON mr.person1_id = p1.username
        INNER JOIN participants p2 ON mr.person2_id = p2.username
        LEFT JOIN participant_photos pp1 ON pp1.participant_id = p1.id AND pp1.is_primary = 1
        LEFT JOIN participant_photos pp2 ON pp2.participant_id = p2.id AND pp2.is_primary = 1
        WHERE mr.matchmaker_id = ?
        ORDER BY mr.stars DESC, mr.person1_id, mr.person2_id`,
        [matchmaker_username]
      );
      return rows;
    } finally {
      connection.release();
    }
  }
}

module.exports = MatchmakerRecommendation;
