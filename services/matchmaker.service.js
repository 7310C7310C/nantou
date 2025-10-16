const MatchmakerRecommendation = require('../models/matchmaker.model');
const ParticipantService = require('./participant.service');

class MatchmakerService {
  /**
   * 创建或更新配对推荐
   */
  static async createOrUpdateRecommendation(matchmaker_id, person1_id, person2_id, stars) {
    // 验证星级范围
    if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
      throw new Error('星级必须是1-5之间的整数');
    }

    // 验证两个人不能是同一个人
    if (person1_id === person2_id) {
      throw new Error('不能为同一个人配对');
    }

    // 获取红娘和参与者的用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!matchmakerUser || !person1 || !person2) {
      throw new Error('用户不存在');
    }

    if (person1.gender === person2.gender) {
      throw new Error('只能为异性配对');
    }

    // 使用用户名进行操作
    const result = await MatchmakerRecommendation.createOrUpdate(
      matchmakerUser.username, 
      person1.username, 
      person2.username, 
      stars
    );

    return result;
  }

  /**
   * 删除配对推荐
   */
  static async deleteRecommendation(matchmaker_id, person1_id, person2_id) {
    // 获取用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!matchmakerUser || !person1 || !person2) {
      throw new Error('用户不存在');
    }

    const result = await MatchmakerRecommendation.delete(
      matchmakerUser.username, 
      person1.username, 
      person2.username
    );
    if (result.affectedRows === 0) {
      throw new Error('配对记录不存在');
    }
    return result;
  }

  /**
   * 获取某个参与者的配对界面数据
   */
  static async getParticipantMatchingData(matchmaker_id, participant_id, searchQuery = '') {
    // 获取用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const participant = await ParticipantService.getParticipantById(participant_id);
    
    if (!matchmakerUser || !participant) {
      throw new Error('用户不存在');
    }

    // 获取基础配对数据
    let participants = await MatchmakerRecommendation.getRecommendationsForParticipant(
      matchmakerUser.username, 
      participant.username
    );

    // 如果有搜索条件，进行过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      participants = participants.filter(p => 
        p.username.toLowerCase().includes(query) || 
        p.name.toLowerCase().includes(query) ||
        (p.baptismal_name && p.baptismal_name.toLowerCase().includes(query))
      );
    }

    // 获取每个参与者的照片
    for (let participant of participants) {
      participant.photos = await ParticipantService.getParticipantPhotos(participant.id);
    }

    return participants;
  }

  /**
   * 获取红娘的所有配对管理数据
   */
  static async getMatchmakerRecommendations(matchmaker_id) {
    // 获取红娘用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    if (!matchmakerUser) {
      throw new Error('红娘用户不存在');
    }

    const recommendations = await MatchmakerRecommendation.getMatchmakerRecommendations(matchmakerUser.username);

    // 为每个参与者获取照片
    for (let rec of recommendations) {
      rec.person1_photos = await ParticipantService.getParticipantPhotos(rec.person1_internal_id);
      rec.person2_photos = await ParticipantService.getParticipantPhotos(rec.person2_internal_id);
    }

    return recommendations;
  }

  /**
   * 检查配对是否存在
   */
  static async checkRecommendationExists(matchmaker_id, person1_id, person2_id) {
    // 获取用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!matchmakerUser || !person1 || !person2) {
      return false;
    }

    return await MatchmakerRecommendation.exists(
      matchmakerUser.username, 
      person1.username, 
      person2.username
    );
  }

  /**
   * 获取特定配对信息
   */
  static async getRecommendation(matchmaker_id, person1_id, person2_id) {
    // 获取用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!matchmakerUser || !person1 || !person2) {
      return null;
    }

    return await MatchmakerRecommendation.getRecommendation(
      matchmakerUser.username, 
      person1.username, 
      person2.username
    );
  }

  /**
   * 更新配对星级
   */
  static async updateRecommendationStars(matchmaker_id, person1_id, person2_id, stars) {
    // 验证星级范围
    if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
      throw new Error('星级必须是1-5之间的整数');
    }

    // 检查配对是否存在
    const exists = await this.checkRecommendationExists(matchmaker_id, person1_id, person2_id);
    if (!exists) {
      throw new Error('配对记录不存在');
    }

    // 获取用户名
    const matchmakerUser = await this.getUserById(matchmaker_id, 'staff');
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!matchmakerUser || !person1 || !person2) {
      throw new Error('用户不存在');
    }

    // 更新星级
    const result = await MatchmakerRecommendation.createOrUpdate(
      matchmakerUser.username, 
      person1.username, 
      person2.username, 
      stars
    );

    return result;
  }

  /**
   * 根据ID删除配对推荐
   */
  static async deleteRecommendationById(id) {
    const result = await MatchmakerRecommendation.deleteById(id);
    if (result.affectedRows === 0) {
      throw new Error('配对记录不存在');
    }
    return result;
  }

  /**
   * 根据ID和用户类型获取用户信息
   */
  static async getUserById(userId, userType = 'staff') {
    const { pool } = require('../config/database');
    
    try {
      let user = null;

      if (userType === 'staff') {
        const [users] = await pool.execute(
          'SELECT id, username, role FROM staff_users WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          user = users[0];
          user.userType = 'staff';
        }
      } else if (userType === 'participant') {
        const [users] = await pool.execute(
          'SELECT id, username, name, baptismal_name, gender FROM participants WHERE id = ?',
          [userId]
        );
        if (users.length > 0) {
          user = users[0];
          user.role = 'participant';
          user.userType = 'participant';
        }
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取所有红娘的配对统计
   * 返回每一对参与者及其所有红娘配对的星数总和
   */
  static async getMatchmakingStats() {
    const stats = await MatchmakerRecommendation.getAllMatchmakingStats();
    return stats;
  }

  /**
   * 获取按红娘分组的配对统计
   */
  static async getMatchmakingStatsByMatchmaker() {
    const stats = await MatchmakerRecommendation.getMatchmakingStatsByMatchmaker();
    return stats;
  }

  /**
   * 获取某个红娘的所有配对详情
   */
  static async getMatchmakerPairings(matchmaker_username) {
    const pairings = await MatchmakerRecommendation.getMatchmakerPairings(matchmaker_username);
    return pairings;
  }
}

module.exports = MatchmakerService;
