-- 功能开关配置表
DROP TABLE IF EXISTS `feature_flags`;
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grouping_enabled BOOLEAN NOT NULL DEFAULT 0,
    chat_enabled BOOLEAN NOT NULL DEFAULT 0
);

-- 插入默认功能开关记录
INSERT INTO feature_flags (grouping_enabled, chat_enabled) 
VALUES (0, 0);
