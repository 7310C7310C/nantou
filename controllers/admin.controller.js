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
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败'
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

      // 调用服务层处理注册逻辑
      const result = await registerNewParticipant({
        name,
        baptismal_name,
        gender,
        phone,
        photos: req.files // 传递文件数组
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

    res.json({
      success: true,
      data: rows
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
    logger.debug('获取参与者信息请求', { participant_id });
    
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
      logger.warn('参与者不存在', { participant_id });
      return res.status(404).json({
        success: false,
        message: '参与者不存在'
      });
    }

    logger.operation('获取参与者信息', req.user?.id, { participant_id });
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

module.exports = {
  registerParticipant,
  getAllParticipants,
  getParticipantById,
  getParticipantPhotos,
  setPrimaryPhoto,
  deletePhoto,
  deleteParticipant,
  resetParticipantPassword
};
