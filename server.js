const express = require('express');
const path = require('path');
require('dotenv').config();

// 导入控制器和中间件
const authController = require('./controllers/auth.controller');
const adminController = require('./controllers/admin.controller');
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
  res.json({ 
    status: 'OK', 
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});

// 测试路由 - 用于调试
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API路由正常工作',
    timestamp: new Date().toISOString()
  });
});

// 测试认证路由 - 用于调试
app.get('/api/test-auth', protect, (req, res) => {
  res.json({ 
    message: '认证正常工作',
    user: req.user,
    timestamp: new Date().toISOString()
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
app.post('/api/admin/photos/primary', protect, restrictTo('admin', 'staff'), adminController.setPrimaryPhoto);
app.delete('/api/admin/photos/:photo_id', protect, restrictTo('admin', 'staff'), adminController.deletePhoto);

// 管理后台页面路由
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器已启动`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
});

module.exports = app;
