const { pool } = require('../config/database');

/**
 * 收藏模型
 */
class FavoriteModel {
	/**
	 * 添加收藏（忽略重复）
	 * @param {number} userId
	 * @param {number} targetParticipantId
	 * @returns {Promise<boolean>} 是否新增
	 */
	static async add(userId, targetParticipantId) {
		try {
			const [result] = await pool.execute(
				`INSERT IGNORE INTO favorites (user_id, favorited_participant_id) VALUES (?, ?)`,
				[userId, targetParticipantId]
			);
			return result.affectedRows > 0;
		} catch (err) {
			throw err;
		}
	}

	/**
	 * 取消收藏
	 * @param {number} userId
	 * @param {number} targetParticipantId
	 * @returns {Promise<boolean>} 是否删除
	 */
	static async remove(userId, targetParticipantId) {
		try {
			const [result] = await pool.execute(
				`DELETE FROM favorites WHERE user_id = ? AND favorited_participant_id = ?`,
				[userId, targetParticipantId]
			);
			return result.affectedRows > 0;
		} catch (err) {
			throw err;
		}
	}

	/**
	 * 获取用户收藏的参与者ID集合
	 * @param {number} userId
	 * @returns {Promise<number[]>}
	 */
	static async getFavoriteIds(userId) {
		try {
			const [rows] = await pool.execute(
				`SELECT favorited_participant_id FROM favorites WHERE user_id = ?`,
				[userId]
			);
			return rows.map(r => r.favorited_participant_id);
		} catch (err) {
			throw err;
		}
	}

	/**
	 * 是否已收藏
	 * @param {number} userId
	 * @param {number} targetParticipantId
	 * @returns {Promise<boolean>}
	 */
	static async isFavorited(userId, targetParticipantId) {
		try {
			const [rows] = await pool.execute(
				`SELECT 1 FROM favorites WHERE user_id = ? AND favorited_participant_id = ? LIMIT 1`,
				[userId, targetParticipantId]
			);
			return rows.length > 0;
		} catch (err) {
			throw err;
		}
	}

	/**
	 * 获取收藏的参与者详细信息及其照片
	 * @param {number} userId
	 * @returns {Promise<Array>}
	 */
	static async getFavoritesWithPhotos(userId) {
		try {
			const [participants] = await pool.execute(
				`SELECT p.id, p.username, p.name, p.baptismal_name, p.gender, p.is_checked_in, f.created_at AS favorited_at
				 FROM favorites f
				 JOIN participants p ON p.id = f.favorited_participant_id
				 WHERE f.user_id = ?
				 ORDER BY f.created_at DESC`,
				[userId]
			);

			// 批量获取照片
			for (const p of participants) {
				const [photos] = await pool.execute(
					`SELECT id, photo_url, is_primary, sort_order, created_at
					 FROM participant_photos
					 WHERE participant_id = ?
					 ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
					[p.id]
				);
				p.photos = photos;
			}
			return participants;
		} catch (err) {
			throw err;
		}
	}
}

module.exports = FavoriteModel;
