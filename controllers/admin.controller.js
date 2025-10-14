const multer = require('multer');
const { registerNewParticipant, deleteParticipantById, resetParticipantPasswordById } = require('../services/participant.service');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const matchingAdminService = require('../services/matching-admin.service');

// 配置 multer 用于内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'), false);
    }
  }
});

// 多文件上传中间件 - 最多5张照片
const uploadPhotos = upload.array('photos', 5);

/**
 * 注册新参与者（支持多照片上传）
 */
async function registerParticipant(req, res) {
  // 使用多文件上传中间件
  uploadPhotos(req, res, async (err) => {
    try {
      if (err) {
        logger.error('文件上传错误', err);
        
        // 根据错误类型返回不同的错误信息
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: '文件大小超过限制',
            error_type: 'FILE_SIZE_LIMIT',
            details: '单个文件大小不能超过15MB'
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: '文件数量超过限制',
            error_type: 'FILE_COUNT_LIMIT',
            details: '最多只能上传5张照片'
          });
        } else if (err.message === '只允许上传图片文件') {
          return res.status(400).json({
            success: false,
            message: '文件格式不支持',
            error_type: 'FILE_TYPE_ERROR',
            details: '只支持JPG、PNG、GIF等图片格式'
          });
        }
        
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败',
          error_type: 'UPLOAD_ERROR'
        });
      }

      // 检查是否有文件上传
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请至少上传一张照片'
        });
      }

      // 验证必填字段
      const { name, baptismal_name, gender, phone } = req.body;
      
      if (!name || !baptismal_name || !gender || !phone) {
        return res.status(400).json({
          success: false,
          message: '请填写所有必填字段'
        });
      }

      // 验证性别
      if (!['male', 'female'].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: '性别必须是 male 或 female'
        });
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: '请输入有效的手机号码'
        });
      }

      // 记录注册操作开始
      logger.operation('开始注册参与者', req.user?.id, { 
        name, 
        baptismal_name, 
        gender, 
        phone: phone.substring(0, 3) + '****' + phone.substring(7), // 隐藏部分手机号
        photo_count: req.files.length 
      });

      // 调用服务层处理注册逻辑
      const result = await registerNewParticipant({
        name,
        baptismal_name,
        gender,
        phone,
        photos: req.files // 传递文件数组
      });

      // 记录注册成功
      logger.success('参与者注册成功', { 
        participant_id: result.participant_id,
        username: result.username,
        photo_count: result.photo_count,
        operator: req.user?.username
      });

      res.status(201).json({
        success: true,
        message: '参与者注册成功',
        data: {
          participant_id: result.participant_id,
          username: result.username,
          password: result.password, // 返回明文密码给前端
          photo_count: result.photo_count
        }
      });

    } catch (error) {
      // 根据错误类型使用不同的日志级别
      if (error.isBusinessError || error.message === '手机号已被注册') {
        logger.warn('注册参与者业务错误', { 
          message: error.message, 
          phone: req.body.phone 
        });
        
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      logger.error('注册参与者系统错误', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  });
}

/**
 * 获取所有参与者列表
 */
