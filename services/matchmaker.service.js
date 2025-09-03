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

    // 验证两个人是否为异性
    const person1 = await ParticipantService.getParticipantById(person1_id);
    const person2 = await ParticipantService.getParticipantById(person2_id);
    
    if (!person1 || !person2) {
      throw new Error('参与者不存在');
    }

    if (person1.gender === person2.gender) {
      throw new Error('只能为异性配对');
    }

    // 创建或更新推荐
    const result = await MatchmakerRecommendation.createOrUpdate(
      matchmaker_id, 
      person1_id, 
      person2_id, 
      stars
    );

    return result;
  }

  /**
   * 删除配对推荐
   */
  static async deleteRecommendation(matchmaker_id, person1_id, person2_id) {
    const result = await MatchmakerRecommendation.delete(matchmaker_id, person1_id, person2_id);
    if (result.affectedRows === 0) {
      throw new Error('配对记录不存在');
    }
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
   * 获取某个参与者的配对界面数据
   */
  static async getParticipantMatchingData(matchmaker_id, participant_id, searchQuery = '') {
    // 获取基础配对数据
    let participants = await MatchmakerRecommendation.getRecommendationsForParticipant(
      matchmaker_id, 
      participant_id
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
    const recommendations = await MatchmakerRecommendation.getMatchmakerRecommendations(matchmaker_id);

    // 为每个参与者获取照片
    for (let rec of recommendations) {
      rec.person1_photos = await ParticipantService.getParticipantPhotos(rec.person1_id);
      rec.person2_photos = await ParticipantService.getParticipantPhotos(rec.person2_id);
    }

    return recommendations;
  }

  /**
   * 检查配对是否存在
   */
  static async checkRecommendationExists(matchmaker_id, person1_id, person2_id) {
    return await MatchmakerRecommendation.exists(matchmaker_id, person1_id, person2_id);
  }

  /**
   * 获取特定配对信息
   */
  static async getRecommendation(matchmaker_id, person1_id, person2_id) {
    return await MatchmakerRecommendation.getRecommendation(matchmaker_id, person1_id, person2_id);
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

    // 更新星级
    const result = await MatchmakerRecommendation.createOrUpdate(
      matchmaker_id, 
      person1_id, 
      person2_id, 
      stars
    );

    return result;
  }
}

module.exports = MatchmakerService;
