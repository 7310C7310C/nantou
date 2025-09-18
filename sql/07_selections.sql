-- 用户优先级选择表
-- 先删除旧表（若存在），然后重新创建，添加复合唯一约束以防重复选择
DROP TABLE IF EXISTS selections;

CREATE TABLE selections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    target_id INT NOT NULL,
    priority INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_target_id (target_id),
    UNIQUE KEY uq_user_target (user_id, target_id),
    CONSTRAINT fk_selections_user FOREIGN KEY (user_id) REFERENCES participants(id) ON DELETE CASCADE,
    CONSTRAINT fk_selections_target FOREIGN KEY (target_id) REFERENCES participants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
