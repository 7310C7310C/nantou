const { pool } = require('../config/database');

/**
 * 参与者模型类
 */
class ParticipantModel {
  /**
   * 创建新参与者
   * @param {Object} participantData - 参与者数据
   * @returns {Promise<Object>} 创建结果
   */
  static async create(participantData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 插入参与者基本信息
      const [result] = await connection.execute(
        `INSERT INTO participants (username, password, name, baptismal_name, gender, phone) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          participantData.username,
          participantData.password,
          participantData.name,
          participantData.baptismal_name || null,
          participantData.gender,
          participantData.phone
        ]
      );

      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 批量插入照片记录
   * @param {number} participantId - 参与者ID
   * @param {Array} photos - 照片数据数组
   * @returns {Promise<Array>} 插入结果
   */
  static async insertPhotos(participantId, photos) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const photoRecords = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const isPrimary = i === 0; // 第一张照片设为主照片
        
        const [result] = await connection.execute(
          `INSERT INTO participant_photos (participant_id, photo_url, is_primary, sort_order) 
           VALUES (?, ?, ?, ?)`,
          [participantId, photo.url, isPrimary, i + 1]
        );
        
        photoRecords.push({
          id: result.insertId,
          photo_url: photo.url,
          is_primary: isPrimary,
          sort_order: i + 1
        });
      }

      await connection.commit();
      return photoRecords;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 根据用户名查找参与者
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 参与者信息
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM participants WHERE username = ?',
        [username]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 根据手机号查找参与者
   * @param {string} phone - 手机号
   * @returns {Promise<Object|null>} 参与者信息
   */
  static async findByPhone(phone) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM participants WHERE phone = ?',
        [phone]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 根据ID查找参与者
   * @param {number} id - 参与者ID
   * @returns {Promise<Object|null>} 参与者信息
   */
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM participants WHERE id = ?',
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取所有参与者
   * @returns {Promise<Array>} 参与者列表
   */
  static async findAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          p.id,
          p.username,
          p.name,
          p.baptismal_name,
          p.gender,
          p.phone,
          p.is_checked_in,
          p.created_at,
          COUNT(pp.id) as photo_count
        FROM participants p
        LEFT JOIN participant_photos pp ON p.id = pp.participant_id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取参与者的照片
   * @param {number} participantId - 参与者ID
   * @returns {Promise<Array>} 照片列表
   */
  static async getPhotos(participantId) {
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
      throw error;
    }
  }

  /**
   * 更新参与者信息
   * @param {number} id - 参与者ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<boolean>} 更新是否成功
   */
  static async update(id, updateData) {
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
      throw error;
    }
  }

  /**
   * 删除参与者
   * @param {number} id - 参与者ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  static async delete(id) {
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
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取最新用户名
   * @param {string} gender - 性别
   * @returns {Promise<string|null>} 最新用户名
   */
  static async getLatestUsername(gender) {
    try {
      const prefix = gender === 'male' ? '1' : '2';
      
      const [rows] = await pool.execute(
        'SELECT username FROM participants WHERE username LIKE ? ORDER BY username DESC LIMIT 1',
        [`${prefix}%`]
      );
      
      return rows.length > 0 ? rows[0].username : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 设置主照片
   * @param {number} participantId - 参与者ID
   * @param {number} photoId - 照片ID
   * @returns {Promise<boolean>} 设置是否成功
   */
  static async setPrimaryPhoto(participantId, photoId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 先取消该参与者的所有主照片
      await connection.execute(
        'UPDATE participant_photos SET is_primary = FALSE WHERE participant_id = ?',
        [participantId]
      );

      // 设置新的主照片
      const [result] = await connection.execute(
        'UPDATE participant_photos SET is_primary = TRUE WHERE id = ? AND participant_id = ?',
        [photoId, participantId]
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 删除照片
   * @param {number} photoId - 照片ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  static async deletePhoto(photoId) {
    try {
      const [result] = await pool.execute(
        'DELETE FROM participant_photos WHERE id = ?',
        [photoId]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ParticipantModel;
