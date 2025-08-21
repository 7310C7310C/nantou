const logger = require('../utils/logger');

class LogController {
  /**
   * 获取最近的日志
   */
  async getRecentLogs(req, res) {
    try {
      const { level = 'all', lines = 100 } = req.query;
      const logs = logger.getRecentLogs(level, parseInt(lines));
      
      logger.operation('查看日志', req.user?.id, { level, lines });
      
      res.json({
        success: true,
        data: {
          logs,
          count: logs.length,
          level,
          lines: parseInt(lines)
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
   * 获取错误统计
   */
  async getErrorStats(req, res) {
    try {
      const { days = 7 } = req.query;
      const stats = logger.getErrorStats(parseInt(days));
      
      logger.operation('查看错误统计', req.user?.id, { days });
      
      res.json({
        success: true,
        data: {
          stats,
          totalErrors: Object.values(stats).reduce((sum, count) => sum + count, 0),
          days: parseInt(days)
        }
      });
    } catch (error) {
      logger.error('获取错误统计失败', error);
      res.status(500).json({
        success: false,
        message: '获取错误统计失败'
      });
    }
  }

  /**
   * 搜索日志
   */
  async searchLogs(req, res) {
    try {
      const { keyword, level = 'all', startDate, endDate } = req.query;
      
      if (!keyword) {
        return res.status(400).json({
          success: false,
          message: '请提供搜索关键词'
        });
      }

      // 这里可以实现更复杂的日志搜索逻辑
      const logs = logger.getRecentLogs(level, 1000);
      const filteredLogs = logs.filter(log => 
        log.toLowerCase().includes(keyword.toLowerCase())
      );

      logger.operation('搜索日志', req.user?.id, { keyword, level });
      
      res.json({
        success: true,
        data: {
          logs: filteredLogs,
          count: filteredLogs.length,
          keyword,
          level
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