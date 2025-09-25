/**
 * 找对象活动分组算法模块
 * 实现核心-卫星滚动分组法
 */

// 引入数据库连接
const { pool } = require('../config/database');

// 调试开关 默认关闭
let DEBUG_ENABLED = false;

/**
 * 调试打印接口
 * @param {...any} args - 要打印的参数
 */
function debugLog(...args) {
    if (DEBUG_ENABLED) {
        console.log(...args);
    }
}

/**
 * 设置调试开关
 * @param {boolean} enabled - 是否启用调试
 */
function setDebugEnabled(enabled) {
    DEBUG_ENABLED = enabled;
}

/**
 * 获取所有用户已聊过的目标用户列表（批量查询）
 * @param {Array<string>} userIds - 用户ID列表
 * @returns {Promise<Object>} 用户ID到已聊用户集合的映射
 */
async function getChattedUsersBatch(userIds) {
  try {
    if (userIds.length === 0) return {};
    
    const query = 'SELECT user_id, target_id FROM chat_lists WHERE user_id IN (' + 
                  userIds.map(() => '?').join(',') + ')';
    const [rows] = await pool.execute(query, userIds);
    
    const result = {};
    userIds.forEach(userId => {
      result[userId] = new Set();
    });
    
    rows.forEach(row => {
      if (result[row.user_id]) {
        result[row.user_id].add(row.target_id);
      }
    });
    
    return result;
  } catch (error) {
    debugLog('error:', '批量查询已聊用户失败:', error);
    return {};
  }
}

// 用户互选打分映射表,最多选10个
const USER_PRIORITY_SCORES = {
    1: 100, // 第1名：100分（最爱）
    2: 90,  // 第2名：90分
    3: 80,  // 第3名：80分
    4: 70,  // 第4名：70分
    5: 65,  // 第5名：65分
    6: 60,  // 第6名：60分
    7: 55,  // 第7名：55分
    8: 50,  // 第8名：50分
    9: 45,  // 第9名：45分
    10: 40,  // 第10名：40分
};

// 红娘星级打分映射表
const MATCHMAKER_STAR_SCORES = {
    5: 100, // 5星：100分（完美推荐）
    4: 90,  // 4星：90分（很看好）
    3: 80,  // 3星：80分（匹配度良好）
    2: 75,  // 2星：75分（符合基本要求）
    1: 70   // 1星：70分（勉强通过）
};

// 权重配置
const WEIGHTS = {
    USER_SELECTION: 0.7,    // 用户选择权重：70%
    MATCHMAKER_PICK: 0.3    // 红娘推荐权重：30%
};

/**
 * 计算单向好感分数
 * @param {number} userPriority - 用户优先级排名
 * @param {number} matchmakerStars - 红娘星级
 * @returns {number} 综合分数
 */
function calculateUnidirectionalScore(userPriority, matchmakerStars) {
    const userScore = USER_PRIORITY_SCORES[userPriority] || 0;
    const matchmakerScore = MATCHMAKER_STAR_SCORES[matchmakerStars] || 0;

    return (userScore * WEIGHTS.USER_SELECTION) + (matchmakerScore * WEIGHTS.MATCHMAKER_PICK);
}

/**
 * 计算纯用户选择分数（不含权重）
 * @param {number} userPriority - 用户优先级排名
 * @returns {number} 用户选择分数
 */
function calculateUserSelectionScore(userPriority) {
    return USER_PRIORITY_SCORES[userPriority] || 0;
}

/**
 * 计算互有好感分数
 * @param {string} person1Id - 人员1的ID
 * @param {string} person2Id - 人员2的ID
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @returns {number} 互有好感分数
 */
