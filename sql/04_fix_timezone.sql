-- 修复数据库时区设置
-- 执行此脚本前请先备份数据库

-- 1. 设置全局时区（需要管理员权限）
-- SET GLOBAL time_zone = '+08:00';

-- 2. 设置会话时区
SET time_zone = '+08:00';

-- 3. 检查当前时区设置
SELECT 
    @@global.time_zone as global_timezone,
    @@session.time_zone as session_timezone,
    @@system_time_zone as system_timezone,
    NOW() as current_time,
    UTC_TIMESTAMP() as utc_time;

-- 4. 如果需要修复现有数据的时间（假设数据是UTC时间，需要转换为北京时间）
-- 注意：只有在确认现有数据确实是UTC时间时才执行以下语句
-- UPDATE participants SET 
--     created_at = CONVERT_TZ(created_at, '+00:00', '+08:00'),
--     updated_at = CONVERT_TZ(updated_at, '+00:00', '+08:00');

-- 5. 检查修复后的数据
SELECT 
    id,
    name,
    created_at,
    updated_at
FROM participants 
ORDER BY created_at DESC 
LIMIT 5; 