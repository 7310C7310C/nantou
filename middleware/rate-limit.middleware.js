const logger = require('../utils/logger');

/**
 * 速率限制器类
 * 用于防止暴力破解登录，支持 IP 和用户名双重限制
 */
class RateLimiter {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {number} options.windowMs - 时间窗口（毫秒）
   * @param {number} options.maxAttempts - 最大尝试次数
   * @param {number} options.blockDuration - 锁定时长（毫秒）
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 默认15分钟
    this.maxAttempts = options.maxAttempts || 5; // 默认5次
    this.blockDuration = options.blockDuration || 30 * 60 * 1000; // 默认锁定30分钟
    
    // 存储尝试记录: Map<key, { count, timestamps, windowStart }>
    this.attempts = new Map();
    
    // 存储锁定记录: Map<key, { blockedAt, blockedUntil, reason, attempts }>
    this.blocked = new Map();
    
    // 定时清理过期记录（每5分钟）
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
    
    logger.info('速率限制器已初始化', {
      windowMs: this.windowMs,
      maxAttempts: this.maxAttempts,
      blockDuration: this.blockDuration
    });
  }

  /**
   * 检查是否被速率限制
   * @param {string} type - 类型（'ip' 或 'username'）
   * @param {string} identifier - 标识符（IP地址或用户名）
   * @returns {boolean|Object} false表示未限制，Object表示被限制（包含详细信息）
   */
  isRateLimited(type, identifier) {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    // 1. 检查是否在锁定期内
    if (this.blocked.has(key)) {
      const blockInfo = this.blocked.get(key);
      
      // 检查锁定是否已过期
      if (now >= blockInfo.blockedUntil) {
        // 时间到期，自动解锁
        this.blocked.delete(key);
        this.attempts.delete(key);
        logger.info(`自动解锁: ${key}`, {
          type,
          identifier,
          lockedDuration: Math.round((now - blockInfo.blockedAt) / 60000) + '分钟'
        });
        return false;
      }
      
      // 仍在锁定期内
      const remainingMs = blockInfo.blockedUntil - now;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      
      logger.warn(`访问被限制: ${key}`, {
        type,
        identifier,
        remainingMinutes,
        blockedAt: new Date(blockInfo.blockedAt).toISOString(),
        blockedUntil: new Date(blockInfo.blockedUntil).toISOString()
      });
      
      return {
        blocked: true,
        remainingTime: remainingMinutes,
        retryAfter: new Date(blockInfo.blockedUntil).toISOString(),
        attempts: blockInfo.attempts
      };
    }
    
    // 2. 检查尝试次数
    if (!this.attempts.has(key)) {
      return false; // 无记录，允许访问
    }
    
    const attemptInfo = this.attempts.get(key);
    
    // 清理时间窗口外的旧记录
    const windowStart = now - this.windowMs;
    attemptInfo.timestamps = attemptInfo.timestamps.filter(
      timestamp => timestamp > windowStart
    );
    attemptInfo.count = attemptInfo.timestamps.length;
    
    // 如果没有有效的尝试记录，清除该key
    if (attemptInfo.count === 0) {
      this.attempts.delete(key);
      return false;
    }
    
    // 3. 判断是否超过限制
    if (attemptInfo.count >= this.maxAttempts) {
      // 超过限制，触发锁定
      const blockedUntil = now + this.blockDuration;
      
      this.blocked.set(key, {
        blockedAt: now,
        blockedUntil: blockedUntil,
        reason: '登录失败次数过多',
        attempts: attemptInfo.count
      });
      
      const blockMinutes = Math.round(this.blockDuration / 60000);
      logger.warn(`触发锁定: ${key}`, {
        type,
        identifier,
        attempts: attemptInfo.count,
        blockDuration: blockMinutes + '分钟',
        blockedUntil: new Date(blockedUntil).toISOString()
      });
      
      return {
        blocked: true,
        remainingTime: blockMinutes,
        retryAfter: new Date(blockedUntil).toISOString(),
        attempts: attemptInfo.count
      };
    }
    
    return false; // 未超过限制
  }

  /**
   * 记录失败尝试
   * @param {string} type - 类型（'ip' 或 'username'）
   * @param {string} identifier - 标识符（IP地址或用户名）
   */
  recordFailure(type, identifier) {
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    if (!this.attempts.has(key)) {
      this.attempts.set(key, {
        count: 1,
        timestamps: [now],
        windowStart: now
      });
    } else {
      const attemptInfo = this.attempts.get(key);
      attemptInfo.count++;
      attemptInfo.timestamps.push(now);
    }
    
    const currentCount = this.attempts.get(key).count;
    const remaining = this.maxAttempts - currentCount;
    
    logger.info(`记录失败尝试: ${key}`, {
      type,
      identifier,
      currentAttempts: currentCount,
      maxAttempts: this.maxAttempts,
      remainingAttempts: remaining > 0 ? remaining : 0
    });
  }

  /**
   * 重置尝试记录（登录成功时调用）
   * @param {string} type - 类型（'ip' 或 'username'）
   * @param {string} identifier - 标识符（IP地址或用户名）
   */
  resetAttempts(type, identifier) {
    const key = `${type}:${identifier}`;
    const hadAttempts = this.attempts.has(key);
    const wasBlocked = this.blocked.has(key);
    
    this.attempts.delete(key);
    this.blocked.delete(key);
    
    if (hadAttempts || wasBlocked) {
      logger.info(`重置限制记录: ${key}`, {
        type,
        identifier,
        reason: '登录成功'
      });
    }
  }

  /**
   * 清理过期记录
   */
  cleanup() {
    const now = Date.now();
    let cleanedAttempts = 0;
    let cleanedBlocked = 0;
    
    // 清理过期的尝试记录
    for (const [key, attemptInfo] of this.attempts.entries()) {
      const windowStart = now - this.windowMs;
      attemptInfo.timestamps = attemptInfo.timestamps.filter(
        timestamp => timestamp > windowStart
      );
      attemptInfo.count = attemptInfo.timestamps.length;
      
      if (attemptInfo.count === 0) {
        this.attempts.delete(key);
        cleanedAttempts++;
      }
    }
    
    // 清理过期的锁定记录
    for (const [key, blockInfo] of this.blocked.entries()) {
      if (now >= blockInfo.blockedUntil) {
        this.blocked.delete(key);
        this.attempts.delete(key);
        cleanedBlocked++;
      }
    }
    
    if (cleanedAttempts > 0 || cleanedBlocked > 0) {
      logger.info('清理过期记录完成', {
        cleanedAttempts,
        cleanedBlocked,
        remainingAttempts: this.attempts.size,
        remainingBlocked: this.blocked.size
      });
    }
  }

  /**
   * 获取当前状态统计
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      totalAttempts: this.attempts.size,
      totalBlocked: this.blocked.size,
      config: {
        windowMs: this.windowMs,
        maxAttempts: this.maxAttempts,
        blockDuration: this.blockDuration
      }
    };
  }

  /**
   * 销毁速率限制器（清理定时器）
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
    this.blocked.clear();
    logger.info('速率限制器已销毁');
  }
}

// 创建两个速率限制器实例
// IP 级别限制：15分钟内最多5次尝试，锁定30分钟
const ipRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,      // 15分钟时间窗口
  maxAttempts: 5,                 // 最多5次尝试
  blockDuration: 30 * 60 * 1000   // 锁定30分钟
});

// 用户名级别限制：15分钟内最多3次尝试，锁定1小时（更严格）
const usernameRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,       // 15分钟时间窗口
  maxAttempts: 3,                 // 最多3次尝试（更严格）
  blockDuration: 60 * 60 * 1000   // 锁定1小时
});

/**
 * 获取客户端真实IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} IP地址
 */
function getClientIp(req) {
  // 优先从 X-Forwarded-For 获取（适用于反向代理）
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For 可能包含多个IP，取第一个
    return forwardedFor.split(',')[0].trim();
  }
  
  // 其他可能的代理头
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }
  
  // 直连IP
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         req.connection.socket?.remoteAddress ||
         'unknown';
}

module.exports = {
  RateLimiter,
  ipRateLimiter,
  usernameRateLimiter,
  getClientIp
};
