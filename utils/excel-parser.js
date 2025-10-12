const XLSX = require('xlsx');

/**
 * Excel 字段映射配置
 * 键：Excel 表头（中文）
 * 值：数据库字段名
 */
const FIELD_MAPPING = {
  '生日': 'birthday',
  '籍贯': 'hometown',
  '现居/工作城市': 'current_city',
  '学历': 'education',
  '行业': 'industry',
  '家庭成员情况': 'family_members',
  '身高（cm）': 'height',
  '兴趣爱好': 'hobbies',
  '性格': 'personality',
  '职位': 'position',
  '房产状况': 'property_status',
  '年收入': 'annual_income',
  '关于自己': 'self_introduction',
  '择偶标准': 'mate_selection_criteria',
  '婚后是否与父母同住': 'live_with_parents'
};

/**
 * Excel 解析器类
 */
class ExcelParser {
  /**
   * 解析 Excel 文件
   * @param {Buffer} fileBuffer - 文件缓冲区
   * @returns {Object} 解析结果
   */
  static parseExcelFile(fileBuffer) {
    try {
      // 读取工作簿
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // 获取第一个工作表
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // 转换为 JSON，保留原始表头
      const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });
      
      if (!rawData || rawData.length === 0) {
        throw new Error('Excel 文件为空或格式不正确');
      }
      
      // 处理数据
      const processedData = this.processData(rawData);
      
      return {
        success: true,
        data: processedData,
        totalRows: rawData.length
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }
  
  /**
   * 处理原始数据，转换字段并清洗数据
   * @param {Array} rawData - 原始数据数组
   * @returns {Array} 处理后的数据数组
   */
  static processData(rawData) {
    return rawData.map((row, index) => {
      try {
        const processedRow = {
          phone: null,
          profileData: {},
          rowNumber: index + 2, // Excel 行号（表头是第1行，数据从第2行开始）
          errors: []
        };
        
        // 提取手机号（必须字段）
        if (row['手机号']) {
          processedRow.phone = this.cleanPhone(row['手机号']);
          if (!processedRow.phone) {
            processedRow.errors.push('手机号格式无效');
          }
        } else {
          processedRow.errors.push('缺少手机号');
        }
        
        // 处理其他字段
        for (const [excelField, dbField] of Object.entries(FIELD_MAPPING)) {
          if (row.hasOwnProperty(excelField)) {
            const value = row[excelField];
            
            // 处理特殊字段
            if (dbField === 'birthday') {
              processedRow.profileData[dbField] = this.parseDate(value);
            } else if (dbField === 'height') {
              processedRow.profileData[dbField] = this.parseHeight(value);
            } else {
              // 普通字段：空值转为 null，否则转为字符串
              processedRow.profileData[dbField] = this.cleanValue(value);
            }
          }
        }
        
        return processedRow;
        
      } catch (error) {
        return {
          phone: null,
          profileData: {},
          rowNumber: index + 2,
          errors: [`处理失败: ${error.message}`]
        };
      }
    });
  }
  
  /**
   * 清洗手机号
   * @param {any} value - 手机号值
   * @returns {string|null} 清洗后的手机号
   */
  static cleanPhone(value) {
    if (!value) return null;
    
    // 转为字符串并去除空格、横线等
    const phone = String(value).replace(/[\s\-]/g, '');
    
    // 验证格式（11位数字）
    if (/^1\d{10}$/.test(phone)) {
      return phone;
    }
    
    return null;
  }
  
  /**
   * 解析日期
   * @param {any} value - 日期值
   * @returns {string|null} 格式化后的日期字符串 YYYY-MM-DD
   */
  static parseDate(value) {
    if (!value) return null;
    
    try {
      let date;
      
      // 如果是 Excel 序列号
      if (typeof value === 'number') {
        date = XLSX.SSF.parse_date_code(value);
        if (date) {
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
      }
      
      // 如果是字符串
      if (typeof value === 'string') {
        // 支持多种格式：1999-11-28, 1999/11/28, 19991128
        const cleaned = value.replace(/\s/g, '');
        
        // YYYY-MM-DD 或 YYYY/MM/DD
        if (/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/.test(cleaned)) {
          date = new Date(cleaned.replace(/\//g, '-'));
        }
        // YYYYMMDD
        else if (/^\d{8}$/.test(cleaned)) {
          const year = cleaned.substring(0, 4);
          const month = cleaned.substring(4, 6);
          const day = cleaned.substring(6, 8);
          date = new Date(`${year}-${month}-${day}`);
        }
        
        // 验证日期有效性
        if (date && !isNaN(date.getTime())) {
          const year = date.getFullYear();
          // 合理性检查：1900-2100年之间
          if (year >= 1900 && year <= 2100) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 解析身高
   * @param {any} value - 身高值
   * @returns {number|null} 身高数字
   */
  static parseHeight(value) {
    if (!value) return null;
    
    try {
      // 移除可能的单位和空格
      const cleaned = String(value).replace(/[^\d.]/g, '');
      const height = parseInt(cleaned);
      
      // 合理性检查：140-220cm
      if (!isNaN(height) && height >= 140 && height <= 220) {
        return height;
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 清洗普通值
   * @param {any} value - 原始值
   * @returns {string|null} 清洗后的值
   */
  static cleanValue(value) {
    // null, undefined, 空字符串 -> null
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // 转为字符串并去除首尾空格
    const cleaned = String(value).trim();
    
    return cleaned === '' ? null : cleaned;
  }
}

module.exports = ExcelParser;
