const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 获取参与者列表（公开接口）
 */
async function getParticipants(req, res) {
  try {
    const { gender = 'female', page = 0, limit = 10, search = '' } = req.query;
    const genderParam = gender === 'male' ? 'male' : 'female';
    const pageNum = Math.max(0, parseInt(page) || 0);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10));
    const offset = pageNum * limitNum;
    
    // 确保参数是数字类型
    const limitNumInt = parseInt(limitNum) || 10;
    const offsetInt = parseInt(offset) || 0;
    
    let participants;
    
    // 执行查询
    let rows;
    if (search && /^\d+$/.test(search)) {
      // 有搜索条件
      const params1 = [genderParam, `%${search}%`, limitNumInt, offsetInt];
      [rows] = await pool.query(`
        SELECT 
          p.id,
          p.username,
          p.name,
          p.baptismal_name,
          p.gender,
          p.created_at
        FROM participants p
        WHERE p.gender = ? AND p.username LIKE ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, params1);
    } else {
      // 无搜索条件
      const params2 = [genderParam, limitNumInt, offsetInt];
      [rows] = await pool.query(`
      SELECT 
        p.id,
        p.username,
        p.name,
        p.baptismal_name,
        p.gender,
          p.created_at
      FROM participants p
      WHERE p.gender = ?
      ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, params2);
    }
    
  participants = rows;

    // 获取每个参与者的主图
    const participantsWithPhotos = await Promise.all(participants.map(async (participant) => {
      const [photos] = await pool.query(`
        SELECT 
          id,
          photo_url,
          is_primary,
          sort_order,
          created_at
        FROM participant_photos 
        WHERE participant_id = ?
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC
      `, [participant.id]);

      return {
        ...participant,
        photos: photos
      };
    }));

    // 如果已认证且为参与者，附加收藏标记
    let favoriteIds = [];
    if (req.user && req.user.userType === 'participant') {
      try {
        const [favRows] = await pool.execute('SELECT favorited_participant_id FROM favorites WHERE user_id = ?', [req.user.id]);
        favoriteIds = favRows.map(r => r.favorited_participant_id);
      } catch (e) {
        // 静默失败
      }
    }

    const enriched = participantsWithPhotos.map(p => ({
      ...p,
      is_favorited: favoriteIds.includes(p.id)
    }));

    // 获取总数用于分页
    let totalCount = 0;
    if (search && /^\d+$/.test(search)) {
      const [countRows] = await pool.query(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM participants p
        WHERE p.gender = ? AND p.username LIKE ?
      `, [genderParam, `%${search}%`]);
      totalCount = countRows[0].total;
    } else {
      const [countRows] = await pool.query(`
        SELECT COUNT(DISTINCT p.id) as total
        FROM participants p
        WHERE p.gender = ?
      `, [genderParam]);
      totalCount = countRows[0].total;
    }



    res.json({
      success: true,
      data: {
  participants: enriched,
        pagination: {
          page: pageNum,
          limit: limitNumInt,
          total: totalCount,
          hasMore: (pageNum + 1) * limitNumInt < totalCount
        }
      }
    });
  } catch (error) {
    logger.error('获取参与者列表错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getParticipants
};
