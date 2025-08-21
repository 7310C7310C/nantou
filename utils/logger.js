const fs = require('fs');
const path = require('path');

/**
 * 日志工具类
 * 支持不同环境的日志级别控制
 */

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getLogFileName(level) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`; // YYYY-MM-DD
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  writeToFile(level, message, data = null) {
    const timestamp = this.getLocalTimestamp();
    const logFile = this.getLogFileName(level);
    
    let logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      logEntry += ` | ${JSON.stringify(data)}`;
    }
    logEntry += '\n';

    // 异步写入文件
    fs.appendFile(logFile, logEntry, (err) => {
      if (err) {
        console.error('写入日志文件失败:', err);
      }
    });
  }

  // 获取本地时间戳
  getLocalTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`;
  }

  /**
   * 信息日志 - 重要操作信息
   */
  info(message, data = null) {
    const timestamp = this.getLocalTimestamp();
    console.log(`[${timestamp}] ℹ️  ${message}`);
    if (data && this.isDevelopment) {
      console.log('   📊 数据:', data);
    }
    this.writeToFile('info', message, data);
  }

  /**
   * 成功日志 - 操作成功
   */
  success(message, data = null) {
    const timestamp = this.getLocalTimestamp();
    console.log(`[${timestamp}] ✅ ${message}`);
    if (data && this.isDevelopment) {
      console.log('   📊 数据:', data);
    }
    this.writeToFile('success', message, data);
  }

  /**
   * 警告日志 - 需要注意但不致命的问题
   */
  warn(message, data = null) {
    const timestamp = this.getLocalTimestamp();
    console.warn(`[${timestamp}] ⚠️  ${message}`);
    if (data && this.isDevelopment) {
      console.warn('   📊 数据:', data);
    }
    this.writeToFile('warn', message, data);
  }

  /**
   * 错误日志 - 错误和异常
   */
  error(message, error = null) {
    const timestamp = this.getLocalTimestamp();
    console.error(`[${timestamp}] ❌ ${message}`);
    if (error) {
      console.error('   🔍 错误详情:', error.message || error);
      if (this.isDevelopment && error.stack) {
        console.error('   📍 堆栈跟踪:', error.stack);
      }
    }
    this.writeToFile('error', message, error ? { 
      message: error.message, 
      stack: error.stack 
    } : null);
  }

  /**
   * 调试日志 - 仅在开发环境显示
   */
  debug(message, data = null) {
    if (!this.isDevelopment) return;
    
    const timestamp = this.getLocalTimestamp();
    console.log(`[${timestamp}] 🐛 ${message}`);
    if (data) {
      console.log('   📊 调试数据:', data);
    }
    this.writeToFile('debug', message, data);
  }

  /**
   * 操作日志 - 记录重要业务操作
   */
  operation(operation, userId = null, details = null) {
    const timestamp = this.getLocalTimestamp();
    const userInfo = userId ? `[用户: ${userId}]` : '';
    console.log(`[${timestamp}] 🔄 ${operation} ${userInfo}`);
    
    if (details && this.isDevelopment) {
      console.log('   📋 操作详情:', details);
    }
    this.writeToFile('operation', operation, { userId, ...details });
  }

  /**
   * 安全日志 - 记录安全相关事件
   */
  security(event, userId = null, details = null) {
    const timestamp = this.getLocalTimestamp();
    const userInfo = userId ? `[用户: ${userId}]` : '';
    console.warn(`[${timestamp}] 🔒 ${event} ${userInfo}`);
    
    if (details && this.isDevelopment) {
      console.warn('   🔍 安全详情:', details);
    }
    this.writeToFile('security', event, { userId, ...details });
  }

  // 日志查询方法
  getRecentLogs(level = 'all', lines = 100) {
    if (level === 'all') {
      // 获取所有类型的日志文件
      const logTypes = ['error', 'warn', 'info', 'operation', 'success', 'security'];
      let allLogs = [];
      
      logTypes.forEach(type => {
        const logFile = this.getLogFileName(type);
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const logLines = content.split('\n').filter(line => line.trim());
          allLogs = allLogs.concat(logLines);
        }
      });
      
      // 按时间排序并返回最近的日志
      allLogs.sort((a, b) => {
        const timeAMatch = a.match(/\[(.*?)\]/);
        const timeBMatch = b.match(/\[(.*?)\]/);
        const timeA = timeAMatch ? timeAMatch[1] : '';
        const timeB = timeBMatch ? timeBMatch[1] : '';
        return timeA.localeCompare(timeB);
      });
      
      return allLogs.slice(-lines);
    } else {
      // 获取特定类型的日志
      const logFile = this.getLogFileName(level);
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines.slice(-lines);
    }
  }

  // 按日期获取日志
  getLogsByDate(date, level = 'all') {
    if (level === 'all') {
      // 获取指定日期的所有类型日志文件
      const logTypes = ['error', 'warn', 'info', 'operation', 'success', 'security'];
      let allLogs = [];
      
      logTypes.forEach(type => {
        const logFile = path.join(this.logDir, `${type}-${date}.log`);
        if (fs.existsSync(logFile)) {
          const content = fs.readFileSync(logFile, 'utf8');
          const logLines = content.split('\n').filter(line => line.trim());
          allLogs = allLogs.concat(logLines);
        }
      });
      
      // 按时间排序
      allLogs.sort((a, b) => {
        const timeAMatch = a.match(/\[(.*?)\]/);
        const timeBMatch = b.match(/\[(.*?)\]/);
        const timeA = timeAMatch ? timeAMatch[1] : '';
        const timeB = timeBMatch ? timeBMatch[1] : '';
        return timeA.localeCompare(timeB);
      });
      
      return allLogs;
    } else {
      // 获取指定日期的特定类型日志
      const logFile = path.join(this.logDir, `${level}-${date}.log`);
      
      if (!fs.existsSync(logFile)) {
        return [];
      }

      const content = fs.readFileSync(logFile, 'utf8');
      const logLines = content.split('\n').filter(line => line.trim());
      return logLines;
    }
  }

  // 获取错误统计
  getErrorStats(days = 7) {
    const stats = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const logFile = path.join(this.logDir, `error-${dateStr}.log`);
      
      if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        const errorCount = content.split('\n').filter(line => line.includes('ERROR')).length;
        stats[dateStr] = errorCount;
      } else {
        stats[dateStr] = 0;
      }
    }
    
    return stats;
  }
}

// 创建单例实例
const logger = new Logger();

module.exports = logger; 