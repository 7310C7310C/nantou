const SelectionsModel = require('../models/selections.model');
const { pool } = require('../config/database');

async function addSelection(userId, targetId, priority) {
  if (userId === targetId) {
    return { success: false, message: '不能选择自己' };
  }

  // 验证目标存在
  const [rows] = await pool.execute('SELECT id FROM participants WHERE id = ?', [targetId]);
  if (rows.length === 0) return { success: false, message: '目标参与者不存在' };

  await SelectionsModel.add(userId, targetId, priority);
  return { success: true };
}

async function removeSelection(userId, targetId) {
  await SelectionsModel.remove(userId, targetId);
  return { success: true };
}

async function listSelections(userId) {
  return await SelectionsModel.listByUser(userId);
}

async function reorderSelections(userId, items) {
  // items: [{ target_id, priority }, ...]
  await SelectionsModel.updatePriorities(userId, items);
  return { success: true };
}

module.exports = {
  addSelection,
  removeSelection,
  listSelections,
  reorderSelections
};
