const favoriteService = require('../services/favorite.service');

/**
 * 切换收藏
 */
async function toggle(req, res) {
	try {
		if (!req.user || req.user.userType !== 'participant') {
			return res.status(403).json({ success: false, message: '仅参与者可收藏' });
		}
		const targetId = parseInt(req.params.participant_id || req.body.participant_id, 10);
		if (!targetId) {
			return res.status(400).json({ success: false, message: '缺少参与者ID' });
		}
		const result = await favoriteService.toggleFavorite(req.user.id, targetId);
		return res.json({ success: true, data: result });
	} catch (err) {
		console.error('切换收藏错误:', err);
		res.status(500).json({ success: false, message: '服务器内部错误' });
	}
}

/**
 * 获取收藏列表
 */
async function list(req, res) {
	try {
		if (!req.user || req.user.userType !== 'participant') {
			return res.status(403).json({ success: false, message: '仅参与者可访问收藏' });
		}
		const favorites = await favoriteService.listFavorites(req.user.id);
		res.json({ success: true, data: { favorites } });
	} catch (err) {
		console.error('获取收藏列表错误:', err);
		res.status(500).json({ success: false, message: '服务器内部错误' });
	}
}

/**
 * 获取收藏ID列表（用于前端标记）
 */
async function ids(req, res) {
	try {
		if (!req.user || req.user.userType !== 'participant') {
			return res.status(403).json({ success: false, message: '仅参与者可访问收藏' });
		}
		const favorites = await favoriteService.getFavoriteIds(req.user.id);
		res.json({ success: true, data: { favorite_ids: favorites } });
	} catch (err) {
		console.error('获取收藏ID错误:', err);
		res.status(500).json({ success: false, message: '服务器内部错误' });
	}
}

module.exports = { toggle, list, ids };
