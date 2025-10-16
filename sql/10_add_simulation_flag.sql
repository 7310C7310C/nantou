-- 添加算法模拟功能开关
-- 检查列是否存在，如果不存在则添加
SET @col_exists = (SELECT COUNT(*) 
                   FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = 'nantou_db' 
                   AND TABLE_NAME = 'feature_flags' 
                   AND COLUMN_NAME = 'simulation_enabled');

SET @sql = IF(@col_exists = 0,
              'ALTER TABLE feature_flags ADD COLUMN simulation_enabled BOOLEAN NOT NULL DEFAULT 0',
              'SELECT "Column simulation_enabled already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
