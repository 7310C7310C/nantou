/**
 * 用户端匹配结果控制器
 */

const matchingUserService = require('../services/matching-user.service');
const logger = require('../utils/logger');

/**
 * 获取用户的分组匹配结果
 */
async function getUserGroupingResult(req, res) {
  try {
    const username = req.user.username;
    const runBatch = req.query.runBatch ? parseInt(req.query.runBatch) : null;

    // 验证runBatch参数
    if (runBatch !== null && (!Number.isInteger(runBatch) || runBatch < 1)) {
      return res.status(400).json({
        success: false,
        message: '轮次号必须是大于等于1的整数'
      });
    }

    const result = await matchingUserService.getUserGroupingResult(username, runBatch);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('获取用户分组匹配结果失败', error);
    res.status(500).json({
      success: false,
      message: '获取分组匹配结果失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取用户的聊天匹配结果
 */
async function getUserChatResult(req, res) {
  try {
    const username = req.user.username;
    const runBatch = req.query.runBatch ? parseInt(req.query.runBatch) : null;

    // 验证runBatch参数
    if (runBatch !== null && (!Number.isInteger(runBatch) || runBatch < 1)) {
      return res.status(400).json({
        success: false,
        message: '轮次号必须是大于等于1的整数'
      });
    }

    const result = await matchingUserService.getUserChatResult(username, runBatch);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    logger.error('获取用户聊天匹配结果失败', error);
    res.status(500).json({
      success: false,
      message: '获取聊天匹配结果失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取分组匹配历史轮次列表
 */
async function getGroupingBatches(req, res) {
  try {
    const batches = await matchingUserService.getGroupingBatches();
    
    res.json({
      success: true,
      data: batches
    });

  } catch (error) {
    logger.error('获取分组匹配历史轮次失败', error);
    res.status(500).json({
      success: false,
      message: '获取历史轮次失败，请稍后重试',
      details: error.message 
    });
  }
}

/**
 * 获取聊天匹配历史轮次列表
 */
async function getChatBatches(req, res) {
  try {
    const batches = await matchingUserService.getChatBatches();
    
    res.json({
      success: true,
      data: batches
    });

  } catch (error) {
    logger.error('获取聊天匹配历史轮次失败', error);
    res.status(500).json({
      success: false,
      message: '获取历史轮次失败，请稍后重试',
      details: error.message 
    });
  }
}

module.exports = {
  getUserGroupingResult,
  getUserChatResult,
  getGroupingBatches,
  getChatBatches
};
