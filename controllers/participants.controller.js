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
    

    
    let participants;
    
    // 简化查询，先测试基本功能
    const [rows] = await pool.execute(`
      SELECT 
        p.id,
        p.username,
        p.name,
        p.baptismal_name,
        p.gender,
        p.created_at,
        COUNT(pp.id) as photo_count
      FROM participants p
      LEFT JOIN participant_photos pp ON p.id = pp.participant_id
      WHERE p.gender = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [genderParam]);
    participants = rows;

    // 获取每个参与者的主图
    const participantsWithPhotos = await Promise.all(participants.map(async (participant) => {
      const [photos] = await pool.execute(`
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



    logger.info('首页获取参与者列表', { 
      gender: genderParam, 
      page: pageNum, 
      limit: limitNum, 
      search, 
      count: participantsWithPhotos.length 
    });

    res.json({
      success: true,
      data: {
        participants: participantsWithPhotos,
        pagination: {
          page: 0,
          limit: participantsWithPhotos.length,
          total: participantsWithPhotos.length,
          hasMore: false
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
