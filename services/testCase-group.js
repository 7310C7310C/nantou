/**
 * 分组算法测试用例集合
 * 包含各种边界情况、正常情况和大规模测试
 */

const { generateGroups, setDebugEnabled } = require('./groupingAlgorithm');

// 开启调试日志
setDebugEnabled(false);

/**
 * 生成测试数据
 * @param {number} maleCount - 男性数量
 * @param {number} femaleCount - 女性数量
 * @returns {Array} 参与者数组
 */
function generateParticipants(maleCount, femaleCount) {
  const participants = [];
  
  // 生成男性
  for (let i = 1; i <= maleCount; i++) {
    participants.push({ id: `M${i}`, gender: 'male' });
  }
  
  // 生成女性
  for (let i = 1; i <= femaleCount; i++) {
    participants.push({ id: `F${i}`, gender: 'female' });
  }
  
  return participants;
}

/**
 * 生成用户选择数据
 * @param {Array} participants - 参与者数组
 * @returns {Object} 选择数据
 */
function generateSelections(participants) {
  const selections = {};
  const males = participants.filter(p => p.gender === 'male');
  const females = participants.filter(p => p.gender === 'female');
  
  // 为每个男性生成选择
  males.forEach(male => {
    const choices = [];
    // 随机选择1-7个女性
    const choiceCount = Math.min(7, females.length);
    const shuffledFemales = [...females].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < choiceCount; i++) {
      choices.push({
        id: shuffledFemales[i].id,
        priority: i + 1
      });
    }
    selections[male.id] = choices;
  });
  
  // 为每个女性生成选择
  females.forEach(female => {
    const choices = [];
    // 随机选择1-7个男性
    const choiceCount = Math.min(7, males.length);
    const shuffledMales = [...males].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < choiceCount; i++) {
      choices.push({
        id: shuffledMales[i].id,
        priority: i + 1
      });
    }
    selections[female.id] = choices;
  });
  
  return selections;
}

/**
 * 运行测试用例
 * @param {string} testName - 测试名称
 * @param {Array} participants - 参与者数组
 * @param {Object} options - 分组配置
 */
