const multer = require('multer');
const { registerNewParticipant, deleteParticipantById, resetParticipantPasswordById } = require('../services/participant.service');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// 配置 multer 用于内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 限制
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
            details: '单个文件大小不能超过5MB'
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

module.exports = {
  registerParticipant,
  getAllParticipants,
  getParticipantById,
  getParticipantPhotos,
  setPrimaryPhoto,
  deletePhoto,
  deleteParticipant,
  resetParticipantPassword,
  getParticipantsForCheckin,
  updateParticipantCheckin,
  clearAllCheckins
};