function calculateMutualAffinityScore(person1Id, person2Id, selections, matchmakerPicks) {
  // 计算 person1 → person2 的用户选择分数
  let userScore1to2 = 0;
  if (selections[person1Id]) {
    const selection = selections[person1Id].find(s => s.id === person2Id);
    if (selection) {
      userScore1to2 = calculateUserSelectionScore(selection.priority);
    }
  }
  
  // 计算 person2 → person1 的用户选择分数
  let userScore2to1 = 0;
  if (selections[person2Id]) {
    const selection = selections[person2Id].find(s => s.id === person1Id);
    if (selection) {
      userScore2to1 = calculateUserSelectionScore(selection.priority);
    }
  }
  
  // 查找红娘推荐分数
  let matchmakerScore1to2 = 0;
  let matchmakerScore2to1 = 0;
  
  matchmakerPicks.forEach(pick => {
    if (pick.person1_id === person1Id && pick.person2_id === person2Id) {
      matchmakerScore1to2 = MATCHMAKER_STAR_SCORES[pick.stars] || 0;
    }
    if (pick.person1_id === person2Id && pick.person2_id === person1Id) {
      matchmakerScore2to1 = MATCHMAKER_STAR_SCORES[pick.stars] || 0;
    }
  });
  
  // 计算包含权重的最终分数
  const finalScore1to2 = (userScore1to2 * WEIGHTS.USER_SELECTION) + 
                         (matchmakerScore1to2 * WEIGHTS.MATCHMAKER_PICK);
  const finalScore2to1 = (userScore2to1 * WEIGHTS.USER_SELECTION) + 
                         (matchmakerScore2to1 * WEIGHTS.MATCHMAKER_PICK);
  
  // 返回互有好感分数（双向分数相加）
  return finalScore1to2 + finalScore2to1;
}

/**
 * 计算候选人与小组的亲和力总分
 * @param {string} candidateId - 候选人ID
 * @param {Array} groupMemberIds - 小组成员ID列表
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @returns {number} 亲和力总分
 */
function calculateGroupAffinityScore(candidateId, groupMemberIds, selections, matchmakerPicks) {
  let totalAffinity = 0;
  
  for (const memberId of groupMemberIds) {
    totalAffinity += calculateMutualAffinityScore(candidateId, memberId, selections, matchmakerPicks);
  }
  
  return totalAffinity;
}

/**
 * 创建配对分数表
 * @param {Array} males - 男性ID列表
 * @param {Array} females - 女性ID列表
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @returns {Array} 排序后的配对分数表
 */
function createPairScoresTable(males, females, selections, matchmakerPicks) {
  const pairScores = [];
  for (const maleId of males) {
    for (const femaleId of females) {
      const mutualScore = calculateMutualAffinityScore(maleId, femaleId, selections, matchmakerPicks);
      pairScores.push({
        maleId,
        femaleId,
        score: mutualScore
      });
    }
  }
  
  // 按分数从高到低排序
  pairScores.sort((a, b) => b.score - a.score);
  return pairScores;
}

/**
 * 寻找小组核心配对
 * @param {Array} pairScores - 配对分数表
 * @param {Set} assignedParticipants - 已分配参与者集合
 * @returns {Object|null} 核心配对或null
 */
function findCorePair(pairScores, assignedParticipants) {
  for (const pair of pairScores) {
    if (!assignedParticipants.has(pair.maleId) && !assignedParticipants.has(pair.femaleId)) {
      return pair;
    }
  }
  return null;
}

/**
 * 添加核心配对到小组
 * @param {Object} group - 小组对象
 * @param {Object} corePair - 核心配对
 * @param {Set} assignedParticipants - 已分配参与者集合
 */
function addCorePairToGroup(group, corePair, assignedParticipants) {
  group.male_ids.push(corePair.maleId);
  group.female_ids.push(corePair.femaleId);
  assignedParticipants.add(corePair.maleId);
  assignedParticipants.add(corePair.femaleId);
}

/**
 * 添加单个未分配人员到小组
 * @param {Object} group - 小组对象
 * @param {Array} males - 男性ID列表
 * @param {Array} females - 女性ID列表
 * @param {Set} assignedParticipants - 已分配参与者集合
 */
function addUnassignedToGroup(group, males, females, assignedParticipants) {
  const unassignedMales = males.filter(id => !assignedParticipants.has(id));
  const unassignedFemales = females.filter(id => !assignedParticipants.has(id));
  
  if (unassignedMales.length > 0) {
    group.male_ids.push(unassignedMales[0]);
    assignedParticipants.add(unassignedMales[0]);
  }
  if (unassignedFemales.length > 0) {
    group.female_ids.push(unassignedFemales[0]);
    assignedParticipants.add(unassignedFemales[0]);
  }
}