function runTest(testName, participants, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试用例: ${testName}`);
  console.log(`${'='.repeat(60)}`);
  
  const males = participants.filter(p => p.gender === 'male').length;
  const females = participants.filter(p => p.gender === 'female').length;
  
  console.log(`总参与者: ${participants.length}人`);
  console.log(`男性: ${males}人`);
  console.log(`女性: ${females}人`);
  console.log(`目标配置: 每组${options.group_size_male}男${options.group_size_female}女`);
  
  // 理论计算
  const maxGroupsByMales = Math.floor(males / options.group_size_male);
  const maxGroupsByFemales = Math.floor(females / options.group_size_female);
  const expectedGroups = Math.min(maxGroupsByMales, maxGroupsByFemales);
  const expectedRemainingMales = males - (expectedGroups * options.group_size_male);
  const expectedRemainingFemales = females - (expectedGroups * options.group_size_female);
  
  console.log(`\n理论计算:`);
  console.log(`按男性可组: ${maxGroupsByMales}组`);
  console.log(`按女性可组: ${maxGroupsByFemales}组`);
  console.log(`理论满编组数: ${expectedGroups}`);
  console.log(`理论剩余男性: ${expectedRemainingMales}人`);
  console.log(`理论剩余女性: ${expectedRemainingFemales}人`);
  
  // 生成选择数据
  const selections = generateSelections(participants);
  const matchmakerPicks = [];
  
  // 执行分组
  const startTime = Date.now();
  const result = generateGroups(participants, selections, matchmakerPicks, options);
  const endTime = Date.now();
  
  // 分析结果
  console.log(`\n执行时间: ${endTime - startTime}ms`);
  console.log(`总共创建了 ${result.groups.length} 个组`);
  
  let totalAssigned = 0;
  let totalMales = 0;
  let totalFemales = 0;
  
  result.groups.forEach((group, index) => {
    const maleCount = group.male_ids.length;
    const femaleCount = group.female_ids.length;
    const totalCount = maleCount + femaleCount;
    totalAssigned += totalCount;
    totalMales += maleCount;
    totalFemales += femaleCount;
    
    console.log(`第${group.group_id}组: ${maleCount}男${femaleCount}女 (共${totalCount}人)`);
  });
  
  console.log(`\n结果统计:`);
  console.log(`总分配人数: ${totalAssigned}/${participants.length}`);
  console.log(`分配率: ${((totalAssigned / participants.length) * 100).toFixed(1)}%`);
  console.log(`实际分配男性: ${totalMales}人`);
  console.log(`实际分配女性: ${totalFemales}人`);
  
  // 验证结果
  const success = totalAssigned === participants.length;
  console.log(`测试结果: ${success ? '✓ 成功' : '✗ 失败'}`);
}

// ==================== 测试用例集合 ====================

// 测试用例1: 没有满编组的情况
console.log('\n开始运行测试用例...');

const testCase1 = {
  name: '没有满编组 - 性别比例失衡',
  participants: generateParticipants(3, 1),
  options: { group_size_male: 2, group_size_female: 2 }
};

const testCase2 = {
  name: '没有满编组 - 参与者太少',
  participants: generateParticipants(1, 1),
  options: { group_size_male: 2, group_size_female: 2 }
};

const testCase3 = {
  name: '正常情况 - 小规模',
  participants: generateParticipants(8, 6),
  options: { group_size_male: 2, group_size_female: 2 }
};

const testCase4 = {
  name: '正常情况 - 中等规模',
  participants: generateParticipants(23, 18),
  options: { group_size_male: 4, group_size_female: 4 }
};

const testCase5 = {
  name: '正常情况 - 大规模',
  participants: generateParticipants(54, 43),
  options: { group_size_male: 5, group_size_female: 5 }
};

const testCase6 = {
  name: '大规模测试 - 100人',
  participants: generateParticipants(63, 40),
  options: { group_size_male: 6, group_size_female: 6 }
};

const testCase7 = {
  name: '大规模测试 - 200人',
  participants: generateParticipants(122, 83),
  options: { group_size_male: 6, group_size_female: 6 }
};

const testCase8 = {
  name: '大规模测试 - 500人',
  participants: generateParticipants(305, 212),
  options: { group_size_male: 10, group_size_female: 10 }
};

const testCase9 = {
  name: '边界情况 - 刚好满编',
  participants: generateParticipants(10, 10),
  options: { group_size_male: 5, group_size_female: 5 }
};

const testCase10 = {
  name: '边界情况 - 性别比例1:1',
  participants: generateParticipants(25, 25),
  options: { group_size_male: 4, group_size_female: 4 }
};

const testCase11 = {
  name: '边界情况 - 男性多于女性(1)',
  participants: generateParticipants(33, 26),
  options: { group_size_male: 4, group_size_female: 4 }
};

const testCase12 = {
  name: '边界情况 - 男性多于女性(2)',
  participants: generateParticipants(83, 66),
  options: { group_size_male: 5, group_size_female: 5 }
};

const testCase13 = {
  name: '边界情况 - 男性多于女性(2)',
  participants: generateParticipants(133, 126),
  options: { group_size_male: 4, group_size_female: 4 }
};

const testCase14 = {
  name: '边界情况 - 女性多于男性(1)',
  participants: generateParticipants(23, 36),
  options: { group_size_male: 4, group_size_female: 4 }
};

const testCase15 = {
  name: '边界情况 - 女性多于男性(2)',
  participants: generateParticipants(123, 136),
  options: { group_size_male: 5, group_size_female: 5 }
};

const testCase16 = {
  name: '边界情况 - 女性多于男性(3)',
  participants: generateParticipants(123, 136),
  options: { group_size_male: 4, group_size_female: 4 }
};

// 运行所有测试用例
const testCases = [
  testCase1, testCase2, testCase3, testCase4, testCase5,
  testCase6, testCase7, testCase8, testCase9, testCase10,
  testCase11, testCase12, testCase13, testCase14, testCase15, testCase16
];

testCases.forEach(testCase => {
  runTest(testCase.name, testCase.participants, testCase.options);
});

console.log(`\n${'='.repeat(60)}`);
console.log('所有测试用例执行完成！');
console.log(`${'='.repeat(60)}`);
