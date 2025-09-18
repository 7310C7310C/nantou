const FavoriteModel = require('../models/favorite.model');
const { pool } = require('../config/database');

/**
 * 添加或取消收藏（切换）
 * @param {number} userId
 * @param {number} targetParticipantId
 * @returns {Promise<{favorited:boolean}>}
 */
async function toggleFavorite(userId, targetParticipantId) {
	// 不能收藏自己
	if (userId === targetParticipantId) {
		return { favorited: false, message: '不能收藏自己' };
	}

	// 检查目标是否存在
	const [rows] = await pool.execute('SELECT id, gender FROM participants WHERE id = ?', [targetParticipantId]);
	if (rows.length === 0) {
		return { favorited: false, message: '参与者不存在' };
	}

	// 检查是否已收藏
	const already = await FavoriteModel.isFavorited(userId, targetParticipantId);
	if (already) {
		await FavoriteModel.remove(userId, targetParticipantId);
		return { favorited: false };
	} else {
		await FavoriteModel.add(userId, targetParticipantId);
		return { favorited: true };
	}
}

/**
 * 获取收藏列表（带照片）
 * @param {number} userId
 */
async function listFavorites(userId) {
	const favorites = await FavoriteModel.getFavoritesWithPhotos(userId);
	return favorites;
}

/**
 * 获取用户收藏ID数组
 * @param {number} userId
 */
async function getFavoriteIds(userId) {
	return await FavoriteModel.getFavoriteIds(userId);
}

module.exports = {
	toggleFavorite,
	listFavorites,
	getFavoriteIds
};