/**
 * 确定需要添加的性别
 * @param {Object} group - 小组对象
 * @param {number} targetMalePerGroup - 目标男性数量
 * @param {number} targetFemalePerGroup - 目标女性数量
 * @returns {string|null} 目标性别或null
 */
function determineTargetGender(group, targetMalePerGroup, targetFemalePerGroup) {
  if (group.male_ids.length < targetMalePerGroup && group.female_ids.length < targetFemalePerGroup) {
    // 如果男女都缺人，优先添加人数较少的性别
    return group.male_ids.length <= group.female_ids.length ? 'male' : 'female';
  } else if (group.male_ids.length < targetMalePerGroup) {
    return 'male';
  } else if (group.female_ids.length < targetFemalePerGroup) {
    return 'female';
  }
  return null;
}

/**
 * 扩充小组成员到满编
 * @param {Object} group - 小组对象
 * @param {Array} males - 男性ID列表
 * @param {Array} females - 女性ID列表
 * @param {Set} assignedParticipants - 已分配参与者集合
 * @param {number} targetMalePerGroup - 目标男性数量
 * @param {number} targetFemalePerGroup - 目标女性数量
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 */
function expandGroupToFull(group, males, females, assignedParticipants, targetMalePerGroup, targetFemalePerGroup, selections, matchmakerPicks) {
  const maxIterations = Math.max(targetMalePerGroup, targetFemalePerGroup) * 2;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // 检查是否已达到目标人数
    if (group.male_ids.length >= targetMalePerGroup && group.female_ids.length >= targetFemalePerGroup) {
      break;
    }
    
    // 确定需要添加的性别
    const targetGender = determineTargetGender(group, targetMalePerGroup, targetFemalePerGroup);
    if (!targetGender) {
      debugLog('error:', '分组算法错误：无法确定需要添加的性别');
      break;
    }
    
    // 获取该性别的未分配人员
    const candidatePool = targetGender === 'male' 
      ? males.filter(id => !assignedParticipants.has(id))
      : females.filter(id => !assignedParticipants.has(id));
    
    if (candidatePool.length === 0) {
      break;
    }
    
    // 计算所有候选人与小组的亲和力分数
    const groupMemberIds = [...group.male_ids, ...group.female_ids];
    const candidateScores = candidatePool.map(candidateId => ({
      id: candidateId,
      score: calculateGroupAffinityScore(candidateId, groupMemberIds, selections, matchmakerPicks)
    }));
    
    // 选择亲和力分数最高的候选人
    candidateScores.sort((a, b) => b.score - a.score);
    const bestCandidate = candidateScores[0];
    
    // 添加到小组
    if (targetGender === 'male') {
      group.male_ids.push(bestCandidate.id);
    } else {
      group.female_ids.push(bestCandidate.id);
    }
    assignedParticipants.add(bestCandidate.id);
  }
}

/**
 * 创建满编组
 * @param {Array} males - 男性ID列表
 * @param {Array} females - 女性ID列表
 * @param {Array} pairScores - 配对分数表
 * @param {Set} assignedParticipants - 已分配参与者集合
 * @param {number} fullGroupsCount - 满编组数量
 * @param {number} targetMalePerGroup - 目标男性数量
 * @param {number} targetFemalePerGroup - 目标女性数量
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @returns {Array} 满编组列表
 */
