const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 获取所有工作人员列表
 * @returns {Array} 工作人员列表
 */
async function getAllStaffUsers() {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        id,
        username,
        role,
        created_at,
        updated_at
      FROM staff_users
      ORDER BY created_at ASC
    `);
    
    return rows;
  } catch (error) {
    console.error('获取工作人员列表错误:', error);
    throw error;
  }
}

/**
 * 创建新工作人员
 * @param {string} role - 角色（admin/staff/matchmaker）
 * @returns {Object} 创建结果
 */
async function createStaffUser(role) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. 生成用户名
    const username = await generateStaffUsername(role, connection);
    logger.info('生成工作人员用户名', { username, role });

    // 2. 生成8位密码（与参与者相同的算法）
    const plainPassword = generatePassword();
    logger.info('生成工作人员密码', { username });

    // 3. 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // 4. 插入工作人员信息
    const [result] = await connection.execute(
      `INSERT INTO staff_users (username, password, role) 
       VALUES (?, ?, ?)`,
      [username, hashedPassword, role]
    );

    const staffId = result.insertId;
    logger.info('工作人员基本信息插入成功', { 
      staff_id: staffId, 
      username, 
      role 
    });

    await connection.commit();

    logger.success('工作人员创建完成', { 
      staff_id: staffId, 
      username, 
      role 
    });

    return {
      staff_id: staffId,
      username: username,
      password: plainPassword, // 返回明文密码
      role: role
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据ID获取工作人员信息
 * @param {number} id - 工作人员ID
 * @returns {Object|null} 工作人员信息
 */
async function getStaffUserById(id) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM staff_users WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取工作人员信息错误:', error);
    throw error;
  }
}

/**
 * 根据用户名获取工作人员信息
 * @param {string} username - 用户名
 * @returns {Object|null} 工作人员信息
 */
async function getStaffUserByUsername(username) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM staff_users WHERE username = ?',
      [username]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取工作人员信息错误:', error);
    throw error;
  }
}

/**
 * 重设工作人员密码
 * @param {number} staffId - 工作人员ID
 * @returns {Object} 重设结果
 */
async function resetStaffPasswordById(staffId) {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查工作人员是否存在
    const [staffUsers] = await connection.execute(
      'SELECT id, username FROM staff_users WHERE id = ?',
      [staffId]
    );

    if (staffUsers.length === 0) {
      logger.warn('重设工作人员密码失败：工作人员不存在', { staffId });
      return {
        success: false,
        message: '工作人员不存在'
      };
    }

    const staffUser = staffUsers[0];
    logger.info('开始重设工作人员密码', { staffId, username: staffUser.username });

    // 2. 生成新密码
    const newPassword = generatePassword();
    logger.info('生成新密码', { staffId, username: staffUser.username });

    // 3. 加密新密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. 更新数据库中的密码
    await connection.execute(
      'UPDATE staff_users SET password = ? WHERE id = ?',
      [hashedPassword, staffId]
    );

    logger.success('工作人员密码重设完成', { staffId, username: staffUser.username });

    return {
      success: true,
      message: '密码重设成功',
      username: staffUser.username,
      new_password: newPassword
    };

  } catch (error) {
    console.error('重设工作人员密码错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除工作人员
 * @param {number} staffId - 工作人员ID
 * @returns {Object} 删除结果
 */
async function deleteStaffById(staffId) {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查工作人员是否存在
    const [staffUsers] = await connection.execute(
      'SELECT id, username, role FROM staff_users WHERE id = ?',
      [staffId]
    );

    if (staffUsers.length === 0) {
      logger.warn('删除工作人员失败：工作人员不存在', { staffId });
      return {
        success: false,
        message: '工作人员不存在'
      };
    }

    const staffUser = staffUsers[0];
    logger.info('开始删除工作人员', { 
      staffId, 
      username: staffUser.username,
      role: staffUser.role 
    });

    // 2. 删除工作人员
    const [result] = await connection.execute(
      'DELETE FROM staff_users WHERE id = ?',
      [staffId]
    );

    if (result.affectedRows === 0) {
      logger.warn('删除工作人员失败：数据库操作无效', { staffId });
      return {
        success: false,
        message: '删除操作失败'
      };
    }

    logger.success('工作人员删除完成', { 
      staffId, 
      username: staffUser.username,
      role: staffUser.role 
    });

    return {
      success: true,
      message: '工作人员删除成功',
      username: staffUser.username,
      role: staffUser.role
    };

  } catch (error) {
    console.error('删除工作人员错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 生成工作人员用户名
 * @param {string} role - 角色
 * @param {Object} connection - 数据库连接（可选）
 * @returns {string} 生成的用户名
 */
async function generateStaffUsername(role, connection = null) {
  const useConnection = connection || pool;
  
  // 根据角色确定前缀
  let prefix;
  switch (role) {
    case 'admin':
      prefix = 'admin';
      break;
    case 'staff':
      prefix = 'staff';
      break;
    case 'matchmaker':
      prefix = 'mk';
      break;
    default:
      throw new Error('无效的角色');
  }
  
  // 查询当前角色的最新用户名
  const [rows] = await useConnection.execute(
    'SELECT username FROM staff_users WHERE username LIKE ? ORDER BY username DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0) {
    const lastUsername = rows[0].username;
    // 提取数字部分
    const numberMatch = lastUsername.match(/\d+$/);
    if (numberMatch) {
      const lastNumber = parseInt(numberMatch[0]);
      nextNumber = lastNumber + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(2, '0')}`;
}

/**
 * 生成8位密码（前4位字母，后4位数字）
 * 与参与者密码生成算法相同
 * @returns {string} 生成的密码
 */
function generatePassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  let password = '';
  
  // 生成前4位字母
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    password += letters[randomIndex];
  }
  
  // 生成后4位数字
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * numbers.length);
    password += numbers[randomIndex];
  }
  
  return password;
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 加密后的密码
 * @returns {boolean} 密码是否正确
 */
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

module.exports = {
  getAllStaffUsers,
  createStaffUser,
  getStaffUserById,
  getStaffUserByUsername,
  resetStaffPasswordById,
  deleteStaffById,
  verifyPassword
};
