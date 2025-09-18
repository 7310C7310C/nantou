const express = require('express');
const path = require('path');
require('dotenv').config();

// 设置时区为北京时间
process.env.TZ = 'Asia/Shanghai';

// 导入控制器和中间件
const authController = require('./controllers/auth.controller');
const adminController = require('./controllers/admin.controller');
const staffController = require('./controllers/staff.controller');
const logController = require('./controllers/log.controller');
const participantsController = require('./controllers/participants.controller');
const favoriteController = require('./controllers/favorite.controller');
const matchmakerController = require('./controllers/matchmaker.controller');
const selectionsController = require('./controllers/selections.controller');
const matchingUserController = require('./controllers/matching-user.controller');
const { protect, restrictTo, optionalAuth } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 中间件
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // 允许的来源
  const allowedOrigins = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://0.0.0.0:3001'
  ];
  
  // 如果请求来自允许的源或者是同源请求
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 静态文件服务 - 添加缓存控制
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    // 对JS和CSS文件设置较短的缓存时间，便于开发
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 基础路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}+08:00`;
  
  res.json({ 
    status: 'OK', 
    message: '服务器运行正常',
    timestamp: timestamp
  });
});

// 测试路由 - 用于调试
app.get('/api/test', (req, res) => {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}+08:00`;
  
  res.json({ 
    message: 'API路由正常工作',
    timestamp: timestamp
  });
});

// 测试认证路由 - 用于调试
app.get('/api/test-auth', protect, (req, res) => {
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}+08:00`;
  
  res.json({ 
    message: '认证正常工作',
    user: req.user,
    timestamp: timestamp
  });
});

// 认证路由
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', protect, authController.getCurrentUser);
app.post('/api/auth/logout', protect, authController.logout);

// 管理后台API路由
app.post('/api/admin/participants', protect, restrictTo('admin', 'staff'), adminController.registerParticipant);
app.get('/api/admin/participants', protect, restrictTo('admin', 'staff'), adminController.getAllParticipants);
app.get('/api/admin/participants-for-checkin', protect, restrictTo('admin', 'staff'), adminController.getParticipantsForCheckin);
app.patch('/api/admin/participants/:id/checkin', protect, restrictTo('admin', 'staff'), adminController.updateParticipantCheckin);
app.post('/api/admin/clear-all-checkins', protect, restrictTo('admin', 'staff'), adminController.clearAllCheckins);
app.get('/api/admin/participants/:participant_id/photos', protect, restrictTo('admin', 'staff'), adminController.getParticipantPhotos);
app.get('/api/admin/participants/:participant_id', protect, restrictTo('admin', 'staff'), adminController.getParticipantById);
app.delete('/api/admin/participants/:participant_id', protect, restrictTo('admin', 'staff'), adminController.deleteParticipant);
app.post('/api/admin/participants/:participant_id/reset-password', protect, restrictTo('admin', 'staff'), adminController.resetParticipantPassword);
app.post('/api/admin/photos/primary', protect, restrictTo('admin', 'staff'), adminController.setPrimaryPhoto);
app.delete('/api/admin/photos/:photo_id', protect, restrictTo('admin', 'staff'), adminController.deletePhoto);

// 日志管理API路由
app.get('/api/admin/logs', protect, restrictTo('admin'), logController.getRecentLogs);
app.get('/api/admin/logs/search', protect, restrictTo('admin'), logController.searchLogs);

// 工作人员管理API路由（仅管理员可访问）
app.get('/api/admin/staff', protect, restrictTo('admin'), staffController.getAllStaff);
app.post('/api/admin/staff', protect, restrictTo('admin'), staffController.createStaff);
app.post('/api/admin/staff/:staff_id/reset-password', protect, restrictTo('admin'), staffController.resetStaffPassword);
app.delete('/api/admin/staff/:staff_id', protect, restrictTo('admin'), staffController.deleteStaff);

// 功能开关管理API路由（仅管理员可访问）
app.get('/api/admin/feature-flags', protect, restrictTo('admin'), adminController.getFeatureFlags);
app.put('/api/admin/feature-flags', protect, restrictTo('admin'), adminController.updateFeatureFlags);

// 互选情况数据API路由（管理员、工作人员和红娘可访问）
app.get('/api/admin/selections-data', protect, restrictTo('admin', 'staff', 'matchmaker'), adminController.getSelectionsData);

// 匹配算法管理API路由（仅管理员可访问）
app.get('/api/admin/validate-selections', protect, restrictTo('admin'), adminController.validateUserSelections);
app.post('/api/admin/execute-group-matching', protect, restrictTo('admin'), adminController.executeGroupMatching);
app.post('/api/admin/execute-chat-matching', protect, restrictTo('admin'), adminController.executeChatMatching);
app.get('/api/admin/grouping-history', protect, restrictTo('admin', 'staff', 'matchmaker'), adminController.getGroupingHistory);
app.get('/api/admin/chat-history', protect, restrictTo('admin', 'staff', 'matchmaker'), adminController.getChatHistory);
app.get('/api/admin/grouping-result/:runBatch', protect, restrictTo('admin', 'staff', 'matchmaker'), adminController.getGroupingResult);
app.get('/api/admin/chat-result/:runBatch', protect, restrictTo('admin', 'staff', 'matchmaker'), adminController.getChatResult);

// 红娘配对API路由
app.get('/api/matchmaker/participants/:participant_id/matching', protect, restrictTo('matchmaker'), matchmakerController.getParticipantMatchingData);
app.post('/api/matchmaker/recommendations', protect, restrictTo('matchmaker'), matchmakerController.createOrUpdateRecommendation);
app.delete('/api/matchmaker/recommendations', protect, restrictTo('matchmaker'), matchmakerController.deleteRecommendation);
app.delete('/api/matchmaker/recommendations/:id', protect, restrictTo('matchmaker'), matchmakerController.deleteRecommendationById);
app.get('/api/matchmaker/my-recommendations', protect, restrictTo('matchmaker'), matchmakerController.getMatchmakerRecommendations);

// 公开API路由
app.get('/api/participants', optionalAuth, participantsController.getParticipants);
// 功能开关状态查询（公开访问）
app.get('/api/feature-flags', adminController.getFeatureFlags);
// 收藏相关路由（参与者登录）
app.post('/api/favorites/:participant_id/toggle', protect, favoriteController.toggle);
app.get('/api/favorites', protect, favoriteController.list);
app.get('/api/favorites/ids', protect, favoriteController.ids);

// 选择优先级相关路由（参与者登录）
app.post('/api/selections', protect, selectionsController.add);
app.delete('/api/selections', protect, selectionsController.remove);
app.get('/api/selections', protect, selectionsController.list);
app.put('/api/selections/reorder', protect, selectionsController.reorder);

// 用户端匹配结果查看路由（参与者登录）
app.get('/api/user/grouping-result', protect, matchingUserController.getUserGroupingResult);
app.get('/api/user/chat-result', protect, matchingUserController.getUserChatResult);
app.get('/api/user/grouping-batches', protect, matchingUserController.getGroupingBatches);
app.get('/api/user/chat-batches', protect, matchingUserController.getChatBatches);

// 管理后台页面路由 - 不需要服务器端认证，由客户端JavaScript处理
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 日志查看页面路由
app.get('/logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logs.html'));
});

// 404 错误处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  // 根据错误类型使用不同的日志级别
  if (error.isBusinessError || error.message === '手机号已被注册') {
    console.warn('业务错误:', error.message);
    return res.status(409).json({
      success: false,
      message: error.message
    });
  }
  
  console.error('未捕获的系统错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器已启动`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

module.exports = app;
