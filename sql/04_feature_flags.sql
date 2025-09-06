-- 功能开关配置表
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    grouping_enabled BOOLEAN NOT NULL DEFAULT 0,
    chat_enabled BOOLEAN NOT NULL DEFAULT 0
);
