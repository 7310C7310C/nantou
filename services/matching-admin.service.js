/**
 * 匹配算法管理服务
 * 负责执行分组匹配和聊天匹配算法
 */

const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { generateGroups, generateChatLists } = require('./matching.service');

/**
 * 获取所有已签到的参与者
 * @returns {Array} 已签到参与者列表 (格式: {id: username, gender: gender})
 */
async function getCheckedInParticipants() {
  const [rows] = await pool.execute(`
    SELECT username, gender 
    FROM participants 
    WHERE is_checked_in = 1
  `);
  
  return rows.map(row => ({
    id: row.username, // 算法需要的id字段使用username
    gender: row.gender
  }));
}

/**
 * 获取有效的用户选择数据（只包含已签到用户的选择）
 * @returns {Object} 选择数据对象 {user_id: [{target_id, priority}, ...]}
 */
async function getValidSelections() {
  // 获取所有已签到用户的ID
  const [checkedInUsers] = await pool.execute(`
    SELECT id, username 
    FROM participants 
    WHERE is_checked_in = 1
  `);
  
  const checkedInUserIds = checkedInUsers.map(u => u.id);
  const checkedInUsernames = checkedInUsers.map(u => u.username);
  
  if (checkedInUserIds.length === 0) {
    return {};
  }
  
  // 获取选择数据，只保留选择者和被选择者都已签到的记录
  const placeholders = checkedInUserIds.map(() => '?').join(',');
  const [selections] = await pool.execute(`
    SELECT s.user_id, s.target_id, s.priority, 
           u1.username as user_username, u2.username as target_username
    FROM selections s
    JOIN participants u1 ON s.user_id = u1.id
    JOIN participants u2 ON s.target_id = u2.id
    WHERE s.user_id IN (${placeholders}) 
      AND s.target_id IN (${placeholders})
      AND u1.is_checked_in = 1 
      AND u2.is_checked_in = 1
    ORDER BY s.user_id, s.priority
  `, [...checkedInUserIds, ...checkedInUserIds]);
  
  // 转换为算法需要的格式 {user_username: [{id: target_username, priority}, ...]}
  const selectionsData = {};
  
  selections.forEach(row => {
    const userId = row.user_username; // 使用username作为key，与participants的id保持一致
    if (!selectionsData[userId]) {
      selectionsData[userId] = [];
    }
    selectionsData[userId].push({
      id: row.target_username, // 使用target_username，保持与算法期望的格式一致
      priority: row.priority
    });
  });
  
  return selectionsData;
}

/**
 * 获取有效的红娘推荐数据（只包含已签到用户的推荐）
 * @returns {Array} 推荐数据数组
 */
async function getValidMatchmakerPicks() {
  // 获取已签到用户的用户名列表
  const [checkedInUsers] = await pool.execute(`
    SELECT username 
    FROM participants 
    WHERE is_checked_in = 1
  `);
  
  const checkedInUsernames = checkedInUsers.map(u => u.username);
  
  if (checkedInUsernames.length === 0) {
    return [];
  }
  
  // 获取推荐数据，只保留被推荐的双方都已签到的记录
  const placeholders = checkedInUsernames.map(() => '?').join(',');
  const [picks] = await pool.execute(`
    SELECT person1_id, person2_id, stars, matchmaker_id
    FROM matchmaker_recommendations
    WHERE person1_id IN (${placeholders}) 
      AND person2_id IN (${placeholders})
  `, [...checkedInUsernames, ...checkedInUsernames]);
  
  return picks;
}

/**
 * 获取所有已完成聊天的历史记录
 * @returns {Array} 已完成的聊天记录 [{user_id, target_id}, ...]
 */
async function getCompletedChatHistory() {
  const [rows] = await pool.execute(`
    SELECT user_id, target_id 
    FROM chat_lists 
    WHERE is_completed = 1
  `);
  
  return rows;
}

/**
 * 检查所有已签到用户是否都有足够的选择记录
 * @returns {Object} {isValid: boolean, missingUsers: Array}
 */
