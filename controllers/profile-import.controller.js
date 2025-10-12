const multer = require('multer');
const ExcelParser = require('../utils/excel-parser');
const ProfileImportService = require('../services/profile-import.service');
const logger = require('../utils/logger');

// 配置 multer（内存存储，不保存到磁盘）
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制 10MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许 xlsx 文件
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .xlsx 格式的 Excel 文件'));
    }
  }
});

/**
 * 资料导入控制器
 */
class ProfileImportController {
  /**
   * 获取 multer 上传中间件
   */
  static getUploadMiddleware() {
    return upload.single('file');
  }
  
  /**
   * 导入 Excel 文件
   */
  static async importProfiles(req, res) {
    try {
      // 检查文件是否上传
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '请上传 Excel 文件'
        });
      }
      
      logger.info(`开始导入 Excel 文件: ${req.file.originalname}, 大小: ${req.file.size} bytes`);
      
      // 1. 解析 Excel 文件
      const parseResult = ExcelParser.parseExcelFile(req.file.buffer);
      
      if (!parseResult.success) {
        logger.error(`Excel 解析失败: ${parseResult.error}`);
        return res.status(400).json({
          success: false,
          message: `Excel 文件解析失败: ${parseResult.error}`
        });
      }
      
      logger.info(`Excel 解析成功，共 ${parseResult.totalRows} 行数据`);
      
      // 2. 导入数据到数据库
      const importResult = await ProfileImportService.importProfiles(parseResult.data);
      
      logger.info('导入完成', importResult.stats);
      
      // 3. 返回结果
      return res.json({
        success: true,
        message: '导入完成',
        stats: importResult.stats,
        unmatchedPhones: importResult.unmatchedPhones,
        errorDetails: importResult.errorDetails
      });
      
    } catch (error) {
      logger.error('导入过程发生错误:', error);
      
      return res.status(500).json({
        success: false,
        message: '导入失败',
        error: error.message
      });
    }
  }
  
  /**
   * 获取导入统计信息（可选功能）
   */
  static async getImportStats(req, res) {
    try {
      // 可以添加统计信息，如：
      // - 已完善资料的用户数
      // - 未完善资料的用户数
      // - 最近导入时间等
      
      const { pool } = require('../config/database');
      
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN profile_completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN profile_completed = 0 THEN 1 ELSE 0 END) as incomplete
        FROM participants
      `);
      
      return res.json({
        success: true,
        stats: stats[0]
      });
      
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      
      return res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: error.message
      });
    }
  }
}

module.exports = ProfileImportController;
