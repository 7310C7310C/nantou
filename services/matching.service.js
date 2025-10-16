/**
 * 找对象活动分组算法模块
 * 实现核心-卫星滚动分组法
 */

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
            matchmakerScore1to2 = Math.max(matchmakerScore1to2, MATCHMAKER_STAR_SCORES[pick.stars] || 0);
        }
        if (pick.person1_id === person2Id && pick.person2_id === person1Id) {
            matchmakerScore2to1 = Math.max(matchmakerScore2to1, MATCHMAKER_STAR_SCORES[pick.stars] || 0);
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
        } else {
            // 如果无法达到满编，将组员重新放回未分配池
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

    // 分离剩余男性和女性
    const remainingMales = allRemainingParticipants.filter(id => males.includes(id));
    const remainingFemales = allRemainingParticipants.filter(id => females.includes(id));

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
            maleIndex++;
        }

        // 分配女性
        for (let i = 0; i < currentGroupFemales && femaleIndex < remainingFemales.length; i++) {
            const femaleId = remainingFemales[femaleIndex];
            currentGroup.female_ids.push(femaleId);
            femaleIndex++;
        }
    }
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
    // 参数验证
    if (!Array.isArray(participants)) {
        throw new Error('participants 必须是数组');
    }
    if (!selections || typeof selections !== 'object') {
        throw new Error('selections 必须是对象');
    }
    if (!Array.isArray(matchmakerPicks)) {
        throw new Error('matchmakerPicks 必须是数组');
    }
    if (!options || typeof options !== 'object') {
        throw new Error('options 必须是对象');
    }
    
    // 分离男女参与者
    const males = participants.filter(p => p.gender === 'male').map(p => p.id);
    const females = participants.filter(p => p.gender === 'female').map(p => p.id);

    // 获取分组配置
    const targetMalePerGroup = options.group_size_male;
    const targetFemalePerGroup = options.group_size_female;
    const targetGroupSize = targetMalePerGroup + targetFemalePerGroup;

    // 计算理论上的满编组数（基于男女数量的限制）
    const maxGroupsByMales = Math.floor(males.length / targetMalePerGroup);
    const maxGroupsByFemales = Math.floor(females.length / targetFemalePerGroup);
    const fullGroupsCount = Math.min(maxGroupsByMales, maxGroupsByFemales);

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

    if (allRemainingParticipants.length > 0 && fullGroupsCount > 0) {
        // 将剩余人员平均分配到前N个满编组中
        distributeRemainingParticipants(groups, allRemainingParticipants, males, females, fullGroupsCount);
    }

    return { groups };
}

/**
 * 生成聊天名单
 * @param {Array} participants - 参与者列表
 * @param {Object} selections - 用户选择数据
 * @param {Array} matchmakerPicks - 红娘推荐数据
 * @param {Object} options - 配置选项
 * @param {Array} completedChatHistory - 已完成聊天的历史记录 [{user_id, target_id}, ...],case举例:[{1001, 2001} {1001, 2002}, {1002, 2003}, {1002, 2004},.... ]
 * @returns {Object} 聊天名单结果
 */
