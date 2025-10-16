const MatchmakerService = require('../services/matchmaker.service');
const logger = require('../utils/logger');

class MatchmakerController {
  /**
   * 获取某个参与者的配对界面数据
   */
  static async getParticipantMatchingData(req, res) {
    try {
      const { participant_id } = req.params;
      const { search } = req.query;
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      const participants = await MatchmakerService.getParticipantMatchingData(
        matchmaker_id, 
        parseInt(participant_id), 
        search
      );

      logger.info(`红娘 ${req.user.username} 获取参与者 ${participant_id} 的配对数据`);

      res.json({
        success: true,
        data: participants
      });
    } catch (error) {
      logger.error('获取配对数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取配对数据失败'
      });
    }
  }

  /**
   * 创建或更新配对推荐
   */
  static async createOrUpdateRecommendation(req, res) {
    try {
      const { person1_id, person2_id, stars } = req.body;
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      // 验证必需参数
      if (!person1_id || !person2_id || !stars) {
        return res.status(400).json({
          success: false,
          message: '缺少必需参数'
        });
      }

      const result = await MatchmakerService.createOrUpdateRecommendation(
        matchmaker_id,
        parseInt(person1_id),
        parseInt(person2_id),
        parseInt(stars)
      );

      logger.info(`红娘 ${req.user.username} 为参与者 ${person1_id} 和 ${person2_id} 创建/更新配对，星级: ${stars}`);

      res.json({
        success: true,
        message: '配对推荐保存成功',
        data: result
      });
    } catch (error) {
      logger.error('创建/更新配对推荐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '配对推荐保存失败'
      });
    }
  }

  /**
   * 删除配对推荐
   */
  static async deleteRecommendation(req, res) {
    try {
      const { person1_id, person2_id } = req.body;
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      // 验证必需参数
      if (!person1_id || !person2_id) {
        return res.status(400).json({
          success: false,
          message: '缺少必需参数'
        });
      }

      const result = await MatchmakerService.deleteRecommendation(
        matchmaker_id,
        parseInt(person1_id),
        parseInt(person2_id)
      );

      logger.info(`红娘 ${req.user.username} 删除参与者 ${person1_id} 和 ${person2_id} 的配对`);

      res.json({
        success: true,
        message: '配对推荐删除成功',
        data: result
      });
    } catch (error) {
      logger.error('删除配对推荐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '配对推荐删除失败'
      });
    }
  }

  /**
   * 根据ID删除配对推荐
   */
  static async deleteRecommendationById(req, res) {
    try {
      const { id } = req.params;
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      const result = await MatchmakerService.deleteRecommendationById(parseInt(id));

      logger.info(`红娘 ${req.user.username} 删除配对推荐 ID: ${id}`);

      res.json({
        success: true,
        message: '配对推荐删除成功',
        data: result
      });
    } catch (error) {
      logger.error('删除配对推荐失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '配对推荐删除失败'
      });
    }
  }

  /**
   * 获取红娘的所有配对管理数据
   */
  static async getMatchmakerRecommendations(req, res) {
    try {
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      const recommendations = await MatchmakerService.getMatchmakerRecommendations(matchmaker_id);

      logger.info(`红娘 ${req.user.username} 获取所有配对管理数据`);

      res.json({
        success: true,
        data: recommendations
      });
    } catch (error) {
      logger.error('获取配对管理数据失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取配对管理数据失败'
      });
    }
  }

  /**
   * 更新配对星级
   */
  static async updateRecommendationStars(req, res) {
    try {
      const { id } = req.params;
      const { stars } = req.body;
      const matchmaker_id = req.user.id;

      // 验证权限
      if (req.user.role !== 'matchmaker') {
        return res.status(403).json({
          success: false,
          message: '权限不足，只有红娘可以访问此功能'
        });
      }

      // 验证必需参数
      if (!stars) {
        return res.status(400).json({
          success: false,
          message: '缺少星级参数'
        });
      }

      // 这里需要先根据ID获取配对信息，然后更新
      // 由于我们的数据模型设计，需要先查询获取person1_id和person2_id
      // 为简化实现，这个功能可以通过前端传递person1_id和person2_id来实现

      res.json({
        success: true,
        message: '请使用 POST /api/matchmaker/recommendations 接口更新配对星级'
      });
    } catch (error) {
      logger.error('更新配对星级失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新配对星级失败'
      });
    }
  }

  /**
   * 获取所有红娘的配对统计
   * 管理员可以查看所有红娘配对的汇总统计
   */
  static async getMatchmakingStats(req, res) {
    try {
      // 验证权限 - 只有管理员、工作人员和红娘可以访问
      if (!['admin', 'staff', 'matchmaker'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const stats = await MatchmakerService.getMatchmakingStats();

      logger.info(`${req.user.username} (${req.user.role}) 查看配对统计`);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取配对统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取配对统计失败'
      });
    }
  }

  /**
   * 获取按红娘分组的配对统计
   */
  static async getMatchmakingStatsByMatchmaker(req, res) {
    try {
      // 验证权限 - 管理员、工作人员和红娘可以访问
      if (!['admin', 'staff', 'matchmaker'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const stats = await MatchmakerService.getMatchmakingStatsByMatchmaker();

      logger.info(`${req.user.username} (${req.user.role}) 查看按红娘分组的配对统计`);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('获取配对统计失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取配对统计失败'
      });
    }
  }

  /**
   * 获取某个红娘的所有配对详情
   */
  static async getMatchmakerPairings(req, res) {
    try {
      const { matchmaker_username } = req.params;

      // 验证权限 - 管理员、工作人员和红娘可以访问
      if (!['admin', 'staff', 'matchmaker'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      const pairings = await MatchmakerService.getMatchmakerPairings(matchmaker_username);

      logger.info(`${req.user.username} (${req.user.role}) 查看红娘 ${matchmaker_username} 的配对详情`);

      res.json({
        success: true,
        data: pairings
      });
    } catch (error) {
      logger.error('获取红娘配对详情失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取红娘配对详情失败'
      });
    }
  }
}

module.exports = MatchmakerController;
