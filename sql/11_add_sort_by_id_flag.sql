-- 添加首页按编号顺序显示功能开关
ALTER TABLE feature_flags 
ADD COLUMN sort_by_id_enabled BOOLEAN NOT NULL DEFAULT 0 COMMENT '首页按编号顺序显示';
