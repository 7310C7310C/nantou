const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * 参与者详细资料控制器
 */
class ParticipantProfileController {
  /**
   * 获取参与者详细资料
   * @route GET /api/participants/:id/profile
   */
  static async getProfile(req, res) {
    try {
      const participantId = req.params.id;
      
      // 查询参与者详细资料
      const [rows] = await pool.execute(
        `SELECT 
          id,
          username,
          name,
          baptismal_name,
          gender,
          birthday,
          hometown,
          current_city,
          education,
          industry,
          position,
          height,
          family_members,
          property_status,
          annual_income,
          hobbies,
          personality,
          self_introduction,
          mate_selection_criteria,
          live_with_parents,
          profile_completed
        FROM participants 
        WHERE id = ?`,
        [participantId]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const profile = rows[0];
      
      // 检查是否有详细资料
      if (!profile.profile_completed) {
        return res.json({
          success: true,
          hasProfile: false,
          message: '该用户暂无详细资料'
        });
      }
      
      // 处理数据格式
      const formattedProfile = {
        ...profile,
        birthday: formatBirthday(profile.birthday),
        hometown: formatLocation(profile.hometown),
        current_city: formatLocation(profile.current_city)
      };
      
      // 判断用户角色，返回不同级别的数据
      const userRole = req.user ? req.user.role : null;
      const isStaff = userRole && ['admin', 'staff', 'matchmaker'].includes(userRole);
      
      return res.json({
        success: true,
        hasProfile: true,
        profile: formattedProfile,
        isStaff: isStaff
      });
      
    } catch (error) {
      logger.error('获取用户资料失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取用户资料失败'
      });
    }
  }
}

/**
 * 格式化生日 - 只显示年月
 * @param {Date|string} birthday - 生日
 * @returns {string} 格式化后的生日（YYYY年MM月）
 */
function formatBirthday(birthday) {
  if (!birthday) return null;
  
  try {
    const date = new Date(birthday);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    return `${year}年${month}月`;
  } catch (error) {
    return null;
  }
}

/**
 * 格式化地理位置
 * 规则：
 * 1. 去除"省""市"字眼
 * 2. 特别行政区只显示地区名（香港、澳门、台湾）
 * 3. 格式：广东深圳
 * 
 * @param {string} location - 原始地理位置
 * @returns {string} 格式化后的地理位置
 */
function formatLocation(location) {
  if (!location) return null;
  
  try {
    let formatted = location.trim();
    
    // 处理特别行政区
    if (formatted.includes('香港特别行政区') || formatted.includes('香港特區')) {
      return '香港';
    }
    if (formatted.includes('澳门特别行政区') || formatted.includes('澳門特區')) {
      return '澳门';
    }
    if (formatted.includes('台湾') || formatted.includes('臺灣')) {
      return '台湾';
    }
    
    // 分割地址
    const parts = formatted.split(/\s+/);
    
    // 提取省和市的主要部分
    const result = [];
    
    for (const part of parts) {
      if (!part) continue;
      
      // 去除"省""市""自治区""特别行政区"等后缀
      let cleaned = part
        .replace(/省$/, '')
        .replace(/市$/, '')
        .replace(/自治区$/, '')
        .replace(/特别行政区$/, '')
        .replace(/维吾尔自治区$/, '')
        .replace(/回族自治区$/, '')
        .replace(/壮族自治区$/, '')
        .replace(/自治州$/, '')
        .replace(/地区$/, '')
        .replace(/县$/, '')
        .replace(/区$/, '');
      
      if (cleaned) {
        result.push(cleaned);
      }
      
      // 只取前两个主要部分（省+市）
      if (result.length >= 2) break;
    }
    
    return result.join('') || formatted;
    
  } catch (error) {
    return location;
  }
}

module.exports = ParticipantProfileController;
