-- 分组结果表
CREATE TABLE IF NOT EXISTS grouping_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_batch INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    male_ids TEXT NOT NULL,
    female_ids TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
