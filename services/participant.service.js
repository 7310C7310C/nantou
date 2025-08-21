const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { uploadPhoto, deletePhoto } = require('./oss.service');

/**
 * 注册新参与者（支持多照片上传）
 * @param {Object} participantData - 参与者数据
 * @param {string} participantData.name - 姓名
 * @param {string} participantData.baptismal_name - 圣名（可选）
 * @param {string} participantData.gender - 性别
 * @param {string} participantData.phone - 手机号
 * @param {Array} participantData.photos - 照片文件数组
 * @returns {Object} 注册结果
 */
async function registerNewParticipant(participantData) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. 检查手机号是否已存在
    const [existingPhones] = await connection.execute(
      'SELECT id FROM participants WHERE phone = ?',
      [participantData.phone]
    );

    if (existingPhones.length > 0) {
      const error = new Error('手机号已被注册');
      error.isBusinessError = true; // 标记为业务错误
      throw error;
    }

    // 2. 生成用户名（男：1001,1002... 女：2001,2002...）
    const username = await generateUsername(participantData.gender);

    // 3. 生成8位密码（大小字母+数字，排除1l0oO）
    const plainPassword = generatePassword();

    // 4. 加密密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

    // 5. 插入参与者基本信息
    const [result] = await connection.execute(
      `INSERT INTO participants (username, password, name, baptismal_name, gender, phone) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        username,
        hashedPassword,
        participantData.name,
        participantData.baptismal_name || null,
        participantData.gender,
        participantData.phone
      ]
    );

    const participantId = result.insertId;
    const photoUrls = [];

    // 5. 处理多张照片上传
    if (participantData.photos && participantData.photos.length > 0) {
      for (let i = 0; i < participantData.photos.length; i++) {
        const photo = participantData.photos[i];
        
        try {
          // 生成文件名：{username}_{index}.jpg
          const fileExtension = getFileExtension(photo.originalname);
          const fileName = `${username}_${i + 1}.${fileExtension}`;
          
          // 上传到OSS
          const photoUrl = await uploadPhoto(photo.buffer, fileName);
          photoUrls.push(photoUrl);
          
          // 插入照片记录到数据库
          const isPrimary = i === 0; // 第一张照片设为主照片
          await connection.execute(
            `INSERT INTO participant_photos (participant_id, photo_url, is_primary, sort_order) 
             VALUES (?, ?, ?, ?)`,
            [participantId, photoUrl, isPrimary, i + 1]
          );
          
        } catch (uploadError) {
          console.error(`照片 ${i + 1} 上传失败:`, uploadError);
          // 继续处理其他照片，不中断整个流程
        }
      }
    }

    await connection.commit();

    return {
      participant_id: participantId,
      username: username,
      password: plainPassword, // 返回明文密码给前端
      photo_count: photoUrls.length,
      photo_urls: photoUrls
    };

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 根据用户名获取参与者信息
 * @param {string} username - 用户名
 * @returns {Object|null} 参与者信息
 */
async function getParticipantByUsername(username) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM participants WHERE username = ?',
      [username]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取参与者信息错误:', error);
    throw error;
  }
}

/**
 * 根据ID获取参与者信息
 * @param {number} id - 参与者ID
 * @returns {Object|null} 参与者信息
 */
async function getParticipantById(id) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM participants WHERE id = ?',
      [id]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('获取参与者信息错误:', error);
    throw error;
  }
}

/**
 * 获取参与者的所有照片
 * @param {number} participantId - 参与者ID
 * @returns {Array} 照片列表
 */
async function getParticipantPhotos(participantId) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, photo_url, is_primary, sort_order, created_at 
       FROM participant_photos 
       WHERE participant_id = ? 
       ORDER BY sort_order ASC, created_at ASC`,
      [participantId]
    );
    
    return rows;
  } catch (error) {
    console.error('获取参与者照片错误:', error);
    throw error;
  }
}

/**
 * 更新参与者信息
 * @param {number} id - 参与者ID
 * @param {Object} updateData - 更新数据
 * @returns {boolean} 更新是否成功
 */
