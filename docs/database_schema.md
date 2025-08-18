# 数据库核心表结构（初版，不要依此开发）

## 1. `participants` - 参与者表

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `username` | `VARCHAR` | 登录账号, **唯一** |
| `password` | `VARCHAR` | 加密后的密码哈希 |
| `name` | `VARCHAR` | 姓名或昵称 |
| `gender` | `VARCHAR` | 'male' 或 'female' |
| `photo_url` | `VARCHAR` | OSS上的照片URL |
| `is_checked_in`| `BOOLEAN` | 是否已签到, 默认FALSE |
| `created_at` | `TIMESTAMP` | 创建时间 |

## 2. `staff_users` - 工作人员表

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `username` | `VARCHAR` | 登录账号, **唯一** |
| `password` | `VARCHAR` | 加密后的密码哈希 |
| `role` | `VARCHAR` | 'admin' 或 'matchmaker'  或 'sign' |

## 3. `selections` - 用户选择表

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `selector_id` | `INT` | 外键, 关联 `participants.id` |
| `selected_id` | `INT` | 外键, 关联 `participants.id` |
| `priority` | `INT` | 优先级, 1-5 |
| `selection_type` | `VARCHAR` | 'GROUPING' 或 'CHATTING' |

## 4. `matchmaker_recommendations` - 红娘推荐表

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `matchmaker_id`| `INT` | 外键, 关联 `staff_users.id` |
| `person1_id` | `INT` | 外键, 关联 `participants.id` |
| `person2_id` | `INT` | 外键, 关联 `participants.id` |
| `stars` | `INT` | 推荐星级, 1-5 |

## 5. `groups` & `group_members` - 分组结果表

**`groups` 表:**

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `group_number` | `INT` | 小组编号, 如 1, 2... |

**`group_members` 关联表:**

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `group_id` | `INT` | 外键, 关联 `groups.id` |
| `participant_id` | `INT` | 外键, 关联 `participants.id` |

## 6. `chat_lists` - 待聊名单结果表

| 字段名 | 类型 | 备注 |
| :--- | :--- | :--- |
| `id` | `INT` | **主键**, 自动递增 |
| `list_owner_id` | `INT` | 外键, 关联 `participants.id` |
| `recommended_id`| `INT` | 外键, 关联 `participants.id` |
| `rank` | `INT` | 在名单中的排序, 1-5 |