function createFullGroups(males, females, pairScores, assignedParticipants, fullGroupsCount, targetMalePerGroup, targetFemalePerGroup, selections, matchmakerPicks) {
  const groups = [];
  
  for (let groupIndex = 0; groupIndex < fullGroupsCount; groupIndex++) {
    const group = {
      group_id: groupIndex + 1,
      male_ids: [],
      female_ids: []
    };
    
    // 第一步：寻找小组核心（最佳男女配对）
    const corePair = findCorePair(pairScores, assignedParticipants);
    
    if (!corePair) {
      // 如果没有找到合适的核心配对，尝试单独添加未分配的人
      addUnassignedToGroup(group, males, females, assignedParticipants);
    } else {
      // 添加核心配对
      addCorePairToGroup(group, corePair, assignedParticipants);
    }
    
    // 第二步：扩充小组成员到满编
    expandGroupToFull(group, males, females, assignedParticipants, targetMalePerGroup, targetFemalePerGroup, selections, matchmakerPicks);
    
    // 只有当小组达到满编时才添加到结果中
    if (group.male_ids.length >= targetMalePerGroup && group.female_ids.length >= targetFemalePerGroup) {
      groups.push(group);
      debugLog(`创建满编第${groupIndex + 1}组: ${group.male_ids.length}男${group.female_ids.length}女`);
    } else {
      // 如果无法达到满编，将组员重新放回未分配池
      debugLog(`第${groupIndex + 1}组无法满编，将组员重新分配`);
      for (const memberId of [...group.male_ids, ...group.female_ids]) {
        assignedParticipants.delete(memberId);
      }
      break; // 停止创建更多组
    }
  }
  
  return groups;
}



/**
 * 将剩余人员分配到满编组中（优化性别平衡）
 * @param {Array} groups - 满编组列表
 * @param {Array} allRemainingParticipants - 剩余人员列表
 * @param {Array} males - 男性ID列表
 * @param {Array} females - 女性ID列表
 * @param {number} fullGroupsCount - 满编组数量
 */
function distributeRemainingParticipants(groups, allRemainingParticipants, males, females, fullGroupsCount) {
  if (allRemainingParticipants.length === 0 || fullGroupsCount === 0) {
    return;
  }
  
  debugLog(`将${allRemainingParticipants.length}个剩余人员分配到前${fullGroupsCount}个满编组中（优化性别平衡）`);
  
  // 分离剩余男性和女性
  const remainingMales = allRemainingParticipants.filter(id => males.includes(id));
  const remainingFemales = allRemainingParticipants.filter(id => females.includes(id));
  
  debugLog(`剩余男性: ${remainingMales.length}人, 剩余女性: ${remainingFemales.length}人`);
  
  // 计算每个组应该分配的男性和女性数量
  const malesPerGroup = Math.floor(remainingMales.length / fullGroupsCount);
  const extraMales = remainingMales.length % fullGroupsCount;
  const femalesPerGroup = Math.floor(remainingFemales.length / fullGroupsCount);
  const extraFemales = remainingFemales.length % fullGroupsCount;
  
  let maleIndex = 0;
  let femaleIndex = 0;
  
  // 为每个组分配剩余人员
  for (let groupIndex = 0; groupIndex < fullGroupsCount; groupIndex++) {
    const currentGroup = groups[groupIndex];
    
    // 计算当前组应该分配的男性数量
    let currentGroupMales = malesPerGroup;
    if (groupIndex < extraMales) {
      currentGroupMales++; // 前extraMales个组多分配1个男性
    }
    
    // 计算当前组应该分配的女性数量
    let currentGroupFemales = femalesPerGroup;
    if (groupIndex < extraFemales) {
      currentGroupFemales++; // 前extraFemales个组多分配1个女性
    }
    
    // 分配男性
    for (let i = 0; i < currentGroupMales && maleIndex < remainingMales.length; i++) {
      const maleId = remainingMales[maleIndex];
      currentGroup.male_ids.push(maleId);
      debugLog(`将男性${maleId}分配到第${groupIndex + 1}组`);
      maleIndex++;
    }
    
    // 分配女性
    for (let i = 0; i < currentGroupFemales && femaleIndex < remainingFemales.length; i++) {
      const femaleId = remainingFemales[femaleIndex];
      currentGroup.female_ids.push(femaleId);
      debugLog(`将女性${femaleId}分配到第${groupIndex + 1}组`);
      femaleIndex++;
    }
  }
  
  debugLog(`剩余人员分配完成，共分配${maleIndex}男${femaleIndex}女到前${fullGroupsCount}个组中`);
}

/**
 * 生成分组
 * @param {Array} participants - 参与者列表
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @param {Object} options - 配置选项
 * @returns {Object} 分组结果
 */
