const express = require('express');
const path = require('path');
require('dotenv').config();

// 设置时区为北京时间
process.env.TZ = 'Asia/Shanghai';

// 导入控制器和中间件
const authController = require('./controllers/auth.controller');
const adminController = require('./controllers/admin.controller');
const logController = require('./controllers/log.controller');
const { protect, restrictTo } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

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
app.get('/api/admin/participants/:participant_id/photos', protect, restrictTo('admin', 'staff'), adminController.getParticipantPhotos);
app.get('/api/admin/participants/:participant_id', protect, restrictTo('admin', 'staff'), adminController.getParticipantById);
app.delete('/api/admin/participants/:participant_id', protect, restrictTo('admin', 'staff'), adminController.deleteParticipant);
app.post('/api/admin/participants/:participant_id/reset-password', protect, restrictTo('admin', 'staff'), adminController.resetParticipantPassword);
app.post('/api/admin/photos/primary', protect, restrictTo('admin', 'staff'), adminController.setPrimaryPhoto);
app.delete('/api/admin/photos/:photo_id', protect, restrictTo('admin', 'staff'), adminController.deletePhoto);

// 日志管理API路由
app.get('/api/admin/logs', protect, restrictTo('admin'), logController.getRecentLogs);
app.get('/api/admin/logs/search', protect, restrictTo('admin'), logController.searchLogs);

// 管理后台页面路由
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
app.listen(PORT, () => {
  console.log(`🚀 服务器已启动`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

module.exports = app;
