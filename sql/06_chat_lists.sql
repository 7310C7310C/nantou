-- 聊天名单结果表
CREATE TABLE IF NOT EXISTS chat_lists (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_batch INT NOT NULL, -- '轮次'
    user_id VARCHAR(50) NOT NULL, -- '参与者账号'
    target_id VARCHAR(50) NOT NULL, -- '待聊参与者账号'
    is_completed BOOLEAN NOT NULL DEFAULT 0, -- '已聊标记 0-未聊 1-已聊'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
