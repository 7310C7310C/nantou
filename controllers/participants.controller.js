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
    let pinnedParticipants = [];
    let normalParticipants = [];
    
    // 执行查询
    if (search && /^\d+$/.test(search)) {
      // 有搜索条件时，不考虑置顶，直接按搜索结果返回
      const params1 = [genderParam, `%${search}%`, limitNumInt, offsetInt];
      const [rows] = await pool.query(`
        SELECT 
          p.id,
          p.username,
          p.name,
          p.baptismal_name,
          p.gender,
          p.is_pinned,
          p.created_at
        FROM participants p
        WHERE p.gender = ? AND p.username LIKE ?
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `, params1);
      participants = rows;
    } else {
      // 无搜索条件时，置顶用户优先显示
      
      // 先获取置顶用户总数（用于计算分页）
      const [pinnedCountResult] = await pool.query(`
        SELECT COUNT(*) as count
        FROM participants p
        WHERE p.gender = ? AND p.is_pinned = 1
      `, [genderParam]);
      const totalPinnedCount = pinnedCountResult[0].count;
      
      // 1. 查询所有置顶用户（仅第一页需要）
      if (pageNum === 0) {
        const [pinnedRows] = await pool.query(`
          SELECT 
            p.id,
            p.username,
            p.name,
            p.baptismal_name,
            p.gender,
            p.is_pinned,
            p.created_at
          FROM participants p
          WHERE p.gender = ? AND p.is_pinned = 1
          ORDER BY p.created_at DESC
        `, [genderParam]);
        
        // 置顶用户按创建时间倒序显示，不再随机打乱
        pinnedParticipants = pinnedRows;
      }
      
      // 2. 查询非置顶用户（考虑分页）
      let normalLimit = limitNumInt;
      let normalOffset = 0;
      
      if (pageNum === 0) {
        // 第一页：返回置顶用户后的剩余空间
        normalLimit = limitNumInt - pinnedParticipants.length;
        normalOffset = 0;
      } else {
        // 第二页及之后：返回完整的 limit 数量
        // offset 需要减去第一页中置顶用户占用的空间
        normalLimit = limitNumInt;
        normalOffset = pageNum * limitNumInt - totalPinnedCount;
      }
      
      if (normalLimit > 0 && normalOffset >= 0) {
        const [normalRows] = await pool.query(`
          SELECT 
            p.id,
            p.username,
            p.name,
            p.baptismal_name,
            p.gender,
            p.is_pinned,
            p.created_at
          FROM participants p
          WHERE p.gender = ? AND p.is_pinned = 0
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `, [genderParam, normalLimit, normalOffset]);
        normalParticipants = normalRows;
      }
      
      // 3. 合并置顶和非置顶用户
      participants = [...pinnedParticipants, ...normalParticipants];
    }
    
  // 继续处理参与者数据

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
