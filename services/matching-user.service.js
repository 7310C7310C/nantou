/**
 * 用户端匹配结果服务
 * 负责为已登录的用户提供匹配结果查看功能
 */

const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 获取用户的分组匹配结果
 * @param {string} username 用户名
 * @param {number} runBatch 轮次号（可选，默认最新轮次）
 * @returns {Object} 分组结果
 */
async function getUserGroupingResult(username, runBatch = null) {
  try {
    // 检查用户是否已签到
    const [userRows] = await pool.execute(`
      SELECT id, username, baptismal_name, gender, is_checked_in
      FROM participants 
      WHERE username = ?
    `, [username]);

    if (userRows.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userRows[0];
    if (!user.is_checked_in) {
      throw new Error('用户未签到，无法查看匹配结果');
    }

    // 如果没有指定轮次，获取最新轮次
    if (runBatch === null) {
      const [batchRows] = await pool.execute(`
        SELECT MAX(run_batch) as max_batch 
        FROM grouping_results
      `);
      
      if (batchRows.length === 0 || batchRows[0].max_batch === null) {
        return {
          success: false,
          message: '暂无分组匹配结果'
        };
      }
      
      runBatch = batchRows[0].max_batch;
    }

    // 查找用户所在的组
    const [groupRows] = await pool.execute(`
      SELECT group_id, male_ids, female_ids, created_at
      FROM grouping_results 
      WHERE run_batch = ?
    `, [runBatch]);

    let userGroup = null;
    for (const group of groupRows) {
      const maleIds = JSON.parse(group.male_ids);
      const femaleIds = JSON.parse(group.female_ids);
      
      if (maleIds.includes(username) || femaleIds.includes(username)) {
        userGroup = {
          group_id: group.group_id,
          male_ids: maleIds,
          female_ids: femaleIds,
          created_at: group.created_at
        };
        break;
      }
    }

    if (!userGroup) {
      return {
        success: false,
        message: `第 ${runBatch} 轮分组中未找到您的分组信息`
      };
    }

    // 获取组员详细信息（包含自己）
    const allMemberUsernames = [...userGroup.male_ids, ...userGroup.female_ids];

    if (allMemberUsernames.length === 0) {
      return {
        success: true,
        data: {
          runBatch: runBatch,
          groupId: userGroup.group_id,
          members: [],
          createdAt: userGroup.created_at
        }
      };
    }

    const placeholders = allMemberUsernames.map(() => '?').join(',');
    const [memberRows] = await pool.execute(`
      SELECT p.id, p.username, p.name, p.baptismal_name, p.gender, ph.photo_url
      FROM participants p
      LEFT JOIN participant_photos ph ON p.id = ph.participant_id AND ph.is_primary = 1
      WHERE p.username IN (${placeholders})
      ORDER BY p.gender, p.name
    `, allMemberUsernames);

    return {
      success: true,
      data: {
        runBatch: runBatch,
        groupId: userGroup.group_id,
        members: memberRows,
        createdAt: userGroup.created_at
      }
    };

  } catch (error) {
    logger.error('获取用户分组匹配结果失败', { username, runBatch, error });
    throw error;
  }
}

/**
 * 获取用户的聊天匹配结果
 * @param {string} username 用户名
 * @param {number} runBatch 轮次号（可选，默认最新轮次）
 * @returns {Object} 聊天结果
 */
async function getUserChatResult(username, runBatch = null) {
  try {
    // 检查用户是否已签到
    const [userRows] = await pool.execute(`
      SELECT id, username, baptismal_name, gender, is_checked_in
      FROM participants 
      WHERE username = ?
    `, [username]);

    if (userRows.length === 0) {
      throw new Error('用户不存在');
    }

    const user = userRows[0];
    if (!user.is_checked_in) {
      throw new Error('用户未签到，无法查看匹配结果');
    }

    // 如果没有指定轮次，获取最新轮次
    if (runBatch === null) {
      const [batchRows] = await pool.execute(`
        SELECT MAX(run_batch) as max_batch 
        FROM chat_lists
      `);
      
      if (batchRows.length === 0 || batchRows[0].max_batch === null) {
        return {
          success: false,
          message: '暂无聊天匹配结果'
        };
      }
      
      runBatch = batchRows[0].max_batch;
    }

    // 获取用户的聊天名单
    const [chatRows] = await pool.execute(`
      SELECT target_id, is_completed, created_at
      FROM chat_lists 
      WHERE run_batch = ? AND user_id = ?
      ORDER BY created_at
    `, [runBatch, username]);

    if (chatRows.length === 0) {
      return {
        success: false,
        message: `第 ${runBatch} 轮聊天匹配中未找到您的推荐名单`
      };
    }

    // 获取推荐对象的详细信息
    const targetUsernames = chatRows.map(row => row.target_id);
    const placeholders = targetUsernames.map(() => '?').join(',');
    
    const [targetRows] = await pool.execute(`
      SELECT p.id, p.username, p.name, p.baptismal_name, p.gender, ph.photo_url
      FROM participants p
      LEFT JOIN participant_photos ph ON p.id = ph.participant_id AND ph.is_primary = 1
      WHERE p.username IN (${placeholders})
      ORDER BY FIELD(p.username, ${placeholders})
    `, [...targetUsernames, ...targetUsernames]);

    // 组合聊天结果
    const chatTargets = chatRows.map(chatRow => {
      const targetInfo = targetRows.find(target => target.username === chatRow.target_id);
      return {
        ...targetInfo,
        is_completed: chatRow.is_completed,
        created_at: chatRow.created_at
      };
    });

    return {
      success: true,
      data: {
        runBatch: runBatch,
        targets: chatTargets,
        createdAt: chatRows[0].created_at
      }
    };

  } catch (error) {
    logger.error('获取用户聊天匹配结果失败', { username, runBatch, error });
    throw error;
  }
}

/**
 * 获取分组匹配历史轮次列表（用户端）
 * @returns {Array} 轮次列表
 */
async function getGroupingBatches() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT run_batch, MIN(created_at) as created_at
    FROM grouping_results 
    GROUP BY run_batch 
    ORDER BY run_batch DESC
  `);
  
  return rows;
}

/**
 * 获取聊天匹配历史轮次列表（用户端）
 * @returns {Array} 轮次列表
 */
async function getChatBatches() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT run_batch, MIN(created_at) as created_at
    FROM chat_lists 
    GROUP BY run_batch 
    ORDER BY run_batch DESC
  `);
  
  return rows;
}

module.exports = {
  getUserGroupingResult,
  getUserChatResult,
  getGroupingBatches,
  getChatBatches
};