function generateGroups(participants, selections, matchmakerPicks, options) {
  // 分离男女参与者
  const males = participants.filter(p => p.gender === 'male').map(p => p.id);
  const females = participants.filter(p => p.gender === 'female').map(p => p.id);
  
  debugLog('info:', `总参与者: ${participants.length}, 男性: ${males.length}, 女性: ${females.length}`);
  
  // 获取分组配置
  const targetMalePerGroup = options.group_size_male;
  const targetFemalePerGroup = options.group_size_female;
  const targetGroupSize = targetMalePerGroup + targetFemalePerGroup;
  
  // 计算理论上的满编组数（基于男女数量的限制）
  const maxGroupsByMales = Math.floor(males.length / targetMalePerGroup);
  const maxGroupsByFemales = Math.floor(females.length / targetFemalePerGroup);
  const fullGroupsCount = Math.min(maxGroupsByMales, maxGroupsByFemales);
  
  debugLog(`理论满编组数: ${fullGroupsCount}, 目标组大小: ${targetGroupSize}`);
  debugLog(`按男性可组: ${maxGroupsByMales}组, 按女性可组: ${maxGroupsByFemales}组`);
  
  // 创建配对总表
  const pairScores = createPairScoresTable(males, females, selections, matchmakerPicks);
  
  // 初始化已分配参与者集合
  const assignedParticipants = new Set();
  
  // 创建满编组
  const groups = createFullGroups(males, females, pairScores, assignedParticipants, fullGroupsCount, targetMalePerGroup, targetFemalePerGroup, selections, matchmakerPicks);
  
  // 收集所有剩余人员（包括从未分配的和从失败组退回的）
  const allRemainingParticipants = [];
  
  // 从未分配人员中收集
  const remainingMales = males.filter(id => !assignedParticipants.has(id));
  const remainingFemales = females.filter(id => !assignedParticipants.has(id));
  allRemainingParticipants.push(...remainingMales, ...remainingFemales);
  
  if (allRemainingParticipants.length > 0) {
    debugLog(`总剩余人员: ${allRemainingParticipants.length}人`);
    
    if (fullGroupsCount > 0) {
      // 将剩余人员平均分配到前N个满编组中
      distributeRemainingParticipants(groups, allRemainingParticipants, males, females, fullGroupsCount);
    } else {
      // 如果没有满编组，创建新组容纳剩余人员
      debugLog('error:', `总人数太少或者一个组人数太多了!`);
      debugLog('error:', `报名人太少了,凑不够一个组,别办活动了`);
    }
  }
  
  return { groups };
}

/**
 * 生成聊天名单
 * @param {Array} participants - 参与者列表
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @param {Object} options - 配置选项
 * @returns {Object} 聊天名单结果
 */
