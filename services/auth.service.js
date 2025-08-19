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
      // 查询用户
      const [users] = await pool.execute(
        'SELECT id, username, password, role FROM staff_users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        throw new Error('用户名或密码错误');
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('用户名或密码错误');
      }

      // 生成JWT令牌
      const token = this.generateToken(user);

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: user.id,
        username: user.username,
        role: user.role
      };

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
   * @returns {string} JWT令牌
   */
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
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
   * @returns {Promise<Object>} 用户信息
   */
  async getUserById(userId) {
    try {
      const [users] = await pool.execute(
        'SELECT id, username, role FROM staff_users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('用户不存在');
      }

      return users[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuthService(); 