async function updateParticipant(id, updateData) {
  try {
    const allowedFields = ['name', 'baptismal_name', 'gender', 'phone', 'is_checked_in'];
    const updateFields = [];
    const updateValues = [];

    // 只允许更新指定字段
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    }

    if (updateFields.length === 0) {
      return false;
    }

    updateValues.push(id);
    
    const [result] = await pool.execute(
      `UPDATE participants SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error('更新参与者信息错误:', error);
    throw error;
  }
}

/**
 * 删除参与者
 * @param {number} id - 参与者ID
 * @returns {boolean} 删除是否成功
 */
async function deleteParticipant(id) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 删除参与者的所有照片记录
    await connection.execute(
      'DELETE FROM participant_photos WHERE participant_id = ?',
      [id]
    );

    // 删除参与者基本信息
    const [result] = await connection.execute(
      'DELETE FROM participants WHERE id = ?',
      [id]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    console.error('删除参与者错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 删除参与者（包括OSS文件）
 * @param {number} id - 参与者ID
 * @returns {Object} 删除结果
 */
async function deleteParticipantById(id) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. 获取参与者信息和所有照片
    const [participantRows] = await connection.execute(
      'SELECT username FROM participants WHERE id = ?',
      [id]
    );

    if (participantRows.length === 0) {
      return { success: false, message: '参与者不存在' };
    }

    const username = participantRows[0].username;

    // 2. 获取所有照片URL
    const [photoRows] = await connection.execute(
      'SELECT photo_url FROM participant_photos WHERE participant_id = ?',
      [id]
    );

    // 3. 删除OSS中的照片文件
    for (const photo of photoRows) {
      try {
        // 从URL中提取文件名
        const urlParts = photo.photo_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await deletePhoto(fileName);
      } catch (ossError) {
        console.error('删除OSS文件失败:', ossError);
        // 继续删除其他文件，不中断流程
      }
    }

    // 4. 删除数据库中的照片记录
    await connection.execute(
      'DELETE FROM participant_photos WHERE participant_id = ?',
      [id]
    );

    // 5. 删除参与者基本信息
    const [result] = await connection.execute(
      'DELETE FROM participants WHERE id = ?',
      [id]
    );

    await connection.commit();
    
    return { 
      success: true, 
      message: '参与者删除成功',
      deletedPhotos: photoRows.length
    };
  } catch (error) {
    await connection.rollback();
    console.error('删除参与者错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 生成用户名（男：1001,1002... 女：2001,2002...）
 * @param {string} gender - 性别
 * @returns {string} 生成的用户名
 */
async function generateUsername(gender) {
  const prefix = gender === 'male' ? '1' : '2';
  
  // 查询当前性别的最新用户名
  const [rows] = await pool.execute(
    'SELECT username FROM participants WHERE username LIKE ? ORDER BY username DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0) {
    const lastUsername = rows[0].username;
    const lastNumber = parseInt(lastUsername.substring(1));
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

/**
 * 生成8位密码（前4位字母，后4位数字）
 * @returns {string} 生成的密码
 */
function generatePassword() {
  const letters = 'ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
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
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
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

/**
 * 重设参与者密码
 * @param {number} participantId - 参与者ID
 * @returns {Object} 重设结果
 */
async function resetParticipantPasswordById(participantId) {
  const connection = await pool.getConnection();
  
  try {
    // 1. 检查参与者是否存在
    const [participants] = await connection.execute(
      'SELECT id, username FROM participants WHERE id = ?',
      [participantId]
    );

    if (participants.length === 0) {
      return {
        success: false,
        message: '参与者不存在'
      };
    }

    const participant = participants[0];

    // 2. 生成新密码
    const newPassword = generatePassword();

    // 3. 加密新密码
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // 4. 更新数据库中的密码
    await connection.execute(
      'UPDATE participants SET password = ? WHERE id = ?',
      [hashedPassword, participantId]
    );

    return {
      success: true,
      message: '密码重设成功',
      username: participant.username,
      new_password: newPassword
    };

  } catch (error) {
    console.error('重设密码错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  registerNewParticipant,
  getParticipantByUsername,
  getParticipantById,
  getParticipantPhotos,
  updateParticipant,
  deleteParticipant,
  deleteParticipantById,
  verifyPassword,
  resetParticipantPasswordById
};