async function validateUserSelections() {
  const checkedInParticipants = await getCheckedInParticipants();
  const validSelections = await getValidSelections();
  
  // 获取用户ID到用户名的映射
  const [userMapping] = await pool.execute(`
    SELECT id, username, name, baptismal_name, gender
    FROM participants 
    WHERE is_checked_in = 1
  `);
  
  // 如果没有已签到的参与者，返回无效
  if (userMapping.length === 0) {
    return {
      isValid: false,
      missingUsers: [],
      noCheckedInUsers: true
    };
  }
  
  const userMap = {};
  userMapping.forEach(user => {
    userMap[user.id] = {
      username: user.username,
      name: user.name,
      baptismal_name: user.baptismal_name,
      gender: user.gender
    };
  });
  
  const missingUsers = [];
  
  userMapping.forEach(user => {
    const userSelections = validSelections[user.username] || [];
    if (userSelections.length < 7) {
      missingUsers.push({
        id: user.id,
        username: user.username,
        name: user.name,
        baptismal_name: user.baptismal_name,
        gender: user.gender,
        currentSelections: userSelections.length
      });
    }
  });
  
  return {
    isValid: missingUsers.length === 0,
    missingUsers: missingUsers
  };
}

/**
 * 获取下一个轮次号（分组匹配）
 * @returns {number} 下一轮次号
 */
async function getNextGroupingBatch() {
  const [rows] = await pool.execute(`
    SELECT MAX(run_batch) as max_batch 
    FROM grouping_results
  `);
  
  const maxBatch = rows[0].max_batch || 0;
  return maxBatch + 1;
}

/**
 * 获取下一个轮次号（聊天匹配）
 * @returns {number} 下一轮次号
 */
async function getNextChatBatch() {
  const [rows] = await pool.execute(`
    SELECT MAX(run_batch) as max_batch 
    FROM chat_lists
  `);
  
  const maxBatch = rows[0].max_batch || 0;
  return maxBatch + 1;
}

/**
 * 执行分组匹配算法
 * @param {Object} options 配置选项 {group_size_male, group_size_female}
 * @returns {Object} 执行结果
 */
async function executeGroupMatching(options) {
  try {
    // 验证用户选择
    const validation = await validateUserSelections();
    if (!validation.isValid) {
      // 如果没有已签到的用户
      if (validation.noCheckedInUsers) {
        return {
          success: false,
          message: '没有已签到的参与者'
        };
      }
      // 如果有用户未完成选择
      return {
        success: false,
        message: '存在未完成选择的用户',
        missingUsers: validation.missingUsers
      };
    }
    
    // 获取算法输入数据
    const participants = await getCheckedInParticipants();
    const selections = await getValidSelections();
    const matchmakerPicks = await getValidMatchmakerPicks();
    
    if (participants.length === 0) {
      return {
        success: false,
        message: '没有已签到的参与者'
      };
    }
    
    // 获取轮次号（提前获取以便日志记录）
    const runBatch = await getNextGroupingBatch();
    
    // 记录统计信息到日志
    const inputInfo = {
      participants_count: participants.length,
      male_count: participants.filter(p => p.gender === 'male').length,
      female_count: participants.filter(p => p.gender === 'female').length,
      selections_count: Object.keys(selections).length,
      matchmaker_picks_count: matchmakerPicks.length,
      options: options
    };
    
    logger.info('执行分组匹配算法', { input: inputInfo });
    
    // 记录详细的输入数据到日志（用于研究回顾）
    logger.info(`[分组匹配 #${runBatch}] 算法配置选项`, { options });
    logger.info(`[分组匹配 #${runBatch}] 参与者列表`, { participants });
    logger.info(`[分组匹配 #${runBatch}] 用户选择数据`, { selections });
    logger.info(`[分组匹配 #${runBatch}] 红娘推荐数据`, { matchmakerPicks });
    
    // 调用算法
    const result = generateGroups(participants, selections, matchmakerPicks, options);
    
    // 保存结果到数据库
    for (const group of result.groups) {
      await pool.execute(`
        INSERT INTO grouping_results (run_batch, group_id, male_ids, female_ids)
        VALUES (?, ?, ?, ?)
      `, [
        runBatch,
        group.group_id,
        JSON.stringify(group.male_ids),
        JSON.stringify(group.female_ids)
      ]);
    }
    
    logger.info('分组匹配算法执行成功', { 
      run_batch: runBatch, 
      groups_count: result.groups.length,
      result: result
    });
    
    return {
      success: true,
      message: `第 ${runBatch} 轮分组匹配执行成功`,
      runBatch: runBatch,
      groupsCount: result.groups.length,
      result: result
    };
    
  } catch (error) {
    logger.error('执行分组匹配算法失败', error);
    throw error;
  }
}

