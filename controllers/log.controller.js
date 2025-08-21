const logger = require('../utils/logger');

class LogController {
  /**
   * 获取指定日期的日志
   */
  async getRecentLogs(req, res) {
    try {
      const { level = 'all', date } = req.query;
      
      // 如果没有指定日期，使用今天
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const logs = logger.getLogsByDate(targetDate, level);
      
      // 不记录查看日志的操作，避免日志循环
      
      res.json({
        success: true,
        data: {
          logs,
          count: logs.length,
          level,
          date: targetDate
        }
      });
    } catch (error) {
      logger.error('获取日志失败', error);
      res.status(500).json({
        success: false,
        message: '获取日志失败'
      });
    }
  }

  /**
   * 搜索日志
   */
  async searchLogs(req, res) {
    try {
      const { keyword, level = 'all', date } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        });
      }

      // 如果没有指定日期，使用今天
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const logs = logger.getLogsByDate(targetDate, level);
      const filteredLogs = logs.filter(log => 
        log.toLowerCase().includes(keyword.toLowerCase())
      );

      // 不记录搜索日志的操作，避免日志循环
      
      res.json({
        success: true,
        data: {
          logs: filteredLogs,
          count: filteredLogs.length,
          keyword,
          level,
          date: targetDate
        }
      });
    } catch (error) {
      logger.error('搜索日志失败', error);
      res.status(500).json({
        success: false,
        message: '搜索日志失败'
      });
    }
  }
}

module.exports = new LogController(); 