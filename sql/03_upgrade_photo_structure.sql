-- 数据库升级：照片存储结构从"一对一"改为"一对多"
-- 执行时间：建议在低峰期执行
-- 影响：删除旧字段，创建新表，不会影响现有数据

-- 第一步：删除 participants 表中的 photo_url 字段
ALTER TABLE `participants` 
DROP COLUMN `photo_url`;

-- 第二步：创建新的 participant_photos 表
CREATE TABLE `participant_photos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `participant_id` INT NOT NULL,
  `photo_url` VARCHAR(500) NOT NULL,
  `is_primary` BOOLEAN DEFAULT FALSE,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  KEY `idx_participant_id` (`participant_id`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 验证表结构
DESCRIBE `participants`;
DESCRIBE `participant_photos`;

-- 查看外键约束
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    REFERENCED_TABLE_NAME = 'participants' 
    AND TABLE_SCHEMA = DATABASE(); 