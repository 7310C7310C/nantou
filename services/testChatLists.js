/**
 * 测试聊天名单生成算法
 */

const { generateChatLists, setDebugEnabled } = require('./groupingAlgorithm');

// 开启调试日志
setDebugEnabled(true);

// 测试数据
const participants = [
  { id: 'M1', gender: 'male' },
  { id: 'M2', gender: 'male' },
  { id: 'M3', gender: 'male' },
  { id: 'M4', gender: 'male' },
  { id: 'M5', gender: 'male' },
  { id: 'F1', gender: 'female' },
  { id: 'F2', gender: 'female' },
  { id: 'F3', gender: 'female' },
  { id: 'F4', gender: 'female' },
  { id: 'F5', gender: 'female' }
];

// 用户选择数据
const selections = {
  'M1': [
    { id: 'F1', priority: 1 },
    { id: 'F2', priority: 2 },
    { id: 'F3', priority: 3 }
  ],
  'M2': [
    { id: 'F2', priority: 1 },
    { id: 'F3', priority: 2 },
    { id: 'F4', priority: 3 }
  ],
  'M3': [
    { id: 'F3', priority: 1 },
    { id: 'F4', priority: 2 },
    { id: 'F5', priority: 3 }
  ],
  'M4': [
    { id: 'F4', priority: 1 },
    { id: 'F5', priority: 2 },
    { id: 'F1', priority: 3 }
  ],
  'M5': [
    { id: 'F5', priority: 1 },
    { id: 'F1', priority: 2 },
    { id: 'F2', priority: 3 }
  ],
  'F1': [
    { id: 'M1', priority: 1 },
    { id: 'M2', priority: 2 },
    { id: 'M3', priority: 3 }
  ],
  'F2': [
    { id: 'M2', priority: 1 },
    { id: 'M3', priority: 2 },
    { id: 'M4', priority: 3 }
  ],
  'F3': [
    { id: 'M3', priority: 1 },
    { id: 'M4', priority: 2 },
    { id: 'M5', priority: 3 }
  ],
  'F4': [
    { id: 'M4', priority: 1 },
    { id: 'M5', priority: 2 },
    { id: 'M1', priority: 3 }
  ],
  'F5': [
    { id: 'M5', priority: 1 },
    { id: 'M1', priority: 2 },
    { id: 'M2', priority: 3 }
  ]
};

// 红娘推荐数据
const matchmakerPicks = [
  { person1_id: 'M1', person2_id: 'F1', stars: 5 },
  { person1_id: 'M2', person2_id: 'F2', stars: 4 },
  { person1_id: 'M3', person2_id: 'F3', stars: 5 },
  { person1_id: 'M4', person2_id: 'F4', stars: 4 },
  { person1_id: 'M5', person2_id: 'F5', stars: 5 },
  { person1_id: 'F1', person2_id: 'M1', stars: 5 },
  { person1_id: 'F2', person2_id: 'M2', stars: 4 },
  { person1_id: 'F3', person2_id: 'M3', stars: 5 },
  { person1_id: 'F4', person2_id: 'M4', stars: 4 },
  { person1_id: 'F5', person2_id: 'M5', stars: 5 }
];

// 配置选项
const options = {
  list_size: 3  // 每个名单包含3个人
};

console.log('=== 测试聊天名单生成算法 ===');
console.log(`参与者: ${participants.length}人`);
console.log(`男性: ${participants.filter(p => p.gender === 'male').length}人`);
console.log(`女性: ${participants.filter(p => p.gender === 'female').length}人`);
console.log(`名单大小: ${options.list_size}人`);
console.log('');

// 执行聊天名单生成
const result = generateChatLists(participants, selections, matchmakerPicks, options);

// 分析结果
console.log('\n=== 聊天名单结果 ===');
const chatLists = result.chatLists;

for (const participantId in chatLists) {
  const list = chatLists[participantId];
  console.log(`${participantId}: [${list.join(', ')}]`);
}

// 验证双向匹配
console.log('\n=== 双向匹配验证 ===');
let bidirectionalCount = 0;
let totalMatches = 0;

for (const participantId in chatLists) {
  const list = chatLists[participantId];
  totalMatches += list.length;
  
  for (const matchId of list) {
    const matchList = chatLists[matchId] || [];
    if (matchList.includes(participantId)) {
      bidirectionalCount++;
      console.log(`✓ ${participantId} ↔ ${matchId} (双向匹配)`);
    } else {
      console.log(`✗ ${participantId} → ${matchId} (单向匹配)`);
    }
  }
}

console.log(`\n统计结果:`);
console.log(`总推荐数: ${totalMatches}`);
console.log(`双向匹配数: ${bidirectionalCount / 2}`);
console.log(`双向匹配率: ${((bidirectionalCount / 2) / (totalMatches / 2) * 100).toFixed(1)}%`);

// 详细分析每个参与者的匹配情况
console.log('\n=== 详细匹配分析 ===');
for (const participant of participants) {
  const participantId = participant.id;
  const list = chatLists[participantId] || [];
  const gender = participant.gender === 'male' ? '男' : '女';
  
  console.log(`\n${participantId}(${gender})的聊天名单:`);
  for (const matchId of list) {
    const matchList = chatLists[matchId] || [];
    const isBidirectional = matchList.includes(participantId);
    const matchGender = participants.find(p => p.id === matchId).gender === 'male' ? '男' : '女';
    
    console.log(`  ${matchId}(${matchGender}) ${isBidirectional ? '✓' : '✗'}`);
  }
}
