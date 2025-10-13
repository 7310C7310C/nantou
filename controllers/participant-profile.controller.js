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
  
  /**
   * 获取所有参与者的完整资料（用于编辑表格）
   * @route GET /api/admin/participants/profiles
   */
  static async getAllProfiles(req, res) {
    try {
      const { username } = req.query;
      
      let query = `
        SELECT 
          id,
          username,
          name,
          baptismal_name,
          gender,
          phone,
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
      `;
      
      const params = [];
      
      if (username) {
        query += ' WHERE username LIKE ?';
        params.push(`%${username}%`);
      }
      
      query += ' ORDER BY username ASC';
      
      const [rows] = await pool.execute(query, params);
      
      return res.json({
        success: true,
        data: rows
      });
      
    } catch (error) {
      logger.error('获取所有参与者资料失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取资料失败'
      });
    }
  }
  
  /**
   * 更新参与者单个字段
   * @route PATCH /api/admin/participants/:id/field
   */
  static async updateField(req, res) {
    try {
      const participantId = req.params.id;
      const { field, value } = req.body;
      
      // 允许更新的字段白名单
      const allowedFields = [
        'name', 'baptismal_name', 'phone', 'birthday',
        'hometown', 'current_city', 'education', 'industry',
        'position', 'height', 'family_members', 'property_status',
        'annual_income', 'hobbies', 'personality', 'self_introduction',
        'mate_selection_criteria', 'live_with_parents'
      ];
      
      if (!allowedFields.includes(field)) {
        return res.status(400).json({
          success: false,
          message: '不允许更新该字段'
        });
      }
      
      // 构建更新 SQL
      const query = `UPDATE participants SET ${field} = ? WHERE id = ?`;
      await pool.execute(query, [value, participantId]);
      
      logger.info(`更新参与者 ${participantId} 的字段 ${field}`);
      
      return res.json({
        success: true,
        message: '更新成功'
      });
      
    } catch (error) {
      logger.error('更新字段失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新失败'
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
 * 3. 自治区正确处理（内蒙古、新疆、西藏、宁夏、广西）
 * 4. 直辖市只显示市名（北京、上海、天津、重庆）
 * 5. 格式：广东深圳、内蒙古呼和浩特
 * 
 * @param {string} location - 原始地理位置
 * @returns {string} 格式化后的地理位置
 */
function formatLocation(location) {
  if (!location) return null;
  
  try {
    let text = location.trim();
    
    // 特殊处理：港澳台
    if (text.includes('香港')) return '香港';
    if (text.includes('澳门') || text.includes('澳門')) return '澳门';
    if (text.includes('台湾') || text.includes('臺灣')) return '台湾';
    
    // 第一步：识别省级
    let province = '';
    let city = '';
    
    // 自治区（按长度从长到短匹配）
    const autonomousRegions = [
      { full: '新疆维吾尔自治区', short: '新疆' },
      { full: '内蒙古自治区', short: '内蒙古' },
      { full: '宁夏回族自治区', short: '宁夏' },
      { full: '广西壮族自治区', short: '广西' },
      { full: '西藏自治区', short: '西藏' }
    ];
    
    for (const region of autonomousRegions) {
      if (text.includes(region.full)) {
        province = region.short;
        text = text.replace(region.full, '').trim();
        break;
      } else if (text.startsWith(region.short)) {
        province = region.short;
        text = text.substring(region.short.length).trim();
        break;
      }
    }
    
    // 直辖市
    const municipalities = ['北京', '上海', '天津', '重庆'];
    if (!province) {
      for (const m of municipalities) {
        if (text.includes(m)) {
          return m;
        }
      }
    }
    
    // 普通省份
    if (!province) {
      const match = text.match(/^([^省市]+)(省)?/);
      if (match) {
        province = match[1];
        text = text.substring(match[0].length).trim();
      }
    }
    
    // 第二步：提取市
    text = text.replace(/^[\s\u3000]+/, ''); // 去除开头空白
    
    // 如果有空格，先取第一段（市级部分）
    if (text.includes(' ')) {
      city = text.split(' ')[0];
    } else {
      city = text;
    }
    
    // 去除市、自治州、自治县等后缀（从长到短匹配）
    city = city
      .replace(/土家族苗族自治州$/, '')
      .replace(/土家族自治县$/, '')
      .replace(/哈萨克自治州$/, '')
      .replace(/自治州$/, '')
      .replace(/自治县$/, '')
      .replace(/地区$/, '')
      .replace(/盟$/, '')
      .replace(/市$/, '')
      .replace(/县$/, '')
      .replace(/区$/, '')
      .trim();
    
    // 返回结果
    if (province && city) {
      return province + city;
    } else if (province) {
      return province;
    } else if (city) {
      return city;
    }
    
    return location;
    
  } catch (error) {
    return location;
  }
}

module.exports = ParticipantProfileController;
