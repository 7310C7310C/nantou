const authService = require('../services/auth.service');

class AuthController {
  /**
   * 用户登录
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // 验证输入
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      // 调用认证服务
      const result = await authService.login(username, password);

      // 返回成功响应
      res.status(200).json(result);

    } catch (error) {
      console.error('登录错误:', error.message);
      
      res.status(401).json({
        success: false,
        message: error.message || '登录失败'
      });
    }
  }

  /**
   * 获取当前用户信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getCurrentUser(req, res) {
    try {
      // 用户信息已通过中间件添加到req.user
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户未认证'
        });
      }

      // 构建用户信息对象
      const userInfo = {
        id: user.id,
        username: user.username,
        role: user.role,
        userType: user.userType
      };

      // 如果是参与者，添加额外信息
      if (user.userType === 'participant') {
        userInfo.name = user.name;
        userInfo.baptismal_name = user.baptismal_name;
        userInfo.gender = user.gender;
  // 包含签到状态，前端用来判断是否已 sign
  userInfo.is_checked_in = !!user.is_checked_in;
      }

      res.status(200).json({
        success: true,
        data: {
          user: userInfo
        }
      });

    } catch (error) {
      console.error('获取用户信息错误:', error.message);
      
      res.status(500).json({
        success: false,
        message: '获取用户信息失败'
      });
    }
  }

  /**
   * 用户登出
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async logout(req, res) {
    try {
      // 由于JWT是无状态的，服务器端不需要特殊处理
      // 客户端需要删除本地存储的令牌
      res.status(200).json({
        success: true,
        message: '登出成功'
      });

    } catch (error) {
      console.error('登出错误:', error.message);
      
      res.status(500).json({
        success: false,
        message: '登出失败'
      });
    }
  }
}

module.exports = new AuthController();