function generateChatLists(participants, selections, matchmakerPicks, options, completedChatHistory = []) {
    // 参数验证
    if (!Array.isArray(participants)) {
        throw new Error('participants 必须是数组');
    }
    if (!selections || typeof selections !== 'object') {
        throw new Error('selections 必须是对象');
    }
    if (!Array.isArray(matchmakerPicks)) {
        throw new Error('matchmakerPicks 必须是数组');
    }
    if (!options || typeof options !== 'object') {
        throw new Error('options 必须是对象');
    }
    if (!Array.isArray(completedChatHistory)) {
        throw new Error('completedChatHistory 必须是数组');
    }
    const listSize = options.list_size || 5;
    
    const userIds = participants.map(p => p.id);
    const chattedUsersMap = {};
    // 仅使用本地 completedChatHistory（双向）
    if (Array.isArray(completedChatHistory) && completedChatHistory.length > 0) {
      for (const { user_id, target_id } of completedChatHistory) {
        if (!user_id || !target_id) continue;
        if (!chattedUsersMap[user_id]) chattedUsersMap[user_id] = new Set();
        if (!chattedUsersMap[target_id]) chattedUsersMap[target_id] = new Set();
        chattedUsersMap[user_id].add(target_id);
        chattedUsersMap[target_id].add(user_id);
      }
    }
  
    // 构建所有跨性别候选边及分数（排除已聊过）
    const males = participants.filter(p => p.gender === 'male').map(p => p.id);
    const females = participants.filter(p => p.gender === 'female').map(p => p.id);
    const edges = [];
    for (const m of males) {
      const chattedM = chattedUsersMap[m] || new Set();
      for (const f of females) {
        if (chattedM.has(f)) continue;
        const score = calculateMutualAffinityScore(m, f, selections, matchmakerPicks);
        if (score > 0) edges.push({ a: m, b: f, score });
      }
    }
  
    // 全局按分数降序
    edges.sort((x, y) => y.score - x.score);
  
    // 按新规则设置容量：男生 cap = listSize；女生 cap = 2*listSize
    const cap = new Map(userIds.map(id => [id, males.includes(id) ? listSize : (2 * listSize)]));
    const chatLists = Object.fromEntries(userIds.map(id => [id, []]));
  
    // 第一阶段：尽量双向加入；若受容量限制冲突，允许单向加入（舍弃原则3）
    for (const e of edges) {
      const a = e.a; // male
      const b = e.b; // female
      const hasAB = chatLists[a].includes(b);
      const hasBA = chatLists[b].includes(a);
      if (!hasAB || !hasBA) {
        const canA = chatLists[a].length < cap.get(a);
        const canB = chatLists[b].length < cap.get(b);
        if (canA && canB) {
          if (!hasAB) chatLists[a].push(b);
          if (!hasBA) chatLists[b].push(a);
        } else if (canA && !hasAB) {
          // 男方有容量，女方已满：允许单向加入到男方，舍弃双向
          chatLists[a].push(b);
        } else if (canB && !hasBA) {
          // 女方有容量，男方已满：允许单向加入到女方
          chatLists[b].push(a);
        }
      }
    }
  
    // 第二阶段：对仍未满编（长度 < listSize）的人做容量感知补满（允许单向）
    const needLeft = new Map(userIds.map(id => [id, Math.max(0, listSize - chatLists[id].length)]));
  
    // 为快速选择候选，准备每个用户的候选列表（含分数）
    const scoreLookup = (x, y) => {
      return males.includes(x)
        ? (edges.find(e => e.a === x && e.b === y)?.score || calculateMutualAffinityScore(x, y, selections, matchmakerPicks))
        : (edges.find(e => e.a === y && e.b === x)?.score || calculateMutualAffinityScore(y, x, selections, matchmakerPicks));
    };
  
    for (const id of userIds) {
      while (needLeft.get(id) > 0) {
        const isMale = males.includes(id);
        const oppList = isMale ? females : males;
        const chattedSet = chattedUsersMap[id] || new Set();
        const candidates = oppList
          .filter(opp => !chattedSet.has(opp) && !chatLists[id].includes(opp))
          .map(opp => ({ id: opp, deg: chatLists[opp].length, score: scoreLookup(id, opp), capLeft: cap.get(opp) - chatLists[opp].length }))
          .sort((a, b) => (a.deg - b.deg) || (b.score - a.score));
  
        if (candidates.length === 0) break;
  
        // 先尝试双向（双方均未超 cap），否则退化为单向只加在 id 上
        let picked = false;
        for (const c of candidates) {
          const selfCapOk = chatLists[id].length < cap.get(id);
          const otherCapOk = chatLists[c.id].length < cap.get(c.id);
          if (selfCapOk && otherCapOk) {
            chatLists[id].push(c.id);
            chatLists[c.id].push(id);
            needLeft.set(id, Math.max(0, needLeft.get(id) - 1));
            picked = true;
            break;
          }
        }
        if (picked) continue;
  
        // 单向：只往自己的列表里加（舍弃原则3），但严格遵守自身 cap
        if (chatLists[id].length < cap.get(id)) {
          const c = candidates[0];
          chatLists[id].push(c.id);
          needLeft.set(id, Math.max(0, needLeft.get(id) - 1));
        } else {
          break;
        }
      }
    }
  
    // 统计
    let totalMatches = 0;
    let bidirectionalPairs = 0;
    let usersWithInsufficientMatches = 0;
    for (const id of Object.keys(chatLists)) {
      const list = chatLists[id];
      totalMatches += list.length;
      if (list.length < listSize) usersWithInsufficientMatches++;
      for (const other of list) {
        if ((chatLists[other] || []).includes(id)) bidirectionalPairs++;
      }
    }
    bidirectionalPairs = bidirectionalPairs / 2;
  
    debugLog('info:', `聊天名单生成完成；总推荐数: ${totalMatches}, 双向配对数: ${bidirectionalPairs}`);
    
    return { 
      chatLists,
      statistics: {
        totalMatches,
        bidirectionalMatches: bidirectionalPairs,
        usersWithInsufficientMatches,
        bidirectionalMatchRate: totalMatches > 0 ? ((bidirectionalPairs) / (totalMatches / 2) * 100).toFixed(1) : 0
      }
    };
  }

// 导出函数
module.exports = {
    generateGroups,
    generateChatLists
};
