SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

-- 添加感谢页面开关
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS thankyou_page BOOLEAN DEFAULT FALSE COMMENT '感谢页面开关：开启后显示活动结束页面';

-- 默认关闭感谢页面
UPDATE feature_flags SET thankyou_page = FALSE WHERE id = 1;