async function getAllParticipants(req, res) {
  try {
    logger.operation('获取参与者列表', req.user?.id, { operator: req.user?.username });
    
    // 获取参与者基本信息
    const [participants] = await pool.execute(`
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

    // 获取每个参与者的照片信息
    const participantsWithPhotos = await Promise.all(participants.map(async (participant) => {
      const [photos] = await pool.execute(`
        SELECT 
          id,
          photo_url,
          is_primary,
          sort_order,
          created_at
        FROM participant_photos 
        WHERE participant_id = ?
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC
      `, [participant.id]);

      return {
        ...participant,
        photos: photos
      };
    }));

    logger.info('参与者列表获取成功', { count: participantsWithPhotos.length, operator: req.user?.username });

    res.json({
      success: true,
      data: participantsWithPhotos
    });
  } catch (error) {
    logger.error('获取参与者列表错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取单个参与者信息
 */
async function getParticipantById(req, res) {
  try {
    const { participant_id } = req.params;
    
    logger.operation('获取参与者信息', req.user?.id, { participant_id, operator: req.user?.username });
    
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
      WHERE p.id = ?
      GROUP BY p.id
    `, [participant_id]);

    if (rows.length === 0) {
      logger.warn('获取参与者信息失败：参与者不存在', { participant_id, operator: req.user?.username });
      return res.status(404).json({
        success: false,
        message: '参与者不存在'
      });
    }

    logger.info('参与者信息获取成功', { participant_id, operator: req.user?.username });

    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    logger.error('获取参与者信息错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取参与者的所有照片
 */
async function getParticipantPhotos(req, res) {
  try {
    const { participant_id } = req.params;
    
    const [rows] = await pool.execute(`
      SELECT 
        id,
        photo_url,
        is_primary,
        sort_order,
        created_at
      FROM participant_photos
      WHERE participant_id = ?
      ORDER BY sort_order ASC, created_at ASC
    `, [participant_id]);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('获取参与者照片错误:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 设置主照片
 */
async function setPrimaryPhoto(req, res) {
  try {
    const { participant_id, photo_id } = req.body;
    
    // 开始事务
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 先取消该参与者的所有主照片
      await connection.execute(`
        UPDATE participant_photos 
        SET is_primary = FALSE 
        WHERE participant_id = ?
      `, [participant_id]);

      // 设置新的主照片
      await connection.execute(`
        UPDATE participant_photos 
        SET is_primary = TRUE 
        WHERE id = ? AND participant_id = ?
      `, [photo_id, participant_id]);

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: '主照片设置成功'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    logger.error('设置主照片错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 删除照片
 */
async function deletePhoto(req, res) {
  try {
    const { photo_id } = req.params;
    
    const [result] = await pool.execute(`
      DELETE FROM participant_photos 
      WHERE id = ?
    `, [photo_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: '照片不存在'
      });
    }

    res.json({
      success: true,
      message: '照片删除成功'
    });
  } catch (error) {
    logger.error('删除照片错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 更新参与者信息
 */
async function updateParticipant(req, res) {
  uploadPhotos(req, res, async (err) => {
    try {
      if (err) {
        logger.error('文件上传错误', err);
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败'
        });
      }

      const { participant_id } = req.params;
      const { name, baptismal_name, gender, phone, deletedPhotoIds, photoOrder } = req.body;
      
      logger.operation('更新参与者信息', req.user?.id, { participant_id });

      // 验证必填字段
      if (!name || !baptismal_name || !gender || !phone) {
        return res.status(400).json({
          success: false,
          message: '请填写所有必填字段'
        });
      }

      // 验证性别
      if (!['male', 'female'].includes(gender)) {
        return res.status(400).json({
          success: false,
          message: '性别必须是 male 或 female'
        });
      }

      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // 1. 更新基本信息
        await connection.execute(
          `UPDATE participants 
           SET name = ?, baptismal_name = ?, gender = ?, phone = ?
           WHERE id = ?`,
          [name, baptismal_name, gender, phone, participant_id]
        );

        // 2. 处理删除的照片（从 OSS 删除文件并从数据库删除记录）
        if (deletedPhotoIds) {
          const idsToDelete = JSON.parse(deletedPhotoIds);
          if (idsToDelete.length > 0) {
            const { deletePhoto } = require('../services/oss.service');
            
            // 先查询要删除的照片 URL
            const placeholders = idsToDelete.map(() => '?').join(',');
            const [photosToDelete] = await connection.execute(
              `SELECT id, photo_url FROM participant_photos WHERE id IN (${placeholders}) AND participant_id = ?`,
              [...idsToDelete, participant_id]
            );
            
            // 从 OSS 删除文件
            for (const photo of photosToDelete) {
              try {
                // 从 URL 中提取文件名（URL 格式：https://domain/filename）
                const fileName = photo.photo_url.split('/').pop();
                await deletePhoto(fileName);
                logger.info('从 OSS 删除照片成功', { photo_id: photo.id, url: photo.photo_url, fileName });
              } catch (deleteError) {
                logger.error('从 OSS 删除照片失败', { photo_id: photo.id, error: deleteError });
                // 继续处理，即使 OSS 删除失败也要从数据库删除记录
              }
            }
            
            // 从数据库删除记录
            await connection.execute(
              `DELETE FROM participant_photos WHERE id IN (${placeholders}) AND participant_id = ?`,
              [...idsToDelete, participant_id]
            );
            
            logger.info('从数据库删除照片记录成功', { participant_id, deleted_count: idsToDelete.length });
          }
        }

        // 3. 更新现有照片的顺序和主图状态
        if (photoOrder) {
          const orderData = JSON.parse(photoOrder);
          for (const item of orderData) {
            await connection.execute(
              `UPDATE participant_photos 
               SET sort_order = ?, is_primary = ?
               WHERE id = ? AND participant_id = ?`,
              [item.sort_order, item.is_primary, item.id, participant_id]
            );
          }
        }

        // 4. 上传新照片
        if (req.files && req.files.length > 0) {
          const { uploadPhoto } = require('../services/oss.service');
          
          // 获取参与者用户名用于生成文件名
          const [participantInfo] = await connection.execute(
            'SELECT username FROM participants WHERE id = ?',
            [participant_id]
          );
          const username = participantInfo[0]?.username || 'unknown';
          
          // 获取当前照片数量（在删除操作之后）
          const [photoCountResult] = await connection.execute(
            'SELECT COUNT(*) as count FROM participant_photos WHERE participant_id = ?',
            [participant_id]
          );
          let currentPhotoCount = photoCountResult[0].count;

          // 确定新照片的起始sort_order
          const [maxSortResult] = await connection.execute(
            'SELECT MAX(sort_order) as max_sort FROM participant_photos WHERE participant_id = ?',
            [participant_id]
          );
          let nextSortOrder = (maxSortResult[0].max_sort || 0) + 1;

          logger.info('准备上传新照片', { 
            participant_id, 
            username,
            new_photos: req.files.length, 
            current_count: currentPhotoCount,
            next_sort_order: nextSortOrder
          });

          for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            if (currentPhotoCount >= 5) {
              logger.warn('照片数量已达上限，跳过剩余照片', { participant_id, currentPhotoCount });
              break; // 最多5张照片
            }

            try {
              // 生成文件名：{username}_{timestamp}.{extension}
              const fileExtension = file.originalname.split('.').pop().toLowerCase();
              const fileName = `${username}_${Date.now()}.${fileExtension}`;
              
              const photoUrl = await uploadPhoto(file.buffer, fileName);
              logger.info('上传照片到 OSS 成功', { participant_id, fileName, url: photoUrl });
              
              await connection.execute(
                `INSERT INTO participant_photos (participant_id, photo_url, is_primary, sort_order)
                 VALUES (?, ?, ?, ?)`,
                [participant_id, photoUrl, false, nextSortOrder]
              );

              currentPhotoCount++;
              nextSortOrder++;
            } catch (uploadError) {
              logger.error('照片上传失败', { participant_id, error: uploadError.message });
              // 继续处理其他照片
            }
          }
          
          logger.info('新照片上传完成', { 
            participant_id, 
            uploaded_count: currentPhotoCount - photoCountResult[0].count 
          });
        }

        // 5. 确保至少有一张主图
        const [primaryCheck] = await connection.execute(
          'SELECT COUNT(*) as count FROM participant_photos WHERE participant_id = ? AND is_primary = TRUE',
          [participant_id]
        );

        if (primaryCheck[0].count === 0) {
          // 如果没有主图，将第一张照片设为主图
          await connection.execute(
            `UPDATE participant_photos 
             SET is_primary = TRUE 
             WHERE participant_id = ? 
             ORDER BY sort_order ASC 
             LIMIT 1`,
            [participant_id]
          );
        }

        await connection.commit();
        
        logger.success('参与者信息更新成功', { participant_id });
        
        res.json({
          success: true,
          message: '信息更新成功'
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      logger.error('更新参与者信息错误', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  });
}

/**
 * 删除参与者（包括所有照片）
 */
async function deleteParticipant(req, res) {
  try {
    const { participant_id } = req.params;
    logger.operation('删除参与者', req.user?.id, { participant_id });
    
    // 调用服务层处理删除逻辑
    const result = await deleteParticipantById(participant_id);
    
    if (result.success) {
      logger.success('参与者删除成功', { participant_id });
      res.json({
        success: true,
        message: '参与者删除成功'
      });
    } else {
      logger.warn('参与者删除失败', { participant_id, reason: result.message });
      res.status(404).json({
        success: false,
        message: result.message || '参与者不存在'
      });
    }
  } catch (error) {
    logger.error('删除参与者错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 重设参与者密码
 */
async function resetParticipantPassword(req, res) {
  try {
    const { participant_id } = req.params;
    logger.operation('重设参与者密码', req.user?.id, { participant_id });
    
    // 调用服务层处理重设密码逻辑
    const result = await resetParticipantPasswordById(participant_id);
    
    if (result.success) {
      logger.success('密码重设成功', { participant_id });
      res.json({
        success: true,
        message: '密码重设成功',
        data: {
          username: result.username,
          new_password: result.new_password
        }
      });
    } else {
      logger.warn('密码重设失败', { participant_id, reason: result.message });
      res.status(404).json({
        success: false,
        message: result.message || '参与者不存在'
      });
    }
  } catch (error) {
    logger.error('重设密码错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取用于签到面板的参与者列表
 */
async function getParticipantsForCheckin(req, res) {
  try {
    logger.operation('获取签到参与者列表', req.user?.id, { operator: req.user?.username });
    
    // 获取所有参与者的基本信息和签到状态
    const [participants] = await pool.execute(`
      SELECT 
        p.id,
        p.username,
        p.name,
        p.baptismal_name,
        p.gender,
        p.is_checked_in,
        p.created_at
      FROM participants p
      ORDER BY p.id ASC
    `);

    logger.info('签到参与者列表获取成功', { count: participants.length, operator: req.user?.username });

    res.json({
      success: true,
      data: participants
    });
  } catch (error) {
    logger.error('获取签到参与者列表错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 更新参与者签到状态
 */
async function updateParticipantCheckin(req, res) {
  try {
    const { id } = req.params;
    const { isCheckedIn } = req.body;
    
    // 验证参数
    if (typeof isCheckedIn !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isCheckedIn 必须是布尔值'
      });
    }

    logger.operation('更新参与者签到状态', req.user?.id, { 
      participant_id: id, 
      isCheckedIn, 
      operator: req.user?.username 
    });

    // 首先检查参与者是否存在
    const [participantRows] = await pool.execute(
      'SELECT id, username, name, baptismal_name, gender, is_checked_in FROM participants WHERE id = ?',
      [id]
    );

    if (participantRows.length === 0) {
      logger.warn('更新签到状态失败：参与者不存在', { participant_id: id, operator: req.user?.username });
      return res.status(404).json({
        success: false,
        message: '参与者不存在'
      });
    }

    const participant = participantRows[0];
    
    // 更新签到状态
    const [result] = await pool.execute(
      'UPDATE participants SET is_checked_in = ? WHERE id = ?',
      [isCheckedIn, id]
    );

    if (result.affectedRows === 0) {
      logger.warn('更新签到状态失败', { participant_id: id, operator: req.user?.username });
      return res.status(500).json({
        success: false,
        message: '更新签到状态失败'
      });
    }

    // 记录操作成功
    const action = isCheckedIn ? '签到' : '取消签到';
    logger.success(`参与者${action}成功`, { 
      participant_id: id,
      username: participant.username,
      name: participant.name,
      action,
      operator: req.user?.username 
    });

    res.json({
      success: true,
      message: `${action}成功`,
      data: {
        id: participant.id,
        username: participant.username,
        name: participant.name,
        baptismal_name: participant.baptismal_name,
        gender: participant.gender,
        is_checked_in: isCheckedIn
      }
    });

  } catch (error) {
    logger.error('更新签到状态错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 清空所有人的签到状态
 */
async function clearAllCheckins(req, res) {
  try {
    const { action } = req.body;
    
    // 验证操作确认
    if (action !== '确定') {
      return res.status(400).json({ 
        success: false,
        message: '操作未确认，请输入"确定"以确认清空操作' 
      });
    }

    // 验证操作员权限
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ 
        success: false,
        message: '权限不足，只有管理员或工作人员可以清空签到状态' 
      });
    }

    logger.operation('开始清空所有签到状态', req.user?.id, { 
      operator: req.user?.username,
      timestamp: new Date().toISOString()
    });

    // 获取清空前的统计信息
    const [beforeStats] = await pool.execute(
      'SELECT COUNT(*) as total, SUM(is_checked_in) as checkedIn FROM participants'
    );
    
    // 执行清空操作
    const [result] = await pool.execute('UPDATE participants SET is_checked_in = 0');

    // 记录操作成功
    logger.success('清空签到状态成功', {
      operatorId: req.user.id,
      operatorRole: req.user.role,
      operatorUsername: req.user.username,
      totalParticipants: beforeStats[0].total,
      previousCheckedIn: beforeStats[0].checkedIn,
      affectedRows: result.affectedRows,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: '所有签到状态已清空',
      data: {
        totalParticipants: beforeStats[0].total,
        previousCheckedIn: beforeStats[0].checkedIn,
        affectedRows: result.affectedRows
      }
    });

  } catch (error) {
    logger.error('清空签到状态失败', error);
    res.status(500).json({ 
      success: false,
      message: '清空签到状态失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取功能开关状态
 */
async function getFeatureFlags(req, res) {
  try {
    const [rows] = await pool.execute(
      'SELECT grouping_enabled, chat_enabled FROM feature_flags LIMIT 1'
    );

    let featureFlags;
    if (rows.length === 0) {
      // 如果没有记录，返回默认值
      featureFlags = {
        grouping_enabled: false,
        chat_enabled: false
      };
    } else {
      featureFlags = {
        grouping_enabled: Boolean(rows[0].grouping_enabled),
        chat_enabled: Boolean(rows[0].chat_enabled)
      };
    }

    // logger.info('获取功能开关状态成功', { featureFlags });
    
    res.json({
      success: true,
      message: '获取功能开关状态成功',
      featureFlags
    });

  } catch (error) {
    logger.error('获取功能开关状态失败', error);
    res.status(500).json({ 
      success: false,
      message: '获取功能开关状态失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 更新功能开关状态
 */
async function updateFeatureFlags(req, res) {
  try {
    const { grouping_enabled, chat_enabled } = req.body;

    // 验证输入
    if (typeof grouping_enabled !== 'boolean' || typeof chat_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '功能开关状态必须是布尔值'
      });
    }

    // 确保不能同时开启两个功能
    if (grouping_enabled && chat_enabled) {
      return res.status(400).json({
        success: false,
        message: '分组功能和聊天任务功能不能同时开启'
      });
    }

    // 检查是否已有记录
    const [existingRows] = await pool.execute(
      'SELECT id FROM feature_flags LIMIT 1'
    );

    if (existingRows.length === 0) {
      // 插入新记录
      await pool.execute(
        'INSERT INTO feature_flags (grouping_enabled, chat_enabled) VALUES (?, ?)',
        [grouping_enabled, chat_enabled]
      );
    } else {
      // 更新现有记录
      await pool.execute(
        'UPDATE feature_flags SET grouping_enabled = ?, chat_enabled = ? WHERE id = ?',
        [grouping_enabled, chat_enabled, existingRows[0].id]
      );
    }

    logger.info('更新功能开关状态成功', { 
      grouping_enabled, 
      chat_enabled,
      operator: req.user?.username || 'unknown'
    });
    
    res.json({
      success: true,
      message: '功能开关设置已更新',
      featureFlags: {
        grouping_enabled,
        chat_enabled
      }
    });

  } catch (error) {
    logger.error('更新功能开关状态失败', error);
    res.status(500).json({ 
      success: false,
      message: '更新功能开关状态失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取互选情况数据
 */
async function getSelectionsData(req, res) {
  try {
    logger.operation('获取互选情况数据', req.user?.id, { operator: req.user?.username });
    
    // 获取所有已签到参与者的基本信息和照片
    const [participants] = await pool.execute(`
      SELECT 
        p.id,
        p.username,
        p.name,
        p.baptismal_name,
        p.gender,
        p.phone,
        p.is_checked_in,
        pp.photo_url
      FROM participants p
      LEFT JOIN participant_photos pp ON p.id = pp.participant_id AND pp.is_primary = 1
      WHERE p.is_checked_in = 1
      ORDER BY p.id ASC
    `);

    // 获取所有的互选记录（只包含已签到参与者）
    const [selections] = await pool.execute(`
      SELECT 
        s.user_id,
        s.target_id,
        s.priority,
        s.created_at,
        u.name as user_name,
        u.baptismal_name as user_baptismal,
        u.username as user_username,
        u.gender as user_gender,
        t.name as target_name,
        t.baptismal_name as target_baptismal,
        t.username as target_username,
        t.gender as target_gender
      FROM selections s
      JOIN participants u ON s.user_id = u.id
      JOIN participants t ON s.target_id = t.id
      WHERE u.is_checked_in = 1 AND t.is_checked_in = 1
      ORDER BY s.user_id ASC, s.priority ASC
    `);

    // 构建互选关系映射
    const mutualSelections = new Set();
    const selectionMap = {};
    
    // 建立选择映射
    selections.forEach(s => {
      if (!selectionMap[s.user_id]) {
        selectionMap[s.user_id] = [];
      }
      selectionMap[s.user_id].push(s.target_id);
    });
    
    // 找出互选关系
    selections.forEach(s => {
      if (selectionMap[s.target_id] && selectionMap[s.target_id].includes(s.user_id)) {
        mutualSelections.add(`${Math.min(s.user_id, s.target_id)}-${Math.max(s.user_id, s.target_id)}`);
      }
    });

    // 将数据组织成更易于前端使用的格式
    const selectionsData = {
      participants: participants,
      selections: selections,
      mutualSelections: Array.from(mutualSelections),
      summary: {
        totalParticipants: participants.length,
        maleCount: participants.filter(p => p.gender === 'male').length,
        femaleCount: participants.filter(p => p.gender === 'female').length
      }
    };

    res.json({
      success: true,
      data: selectionsData
    });

  } catch (error) {
    logger.error('获取互选情况数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取互选情况数据失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 验证用户选择状态
 */
async function validateUserSelections(req, res) {
  try {
    const validation = await matchingAdminService.validateUserSelections();
    
    res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('验证用户选择状态失败', error);
    res.status(500).json({
      success: false,
      message: '验证用户选择状态失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 执行分组匹配算法
 */
async function executeGroupMatching(req, res) {
  try {
    logger.info('收到分组匹配执行请求', { body: req.body, user: req.user?.username });
    logger.operation('执行分组匹配算法', req.user?.id, { operator: req.user?.username });
    
    const { group_size_male = 3, group_size_female = 3 } = req.body;

    // 验证输入
    if (!Number.isInteger(group_size_male) || group_size_male < 1) {
      return res.status(400).json({
        success: false,
        message: '男性组大小必须是大于等于1的整数'
      });
    }

    if (!Number.isInteger(group_size_female) || group_size_female < 1) {
      return res.status(400).json({
        success: false,
        message: '女性组大小必须是大于等于1的整数'
      });
    }

    // 检查功能开关
    const [flagRows] = await pool.execute(
      'SELECT grouping_enabled FROM feature_flags LIMIT 1'
    );

    if (flagRows.length === 0 || !flagRows[0].grouping_enabled) {
      return res.status(400).json({
        success: false,
        message: '分组匹配功能未开启'
      });
    }

    const options = { group_size_male, group_size_female };
    const result = await matchingAdminService.executeGroupMatching(options);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('执行分组匹配算法失败', error);
    res.status(500).json({
      success: false,
      message: '执行分组匹配算法失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 执行聊天匹配算法
 */
async function executeChatMatching(req, res) {
  try {
    logger.info('收到聊天匹配执行请求', { body: req.body, user: req.user?.username });
    logger.operation('执行聊天匹配算法', req.user?.id, { operator: req.user?.username });
    
    const { list_size = 5 } = req.body;

    // 验证输入
    if (!Number.isInteger(list_size) || list_size < 1) {
      return res.status(400).json({
        success: false,
        message: '名单大小必须是大于等于1的整数'
      });
    }

    // 检查功能开关
    const [flagRows] = await pool.execute(
      'SELECT chat_enabled FROM feature_flags LIMIT 1'
    );

    if (flagRows.length === 0 || !flagRows[0].chat_enabled) {
      return res.status(400).json({
        success: false,
        message: '聊天匹配功能未开启'
      });
    }

    const options = { list_size };
    const result = await matchingAdminService.executeChatMatching(options);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('执行聊天匹配算法失败', error);
    res.status(500).json({
      success: false,
      message: '执行聊天匹配算法失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取分组匹配历史
 */
async function getGroupingHistory(req, res) {
  try {
    const history = await matchingAdminService.getGroupingHistory();
    
    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('获取分组匹配历史失败', error);
    res.status(500).json({
      success: false,
      message: '获取分组匹配历史失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取聊天匹配历史
 */
async function getChatHistory(req, res) {
  try {
    const history = await matchingAdminService.getChatHistory();
    
    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('获取聊天匹配历史失败', error);
    res.status(500).json({
      success: false,
      message: '获取聊天匹配历史失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取指定轮次的分组匹配结果
 */
async function getGroupingResult(req, res) {
  try {
    const { runBatch } = req.params;
    
    if (!Number.isInteger(parseInt(runBatch)) || parseInt(runBatch) < 1) {
      return res.status(400).json({
        success: false,
        message: '轮次号必须是大于等于1的整数'
      });
    }

    const result = await matchingAdminService.getGroupingResult(parseInt(runBatch));
    
    res.json({
      success: true,
      data: {
        runBatch: parseInt(runBatch),
        groups: result
      }
    });

  } catch (error) {
    logger.error('获取分组匹配结果失败', error);
    res.status(500).json({
      success: false,
      message: '获取分组匹配结果失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取指定轮次的聊天匹配结果
 */
async function getChatResult(req, res) {
  try {
    const { runBatch } = req.params;
    
    if (!Number.isInteger(parseInt(runBatch)) || parseInt(runBatch) < 1) {
      return res.status(400).json({
        success: false,
        message: '轮次号必须是大于等于1的整数'
      });
    }

    const result = await matchingAdminService.getChatResult(parseInt(runBatch));
    
    res.json({
      success: true,
      data: {
        runBatch: parseInt(runBatch),
        chatLists: result
      }
    });

  } catch (error) {
    logger.error('获取聊天匹配结果失败', error);
    res.status(500).json({
      success: false,
      message: '获取聊天匹配结果失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取人员情况统计（基于selections表）
 * 返回每个用户被多少人喜欢的统计
 */
/**
 * 获取收藏情况统计
 */
async function getFavoriteStats(req, res) {
  try {
    const connection = await pool.getConnection();
    
    try {
      // 获取所有参与者及其被收藏次数
      const query = `
        SELECT 
          p.id,
          p.username,
          p.name,
          p.gender,
          COUNT(DISTINCT f.user_id) as favorite_count
        FROM participants p
        LEFT JOIN favorites f ON f.favorited_participant_id = p.id
        GROUP BY p.id, p.username, p.name, p.gender
        ORDER BY favorite_count DESC, p.id ASC
      `;
      
      const [rows] = await connection.query(query);
      
      // 按性别分组
      const maleParticipants = rows.filter(p => p.gender === 'male');
      const femaleParticipants = rows.filter(p => p.gender === 'female');
      
      res.json({
        success: true,
        data: {
          male: maleParticipants,
          female: femaleParticipants
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    logger.error('获取收藏情况统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取收藏情况统计失败，请稍后重试',
      details: error.message
    });
  }
}

/**
 * 获取终选情况统计
 */
async function getParticipantStats(req, res) {
  try {
    const connection = await pool.getConnection();
    
    try {
      // 获取所有已签到的参与者及其被选择次数
      const query = `
        SELECT 
          p.id,
          p.username,
          p.name,
          p.gender,
          COUNT(DISTINCT s.user_id) as liked_count
        FROM participants p
        LEFT JOIN selections s ON s.target_id = p.id
        WHERE p.is_checked_in = 1
        GROUP BY p.id, p.username, p.name, p.gender
        ORDER BY liked_count DESC, p.id ASC
      `;
      
      const [rows] = await connection.query(query);
      
      // 按性别分组
      const maleParticipants = rows.filter(p => p.gender === 'male');
      const femaleParticipants = rows.filter(p => p.gender === 'female');
      
      res.json({
        success: true,
        data: {
          male: maleParticipants,
          female: femaleParticipants
        }
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    logger.error('获取终选情况统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取终选情况统计失败，请稍后重试',
      details: error.message
    });
  }
}

/**
 * 获取收藏某人的详细人员列表
 */
async function getFavoriteDetail(req, res) {
  try {
    const { targetId } = req.params;
    
    const connection = await pool.getConnection();
    
    try {
      // 获取收藏该目标用户的所有人员信息
      const query = `
        SELECT 
          p.id,
          p.username,
          p.name
        FROM favorites f
        INNER JOIN participants p ON f.user_id = p.id
        WHERE f.favorited_participant_id = ?
        ORDER BY f.created_at DESC
      `;
      
      const [rows] = await connection.query(query, [targetId]);
      
      res.json({
        success: true,
        data: rows
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    logger.error('获取收藏详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取收藏详情失败，请稍后重试',
      details: error.message
    });
  }
}

/**
 * 获取选择某人的详细人员列表
 */
async function getSelectionDetail(req, res) {
  try {
    const { targetId } = req.params;
    
    const connection = await pool.getConnection();
    
    try {
      // 获取选择该目标用户的所有人员信息
      const query = `
        SELECT 
          p.id,
          p.username,
          p.name
        FROM selections s
        INNER JOIN participants p ON s.user_id = p.id
        WHERE s.target_id = ?
        ORDER BY s.created_at DESC
      `;
      
      const [rows] = await connection.query(query, [targetId]);
      
      res.json({
        success: true,
        data: rows
      });
      
    } finally {
      connection.release();
    }
    
  } catch (error) {
    logger.error('获取选择详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取选择详情失败，请稍后重试',
      details: error.message
    });
  }
}

/**
 * 切换参与者置顶状态
 */
async function toggleParticipantPin(req, res) {
  try {
    const { id } = req.params;
    const participantId = parseInt(id);

    if (isNaN(participantId)) {
      return res.status(400).json({
        success: false,
        message: '无效的参与者ID'
      });
    }

    logger.operation('切换参与者置顶状态', req.user?.id, { 
      participant_id: participantId, 
      operator: req.user?.username 
    });

    // 获取当前置顶状态
    const [rows] = await pool.execute(
      'SELECT id, name, is_pinned FROM participants WHERE id = ?',
      [participantId]
    );

    if (rows.length === 0) {
      logger.warn('切换置顶失败：参与者不存在', { participant_id: participantId });
      return res.status(404).json({
        success: false,
        message: '参与者不存在'
      });
    }

    const participant = rows[0];
    const newPinnedState = participant.is_pinned ? 0 : 1;

    // 更新置顶状态
    await pool.execute(
      'UPDATE participants SET is_pinned = ? WHERE id = ?',
      [newPinnedState, participantId]
    );

    logger.info('置顶状态切换成功', {
      participant_id: participantId,
      participant_name: participant.name,
      new_state: newPinnedState,
      operator: req.user?.username
    });

    res.json({
      success: true,
      data: {
        participantId: participantId,
        isPinned: newPinnedState === 1
      },
      message: newPinnedState === 1 ? '置顶成功' : '取消置顶成功'
    });
  } catch (error) {
    logger.error('切换置顶状态错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  registerParticipant,
  getAllParticipants,
  getParticipantById,
  getParticipantPhotos,
  setPrimaryPhoto,
  deletePhoto,
  updateParticipant,
  deleteParticipant,
  resetParticipantPassword,
  getParticipantsForCheckin,
  updateParticipantCheckin,
  clearAllCheckins,
  getFeatureFlags,
  updateFeatureFlags,
  getSelectionsData,
  validateUserSelections,
  executeGroupMatching,
  executeChatMatching,
  getGroupingHistory,
  getChatHistory,
  getGroupingResult,
  getChatResult,
  getFavoriteStats,
  getParticipantStats,
  getFavoriteDetail,
  getSelectionDetail,
  toggleParticipantPin
};
