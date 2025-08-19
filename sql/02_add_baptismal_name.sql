-- 为 participants 表添加 baptismal_name 字段
-- 执行时间：建议在低峰期执行
-- 影响：为现有表添加新字段，不会影响现有数据

ALTER TABLE `participants` 
ADD COLUMN `baptismal_name` VARCHAR(100) NULL 
AFTER `name`;

-- 验证字段是否添加成功
DESCRIBE `participants`; 