/**
 * 执行聊天匹配算法
 * @param {Object} options 配置选项 {list_size}
 * @returns {Object} 执行结果
 */
async function executeChatMatching(options) {
  try {
    // 验证用户选择
    const validation = await validateUserSelections();
    if (!validation.isValid) {
      // 如果没有已签到的用户
      if (validation.noCheckedInUsers) {
        return {
          success: false,
          message: '没有已签到的参与者'
        };
      }
      // 如果有用户未完成选择
      return {
        success: false,
        message: '存在未完成选择的用户',
        missingUsers: validation.missingUsers
      };
    }
    
    // 获取算法输入数据
    const participants = await getCheckedInParticipants();
    const selections = await getValidSelections();
    const matchmakerPicks = await getValidMatchmakerPicks();
    
    if (participants.length === 0) {
      return {
        success: false,
        message: '没有已签到的参与者'
      };
    }
    
    // 获取已完成聊天的历史记录
    const completedChatHistory = await getCompletedChatHistory();
    
    // 获取轮次号（提前获取以便日志记录）
    const runBatch = await getNextChatBatch();
    
    // 记录统计信息到日志
    const inputInfo = {
      participants_count: participants.length,
      male_count: participants.filter(p => p.gender === 'male').length,
      female_count: participants.filter(p => p.gender === 'female').length,
      selections_count: Object.keys(selections).length,
      matchmaker_picks_count: matchmakerPicks.length,
      completed_chat_history_count: completedChatHistory.length,
      options: options
    };
    
    logger.info('执行聊天匹配算法', { input: inputInfo });
    
    // 记录详细的输入数据到日志（用于研究回顾）
    logger.info(`[聊天匹配 #${runBatch}] 算法配置选项`, { options });
    logger.info(`[聊天匹配 #${runBatch}] 参与者列表`, { participants });
    logger.info(`[聊天匹配 #${runBatch}] 用户选择数据`, { selections });
    logger.info(`[聊天匹配 #${runBatch}] 红娘推荐数据`, { matchmakerPicks });
    logger.info(`[聊天匹配 #${runBatch}] 已完成聊天历史`, { completedChatHistory });
    
    // 调用算法，传入已完成聊天历史
    const result = generateChatLists(participants, selections, matchmakerPicks, options, completedChatHistory);
    
    // 将chatLists对象转换为数组格式
    const chatItemsArray = [];
    for (const [userId, targetIds] of Object.entries(result.chatLists)) {
      for (const targetId of targetIds) {
        chatItemsArray.push({
          user_id: userId,
          target_id: targetId
        });
      }
    }
    
    // 保存结果到数据库
    for (const chatItem of chatItemsArray) {
      await pool.execute(`
        INSERT INTO chat_lists (run_batch, user_id, target_id)
        VALUES (?, ?, ?)
      `, [
        runBatch,
        chatItem.user_id,
        chatItem.target_id
      ]);
    }
    
    logger.info('聊天匹配算法执行成功', { 
      run_batch: runBatch, 
      chat_items_count: chatItemsArray.length,
      participants_count: participants.length
    });
    
    return {
      success: true,
      message: `第 ${runBatch} 轮聊天匹配执行成功`,
      runBatch: runBatch,
      chatItemsCount: result.chatLists.length,
      result: result
    };
    
  } catch (error) {
    logger.error('执行聊天匹配算法失败', error);
    throw error;
  }
}

/**
 * 获取分组匹配历史结果
 * @returns {Array} 轮次列表
 */
