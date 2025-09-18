const selectionsService = require('../services/selections.service');

async function add(req, res, next) {
  try {
    const userId = req.user?.id;
    const { target_id, priority } = req.body;
    const result = await selectionsService.addSelection(userId, Number(target_id), Number(priority));
    if (!result.success) return res.status(400).json({ success: false, message: result.message });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const userId = req.user?.id;
    const { target_id } = req.body;
    await selectionsService.removeSelection(userId, Number(target_id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    const rows = await selectionsService.listSelections(userId);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
}

async function reorder(req, res, next) {
  try {
    const userId = req.user?.id;
    const { items } = req.body; // [{ target_id, priority }, ...]
    await selectionsService.reorderSelections(userId, items);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { add, remove, list, reorder };
