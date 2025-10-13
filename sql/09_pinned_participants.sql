-- 添加置顶功能字段
-- 用于 admin/staff/matchmaker 将特定参与者置顶显示

ALTER TABLE participants 
ADD COLUMN is_pinned TINYINT(1) DEFAULT 0 COMMENT '是否置顶：0-否，1-是' AFTER is_checked_in,
ADD INDEX idx_is_pinned (is_pinned);
