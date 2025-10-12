const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 资料导入服务类
 */
class ProfileImportService {
  /**
   * 导入参与者详细资料
   * @param {Array} parsedData - 解析后的数据数组
   * @returns {Promise<Object>} 导入结果统计
   */
  static async importProfiles(parsedData) {
    const stats = {
      total: parsedData.length,
      matched: 0,
      created: 0,
      updated: 0,
      unmatched: 0,
      errors: 0
    };
    
    const unmatchedPhones = [];
    const errorDetails = [];
    
    // 逐条处理数据
    for (const row of parsedData) {
      try {
        // 跳过无效行
        if (!row.phone || row.errors.length > 0) {
          stats.errors++;
          errorDetails.push({
            rowNumber: row.rowNumber,
            phone: row.phone || '未知',
            errors: row.errors
          });
          continue;
        }
        
        // 根据手机号查找参与者
        const participant = await this.findParticipantByPhone(row.phone);
        
        if (!participant) {
          // 未匹配到参与者
          stats.unmatched++;
          unmatchedPhones.push(row.phone);
          continue;
        }
        
        // 匹配成功
        stats.matched++;
        
        // 检查是否需要更新（至少有一个字段有新值或需要清空）
        const needsUpdate = await this.checkNeedsUpdate(participant.id, row.profileData);
        
        if (needsUpdate) {
          // 更新详细资料
          await this.updateProfile(participant.id, row.profileData);
          stats.updated++;
        } else {
          // 虽然匹配但无需更新（数据相同）
          stats.created++;
        }
        
      } catch (error) {
        stats.errors++;
        errorDetails.push({
          rowNumber: row.rowNumber,
          phone: row.phone,
          errors: [error.message]
        });
        logger.error(`导入第 ${row.rowNumber} 行失败:`, error);
      }
    }
    
    return {
      stats,
      unmatchedPhones,
      errorDetails
    };
  }
  
  /**
   * 根据手机号查找参与者
   * @param {string} phone - 手机号
   * @returns {Promise<Object|null>} 参与者信息
   */
  static async findParticipantByPhone(phone) {
    try {
      const [rows] = await pool.execute(
        'SELECT id, phone FROM participants WHERE phone = ?',
        [phone]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 检查是否需要更新
   * @param {number} participantId - 参与者ID
   * @param {Object} newData - 新数据
   * @returns {Promise<boolean>} 是否需要更新
   */
  static async checkNeedsUpdate(participantId, newData) {
    try {
      // 获取当前数据
      const fields = Object.keys(newData).join(', ');
      const [rows] = await pool.execute(
        `SELECT ${fields} FROM participants WHERE id = ?`,
        [participantId]
      );
      
      if (rows.length === 0) return false;
      
      const currentData = rows[0];
      
      // 比较每个字段
      for (const [field, newValue] of Object.entries(newData)) {
        const currentValue = currentData[field];
        
        // 如果新值和当前值不同，需要更新
        if (newValue !== currentValue) {
          return true;
        }
      }
      
      return false;
      
    } catch (error) {
      // 如果检查失败，默认需要更新
      logger.error('检查更新状态失败:', error);
      return true;
    }
  }
  
  /**
   * 更新参与者详细资料
   * @param {number} participantId - 参与者ID
   * @param {Object} profileData - 资料数据
   * @returns {Promise<void>}
   */
  static async updateProfile(participantId, profileData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 构建更新 SQL
      const fields = Object.keys(profileData);
      const values = Object.values(profileData);
      
      if (fields.length === 0) {
        await connection.rollback();
        return;
      }
      
      // 动态构建 SET 子句
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      // 更新详细资料并设置 profile_completed = 1
      const sql = `
        UPDATE participants 
        SET ${setClause}, profile_completed = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      await connection.execute(sql, [...values, participantId]);
      
      await connection.commit();
      
      logger.info(`成功更新参与者 ${participantId} 的详细资料`);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 批量导入（事务处理版本，可选）
   * 注：当前实现是逐条处理，错误不影响其他记录
   * 如需全部成功或全部失败，可使用此方法
   */
  static async importProfilesWithTransaction(parsedData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const result = await this.importProfiles(parsedData);
      
      await connection.commit();
      
      return result;
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = ProfileImportService;
