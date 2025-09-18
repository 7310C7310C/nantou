const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

class AuthService {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(username, password) {
    try {
      let user = null;
      let userType = null;

      // 首先尝试在 staff_users 表中查找（管理员）
      const [staffUsers] = await pool.execute(
        'SELECT id, username, password, role FROM staff_users WHERE username = ?',
        [username]
      );

      if (staffUsers.length > 0) {
        user = staffUsers[0];
        userType = 'staff';
      } else {
        // 如果不在 staff_users 表中，尝试在 participants 表中查找（参与者）
  const [participants] = await pool.execute(
  'SELECT id, username, password, name, baptismal_name, gender, is_checked_in FROM participants WHERE username = ?',
  [username]
  );

        if (participants.length > 0) {
          user = participants[0];
          userType = 'participant';
        }
      }

      if (!user) {
        throw new Error('用户名或密码错误');
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('用户名或密码错误');
      }

      // 生成JWT令牌
      const token = this.generateToken(user, userType);

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: user.id,
        username: user.username,
        role: userType === 'staff' ? user.role : 'participant',
        userType: userType
      };

      // 如果是参与者，添加额外信息
      if (userType === 'participant') {
        userInfo.name = user.name;
        userInfo.baptismal_name = user.baptismal_name;
        userInfo.gender = user.gender;
        // 将签到状态包含在返回的用户信息中，便于前端判断是否已 sign
        userInfo.is_checked_in = !!user.is_checked_in;
      }

      return {
        success: true,
        message: '登录成功',
        data: {
          user: userInfo,
          token
        }
      };

    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成JWT令牌
   * @param {Object} user - 用户对象
   * @param {string} userType - 用户类型 ('staff' 或 'participant')
   * @returns {string} JWT令牌
   */
  generateToken(user, userType) {
    const payload = {
      id: user.id,
      username: user.username,
      role: userType === 'staff' ? user.role : 'participant',
      userType: userType
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * 验证JWT令牌
   * @param {string} token - JWT令牌
   * @returns {Object} 解码后的用户信息
   */
  verifyToken(token) {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('无效的令牌');
    }
  }

  /**
   * 根据用户ID获取用户信息
   * @param {number} userId - 用户ID
   * @param {string} userType - 用户类型 ('staff' 或 'participant')
   * @returns {Promise<Object>} 用户信息
   */
  async getUserById(userId, userType = 'staff') {
    try {
      let user = null;

      if (userType === 'staff') {
        const [users] = await pool.execute(
          'SELECT id, username, role FROM staff_users WHERE id = ?',
          [userId]
        );

        if (users.length > 0) {
          user = users[0];
          user.userType = 'staff';
        }
      } else if (userType === 'participant') {
        const [users] = await pool.execute(
        'SELECT id, username, name, baptismal_name, gender, is_checked_in FROM participants WHERE id = ?',
        [userId]
        );

        if (users.length > 0) {
          user = users[0];
          user.role = 'participant';
          user.userType = 'participant';
        }
      }

      if (!user) {
        throw new Error('用户不存在');
      }

      return user;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService(); 