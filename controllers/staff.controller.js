const { createStaffUser, getAllStaffUsers, resetStaffPasswordById, deleteStaffById } = require('../services/staff.service');
const logger = require('../utils/logger');

/**
 * 获取所有工作人员列表（仅管理员可访问）
 */
async function getAllStaff(req, res) {
  try {
    // 权限检查：只有管理员可以访问
    if (req.user.role !== 'admin') {
      logger.warn('非管理员尝试访问工作人员列表', { 
        user_id: req.user.id,
        username: req.user.username,
        role: req.user.role 
      });
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以访问'
      });
    }

    logger.operation('获取工作人员列表', req.user.id, { operator: req.user.username });
    
    const staffList = await getAllStaffUsers();
    
    logger.info('工作人员列表获取成功', { 
      count: staffList.length, 
      operator: req.user.username 
    });

    res.json({
      success: true,
      data: staffList
    });
  } catch (error) {
    logger.error('获取工作人员列表错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 创建新工作人员（仅管理员可访问）
 */
async function createStaff(req, res) {
  try {
    // 权限检查：只有管理员可以访问
    if (req.user.role !== 'admin') {
      logger.warn('非管理员尝试创建工作人员', { 
        user_id: req.user.id,
        username: req.user.username,
        role: req.user.role 
      });
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以创建工作人员'
      });
    }

    const { role } = req.body;

    // 验证输入
    if (!role) {
      return res.status(400).json({
        success: false,
        message: '角色不能为空'
      });
    }

    // 验证角色
    const validRoles = ['admin', 'staff', 'matchmaker'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: '无效的角色，只能是：admin、staff 或 matchmaker'
      });
    }

    logger.operation('开始创建工作人员', req.user.id, { 
      role, 
      operator: req.user.username 
    });

    // 调用服务层创建工作人员
    const result = await createStaffUser(role);

    logger.success('工作人员创建成功', { 
      staff_id: result.staff_id,
      username: result.username,
      role: result.role,
      operator: req.user.username
    });

    res.status(201).json({
      success: true,
      message: '工作人员创建成功',
      data: {
        staff_id: result.staff_id,
        username: result.username,
        password: result.password, // 返回明文密码给前端
        role: result.role
      }
    });

  } catch (error) {
    logger.error('创建工作人员系统错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 重设工作人员密码（仅管理员可访问）
 */
async function resetStaffPassword(req, res) {
  try {
    // 权限检查：只有管理员可以访问
    if (req.user.role !== 'admin') {
      logger.warn('非管理员尝试重设工作人员密码', { 
        user_id: req.user.id,
        username: req.user.username,
        role: req.user.role 
      });
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以重设密码'
      });
    }

    const { staff_id } = req.params;
    
    if (!staff_id || isNaN(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '无效的工作人员ID'
      });
    }

    logger.operation('重设工作人员密码', req.user.id, { 
      staff_id, 
      operator: req.user.username 
    });
    
    // 调用服务层处理重设密码逻辑
    const result = await resetStaffPasswordById(staff_id);
    
    if (result.success) {
      logger.success('工作人员密码重设成功', { 
        staff_id,
        username: result.username,
        operator: req.user.username
      });
      
      res.json({
        success: true,
        message: '密码重设成功',
        data: {
          username: result.username,
          new_password: result.new_password
        }
      });
    } else {
      logger.warn('工作人员密码重设失败', { 
        staff_id, 
        reason: result.message,
        operator: req.user.username
      });
      
      res.status(404).json({
        success: false,
        message: result.message || '工作人员不存在'
      });
    }
  } catch (error) {
    logger.error('重设工作人员密码错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 删除工作人员（仅管理员可访问）
 */
async function deleteStaff(req, res) {
  try {
    // 权限检查：只有管理员可以访问
    if (req.user.role !== 'admin') {
      logger.warn('非管理员尝试删除工作人员', { 
        user_id: req.user.id,
        username: req.user.username,
        role: req.user.role 
      });
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以删除工作人员'
      });
    }

    const { staff_id } = req.params;
    
    if (!staff_id || isNaN(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '无效的工作人员ID'
      });
    }

    // 防止管理员删除自己
    if (parseInt(staff_id) === req.user.id) {
      logger.warn('管理员尝试删除自己的账号', { 
        staff_id, 
        operator: req.user.username
      });
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账号'
      });
    }

    logger.operation('删除工作人员', req.user.id, { 
      staff_id, 
      operator: req.user.username 
    });
    
    // 调用服务层处理删除逻辑
    const result = await deleteStaffById(staff_id);
    
    if (result.success) {
      logger.success('工作人员删除成功', { 
        staff_id,
        username: result.username,
        operator: req.user.username
      });
      
      res.json({
        success: true,
        message: '工作人员删除成功'
      });
    } else {
      logger.warn('工作人员删除失败', { 
        staff_id, 
        reason: result.message,
        operator: req.user.username
      });
      
      res.status(404).json({
        success: false,
        message: result.message || '工作人员不存在'
      });
    }
  } catch (error) {
    logger.error('删除工作人员错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getAllStaff,
  createStaff,
  resetStaffPassword,
  deleteStaff
};
