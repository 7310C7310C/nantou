-- =====================================================
-- 参与者详细资料字段扩展
-- 创建日期: 2025-10-12
-- 描述: 为 participants 表添加详细的个人资料字段
-- =====================================================

SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

-- 添加详细资料字段
ALTER TABLE `participants` 
  -- 基本信息
  ADD COLUMN `birthday` DATE DEFAULT NULL COMMENT '生日',
  ADD COLUMN `hometown` VARCHAR(100) DEFAULT NULL COMMENT '籍贯',
  ADD COLUMN `current_city` VARCHAR(100) DEFAULT NULL COMMENT '现居/工作城市',
  ADD COLUMN `education` VARCHAR(50) DEFAULT NULL COMMENT '学历',
  ADD COLUMN `industry` VARCHAR(100) DEFAULT NULL COMMENT '行业',
  ADD COLUMN `position` VARCHAR(100) DEFAULT NULL COMMENT '职位',
  ADD COLUMN `height` INT DEFAULT NULL COMMENT '身高(cm)',
  
  -- 家庭与经济状况
  ADD COLUMN `family_members` TEXT DEFAULT NULL COMMENT '家庭成员情况',
  ADD COLUMN `property_status` VARCHAR(50) DEFAULT NULL COMMENT '房产状况',
  ADD COLUMN `annual_income` VARCHAR(50) DEFAULT NULL COMMENT '年收入',
  
  -- 个人特质
  ADD COLUMN `hobbies` TEXT DEFAULT NULL COMMENT '兴趣爱好',
  ADD COLUMN `personality` TEXT DEFAULT NULL COMMENT '性格',
  ADD COLUMN `self_introduction` TEXT DEFAULT NULL COMMENT '关于自己',
  
  -- 择偶相关
  ADD COLUMN `mate_selection_criteria` TEXT DEFAULT NULL COMMENT '择偶标准',
  ADD COLUMN `live_with_parents` VARCHAR(20) DEFAULT NULL COMMENT '婚后是否与父母同住',
  
  -- 资料完整度标记
  ADD COLUMN `profile_completed` TINYINT(1) DEFAULT 0 COMMENT '详细资料是否完善';

-- 添加索引以优化查询性能
ALTER TABLE `participants`
  ADD INDEX `idx_birthday` (`birthday`),
  ADD INDEX `idx_current_city` (`current_city`),
  ADD INDEX `idx_education` (`education`),
  ADD INDEX `idx_height` (`height`),
  ADD INDEX `idx_profile_completed` (`profile_completed`);

-- 添加注释说明
ALTER TABLE `participants` COMMENT '参与者表 - 包含基本信息和详细资料';
