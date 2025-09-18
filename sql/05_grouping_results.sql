-- 分组结果表
CREATE TABLE IF NOT EXISTS grouping_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_batch INT NOT NULL,
    group_id INT NOT NULL,
    male_ids TEXT NOT NULL,
    female_ids TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