async function generateChatLists(participants, selections, matchmakerPicks, options) {
  const chatLists = {};
  const listSize = options.list_size || 5;
  
  debugLog('info:', `开始生成聊天名单，名单大小: ${listSize}`);
  
  // 获取所有用户ID
  const userIds = participants.map(p => p.id);
  
  // 批量查询所有用户已聊过的用户
  const chattedUsersMap = await getChattedUsersBatch(userIds);
  
  // 第一步：为每个参与者计算与所有异性的互有好感分数
  const allScores = {};
  
  for (const participant of participants) {
    const participantId = participant.id;
    const oppositeGender = participant.gender === 'male' ? 'female' : 'male';
    const oppositeParticipants = participants.filter(p => p.gender === oppositeGender);
    
    allScores[participantId] = {};
    
    // 获取当前用户已聊过的用户列表
    const chattedUsers = chattedUsersMap[participantId] || new Set();
    
    // 计算与所有异性的互有好感分数（排除已聊过的用户）
    for (const opp of oppositeParticipants) {
      // 跳过已聊过的用户
      if (chattedUsers.has(opp.id)) {
        debugLog(`用户${participantId}已与用户${opp.id}聊过，跳过`);
        continue;
      }
      
      const mutualScore = calculateMutualAffinityScore(participantId, opp.id, selections, matchmakerPicks);
      allScores[participantId][opp.id] = mutualScore;
    }
  }
  
  // 第二步：生成初始聊天名单（按分数排序）
  for (const participant of participants) {
    const participantId = participant.id;
    const scores = allScores[participantId];
    
    // 按分数排序并取前N个
    const sortedScores = Object.entries(scores)
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score);
    
    chatLists[participantId] = sortedScores.slice(0, listSize).map(item => item.id);
    
    // 记录调试信息
    if (sortedScores.length < listSize) {
      debugLog(`用户${participantId}可选对象不足，只有${sortedScores.length}个可用对象`);
    }
  }
  
  // 第三步：确保双向匹配（如果A在B的list里，B也应该在A的list里）
  const bidirectionalLists = {};
  
  for (const participant of participants) {
    const participantId = participant.id;
    const currentList = chatLists[participantId] || [];
    const bidirectionalMatches = new Set();
    
    // 添加当前名单中的人
    for (const matchId of currentList) {
      bidirectionalMatches.add(matchId);
      
      // 检查对方是否也将当前用户加入名单
      const matchList = chatLists[matchId] || [];
      if (!matchList.includes(participantId)) {
        // 如果对方没有将当前用户加入名单，将当前用户加入对方的名单
        if (matchList.length < listSize) {
          matchList.push(participantId);
        } else {
          // 如果对方名单已满，替换分数最低的
          const matchScores = allScores[matchId];
          if (matchScores && matchScores[participantId]) {
            const lowestScoreMatch = matchList.reduce((lowest, id) => {
              return (matchScores[id] || 0) < (matchScores[lowest] || 0) ? id : lowest;
            });
            
            if (matchScores[participantId] > (matchScores[lowestScoreMatch] || 0)) {
              const index = matchList.indexOf(lowestScoreMatch);
              matchList[index] = participantId;
            }
          }
        }
        chatLists[matchId] = matchList;
      }
    }
    
    // 检查哪些人将当前用户加入了名单，但当前用户没有将他们加入名单
    for (const otherParticipant of participants) {
      const otherId = otherParticipant.id;
      if (otherId === participantId) continue;
      
      const otherList = chatLists[otherId] || [];
      if (otherList.includes(participantId) && !currentList.includes(otherId)) {
        bidirectionalMatches.add(otherId);
      }
    }
    
    // 将双向匹配的人按分数排序，取前N个
    const bidirectionalScores = Array.from(bidirectionalMatches)
      .filter(id => allScores[participantId] && allScores[participantId][id]) // 确保分数存在
      .map(id => ({ id, score: allScores[participantId][id] }))
      .sort((a, b) => b.score - a.score);
    
    bidirectionalLists[participantId] = bidirectionalScores.slice(0, listSize).map(item => item.id);
  }
  
  // 第四步：输出调试信息
  debugLog('info:', `聊天名单生成完成，共为${participants.length}人生成名单`);
  
  // 统计双向匹配情况
  let totalMatches = 0;
  let bidirectionalMatches = 0;
  let usersWithInsufficientMatches = 0;
  
  for (const participantId in bidirectionalLists) {
    const list = bidirectionalLists[participantId];
    totalMatches += list.length;
    
    if (list.length < listSize) {
      usersWithInsufficientMatches++;
    }
    
    for (const matchId of list) {
      const matchList = bidirectionalLists[matchId] || [];
      if (matchList.includes(participantId)) {
        bidirectionalMatches++;
      }
    }
  }
  
  debugLog(`统计 - 总推荐数: ${totalMatches}, 双向匹配数: ${bidirectionalMatches / 2}`);
  if (totalMatches > 0) {
    debugLog(`双向匹配率: ${((bidirectionalMatches / 2) / (totalMatches / 2) * 100).toFixed(1)}%`);
  }
  if (usersWithInsufficientMatches > 0) {
    debugLog(`警告: ${usersWithInsufficientMatches}个用户可选对象不足，建议增加参与者或减少名单大小`);
  }
  
  return { 
    chatLists: bidirectionalLists,
    statistics: {
      totalMatches,
      bidirectionalMatches: bidirectionalMatches / 2,
      usersWithInsufficientMatches,
      bidirectionalMatchRate: totalMatches > 0 ? ((bidirectionalMatches / 2) / (totalMatches / 2) * 100).toFixed(1) : 0
    }
  };
}

// 导出函数
module.exports = {
    generateGroups,
    generateChatLists,
    setDebugEnabled
};
