const authService = require('../services/auth.service');

/**
 * 保护路由中间件 - 验证JWT令牌
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 从请求头获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 检查令牌是否存在
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '访问被拒绝，未提供令牌'
      });
    }

    try {
      // 验证令牌
      const decoded = authService.verifyToken(token);
      
      // 根据用户类型获取用户信息
      const userType = decoded.userType || 'staff'; // 兼容旧令牌
      const user = await authService.getUserById(decoded.id, userType);
      
      // 将用户信息添加到请求对象
      req.user = user;
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '无效的令牌'
      });
    }

  } catch (error) {
    console.error('认证中间件错误:', error.message);
    
    return res.status(500).json({
      success: false,
      message: '认证失败'
    });
  }
};

/**
 * 角色限制中间件 - 检查用户角色权限
 * @param {...string} roles - 允许的角色数组
 * @returns {Function} Express中间件函数
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // 确保用户已通过protect中间件认证
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }

    // 检查用户角色是否在允许的角色列表中
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足，无法访问此资源'
      });
    }

    next();
  };
};

/**
 * 可选认证中间件 - 如果提供令牌则验证，否则继续
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // 从请求头获取令牌
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 如果没有令牌，直接继续
    if (!token) {
      return next();
    }

    try {
      // 验证令牌
      const decoded = authService.verifyToken(token);
      
      // 根据用户类型获取用户信息
      const userType = decoded.userType || 'staff'; // 兼容旧令牌
      const user = await authService.getUserById(decoded.id, userType);
      
      // 将用户信息添加到请求对象
      req.user = user;
      
      next();
    } catch (error) {
      // 令牌无效，但不阻止请求继续
      console.warn('可选认证中间件: 无效令牌');
      next();
    }

  } catch (error) {
    console.error('可选认证中间件错误:', error.message);
    next();
  }
};

module.exports = {
  protect,
  restrictTo,
  optionalAuth
};