async function getGroupingHistory() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT run_batch, 
           COUNT(*) as groups_count,
           MIN(created_at) as created_at
    FROM grouping_results 
    GROUP BY run_batch 
    ORDER BY run_batch DESC
  `);
  
  return rows;
}

/**
 * 获取聊天匹配历史结果
 * @returns {Array} 轮次列表
 */
async function getChatHistory() {
  const [rows] = await pool.execute(`
    SELECT DISTINCT run_batch,
           COUNT(*) as chat_items_count,
           MIN(created_at) as created_at
    FROM chat_lists 
    GROUP BY run_batch 
    ORDER BY run_batch DESC
  `);
  
  return rows;
}

/**
 * 获取指定轮次的分组匹配结果
 * @param {number} runBatch 轮次号
 * @returns {Array} 分组结果
 */
async function getGroupingResult(runBatch) {
  const [rows] = await pool.execute(`
    SELECT group_id, male_ids, female_ids, created_at
    FROM grouping_results 
    WHERE run_batch = ?
    ORDER BY group_id
  `, [runBatch]);
  
  // 获取所有涉及的用户名
  const allUsernames = new Set();
  rows.forEach(row => {
    const maleIds = JSON.parse(row.male_ids);
    const femaleIds = JSON.parse(row.female_ids);
    maleIds.forEach(username => allUsernames.add(username));
    femaleIds.forEach(username => allUsernames.add(username));
  });
  
  // 获取用户名到姓名的映射
  const userNameMap = {};
  if (allUsernames.size > 0) {
    const placeholders = Array.from(allUsernames).map(() => '?').join(',');
    const [userRows] = await pool.execute(`
      SELECT username, name, baptismal_name
      FROM participants 
      WHERE username IN (${placeholders})
    `, Array.from(allUsernames));
    
    userRows.forEach(user => {
      userNameMap[user.username] = user.name || user.baptismal_name || user.username;
    });
  }
  
  return rows.map(row => ({
    group_id: row.group_id,
    male_ids: JSON.parse(row.male_ids),
    female_ids: JSON.parse(row.female_ids),
    male_members: JSON.parse(row.male_ids).map(username => ({
      username,
      name: userNameMap[username] || username
    })),
    female_members: JSON.parse(row.female_ids).map(username => ({
      username,
      name: userNameMap[username] || username
    })),
    created_at: row.created_at
  }));
}

/**
 * 获取指定轮次的聊天匹配结果
 * @param {number} runBatch 轮次号
 * @returns {Array} 聊天结果
 */
async function getChatResult(runBatch) {
  const [rows] = await pool.execute(`
    SELECT user_id, target_id, is_completed, created_at
    FROM chat_lists 
    WHERE run_batch = ?
    ORDER BY user_id
  `, [runBatch]);
  
  // 获取所有涉及的用户名
  const allUsernames = new Set();
  rows.forEach(row => {
    allUsernames.add(row.user_id);
    allUsernames.add(row.target_id);
  });
  
  // 获取用户名到姓名的映射
  const userNameMap = {};
  if (allUsernames.size > 0) {
    const placeholders = Array.from(allUsernames).map(() => '?').join(',');
    const [userRows] = await pool.execute(`
      SELECT username, name, baptismal_name
      FROM participants 
      WHERE username IN (${placeholders})
    `, Array.from(allUsernames));
    
    userRows.forEach(user => {
      userNameMap[user.username] = user.name || user.baptismal_name || user.username;
    });
  }
  
  return rows.map(row => ({
    user_id: row.user_id,
    user_name: userNameMap[row.user_id] || row.user_id,
    target_id: row.target_id,
    target_name: userNameMap[row.target_id] || row.target_id,
    is_completed: row.is_completed,
    created_at: row.created_at
  }));
}

/**
 * 预览分组匹配算法（不写入数据库）
 * @param {Object} options 配置选项 {group_size_male, group_size_female}
 * @returns {Object} 预览结果
 */
async function previewGroupMatching(options) {
  try {
    // 验证用户选择
    const validation = await validateUserSelections();
    if (!validation.isValid) {
      if (validation.noCheckedInUsers) {
        return {
          success: false,
          message: '没有已签到的参与者'
        };
      }
      return {
        success: false,
        message: '存在未完成选择的用户',
        missingUsers: validation.missingUsers
      };
    }
    
    // 获取算法输入数据
    const participants = await getCheckedInParticipants();
    const selections = await getValidSelections();
    const matchmakerPicks = await getValidMatchmakerPicks();
    
    if (participants.length === 0) {
      return {
        success: false,
        message: '没有已签到的参与者'
      };
    }
    
    logger.info('生成分组匹配预览', { 
      participants_count: participants.length,
      options 
    });
    
    // 调用算法（不保存结果）
    const algorithmResult = generateGroups(participants, selections, matchmakerPicks, options);
    
    // 获取所有涉及的用户名
    const allUsernames = new Set();
    algorithmResult.groups.forEach(group => {
      group.male_ids.forEach(username => allUsernames.add(username));
      group.female_ids.forEach(username => allUsernames.add(username));
    });
    
    // 获取用户名到姓名的映射
    const userNameMap = {};
    if (allUsernames.size > 0) {
      const placeholders = Array.from(allUsernames).map(() => '?').join(',');
      const [userRows] = await pool.execute(`
        SELECT username, name, baptismal_name
        FROM participants 
        WHERE username IN (${placeholders})
      `, Array.from(allUsernames));
      
      userRows.forEach(user => {
        userNameMap[user.username] = user.name || user.baptismal_name || user.username;
      });
    }
    
    // 转换格式，添加 male_members 和 female_members
    const groups = algorithmResult.groups.map(group => ({
      group_id: group.group_id,
      male_ids: group.male_ids,
      female_ids: group.female_ids,
      male_members: group.male_ids.map(username => ({
        username,
        name: userNameMap[username] || username
      })),
      female_members: group.female_ids.map(username => ({
        username,
        name: userNameMap[username] || username
      }))
    }));
    
    return {
      success: true,
      message: '预览生成成功',
      result: {
        groups: groups
      }
    };
    
  } catch (error) {
    logger.error('生成分组匹配预览失败', error);
    throw error;
  }
}

/**
 * 预览聊天匹配算法（不写入数据库）
 * @param {Object} options 配置选项 {list_size}
 * @returns {Object} 预览结果
 */
async function previewChatMatching(options) {
  try {
    // 验证用户选择
    const validation = await validateUserSelections();
    if (!validation.isValid) {
      if (validation.noCheckedInUsers) {
        return {
          success: false,
          message: '没有已签到的参与者'
        };
      }
      return {
        success: false,
        message: '存在未完成选择的用户',
        missingUsers: validation.missingUsers
      };
    }
    
    // 获取算法输入数据
    const participants = await getCheckedInParticipants();
    const selections = await getValidSelections();
    const matchmakerPicks = await getValidMatchmakerPicks();
    
    if (participants.length === 0) {
      return {
        success: false,
        message: '没有已签到的参与者'
      };
    }
    
    // 获取已完成聊天的历史记录
    const completedChatHistory = await getCompletedChatHistory();
    
    logger.info('生成聊天匹配预览', { 
      participants_count: participants.length,
      options 
    });
    
    // 调用算法（不保存结果）
    const algorithmResult = generateChatLists(participants, selections, matchmakerPicks, options, completedChatHistory);
    
    // 获取所有涉及的用户名
    const allUsernames = new Set();
    for (const [userId, targetIds] of Object.entries(algorithmResult.chatLists)) {
      allUsernames.add(userId);
      targetIds.forEach(targetId => allUsernames.add(targetId));
    }
    
    // 获取用户名到姓名的映射
    const userNameMap = {};
    if (allUsernames.size > 0) {
      const placeholders = Array.from(allUsernames).map(() => '?').join(',');
      const [userRows] = await pool.execute(`
        SELECT username, name, baptismal_name
        FROM participants 
        WHERE username IN (${placeholders})
      `, Array.from(allUsernames));
      
      userRows.forEach(user => {
        userNameMap[user.username] = user.name || user.baptismal_name || user.username;
      });
    }
    
    // 转换格式，添加用户名和姓名信息
    const chatLists = {};
    const userNames = {};  // 添加userId到姓名的映射
    for (const [userId, targetIds] of Object.entries(algorithmResult.chatLists)) {
      userNames[userId] = userNameMap[userId] || userId;  // 保存用户的姓名
      chatLists[userId] = targetIds.map(targetId => ({
        target_id: targetId,
        target_name: userNameMap[targetId] || targetId
      }));
    }
    
    return {
      success: true,
      message: '预览生成成功',
      result: {
        chatLists: algorithmResult.chatLists,  // 保持原始格式用于前端显示
        chatListsWithNames: chatLists,  // 带名字的版本
        userNames: userNames  // userId到姓名的映射
      }
    };
    
  } catch (error) {
    logger.error('生成聊天匹配预览失败', error);
    throw error;
  }
}

module.exports = {
  getCheckedInParticipants,
  getValidSelections,
  getValidMatchmakerPicks,
  getCompletedChatHistory,
  validateUserSelections,
  executeGroupMatching,
  executeChatMatching,
  previewGroupMatching,
  previewChatMatching,
  getGroupingHistory,
  getChatHistory,
  getGroupingResult,
  getChatResult
};
