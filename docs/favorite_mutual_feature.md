# 收藏互选情况功能说明

## 功能概述
在"被收藏情况"右侧新增"收藏互选情况"功能，用于查看所有参与者的收藏关系，包括互相收藏的情况。

## 特点
- **无需签到**：显示所有参与者，不限制已签到状态
- **参考终选互选情况UI**：界面设计和交互逻辑与"终选互选情况"保持一致
- **互收藏标识**：相互收藏的关系用红色标注

## UI元素

### 统计看板
- 总参与者数量
- 男生数量
- 女生数量

### 搜索和筛选
- **搜索框**：可搜索编号或姓名
- **性别选项卡**：女/男切换
- **筛选选项**：
  - 全部
  - 只看有互收藏的

### 显示内容
每个参与者卡片显示：
- 头像照片
- 姓名
- 用户名(username)
- 收藏的对象列表
  - 只显示姓名和username（不显示1 2 3...序号）
  - 互相收藏的关系标红

## 技术实现

### 后端 API
**路由**: `GET /api/admin/favorite-mutual-data`

**权限**: admin, staff, matchmaker

**返回数据结构**:
```json
{
  "success": true,
  "data": {
    "participants": [
      {
        "id": 1,
        "username": "M001",
        "name": "张三",
        "baptismal_name": "若望",
        "gender": "male",
        "phone": "13800138000",
        "is_checked_in": 1,
        "photo_url": "https://..."
      }
    ],
    "favorites": [
      {
        "user_id": 1,
        "target_id": 2,
        "user_name": "张三",
        "user_username": "M001",
        "target_name": "李四",
        "target_username": "F001"
      }
    ],
    "mutualFavorites": [
      "1-2",
      "3-4"
    ],
    "summary": {
      "totalParticipants": 50,
      "maleCount": 25,
      "femaleCount": 25
    }
  }
}
```

### 前端实现

**HTML元素**:
- 按钮: `#openFavoriteMutualBtn`
- 模态框: `#favoriteMutualModal`
- 统计数据: `#favoriteMutualTotal`, `#favoriteMutualMaleCount`, `#favoriteMutualFemaleCount`
- 搜索框: `#favoriteMutualSearchInput`
- 性别选项: `favoriteMutualGender` (radio group)
- 筛选选项: `favoriteMutualFilter` (radio group)
- 列表容器: `#favoriteMutualList`

**主要函数**:
- `openFavoriteMutualModal()` - 打开模态框
- `closeFavoriteMutualModal()` - 关闭模态框
- `loadFavoriteMutualData()` - 加载数据
- `applyFavoriteMutualFilters()` - 应用过滤器
- `renderFavoriteMutualParticipants()` - 渲染列表

## 文件修改清单

1. **controllers/admin.controller.js**
   - 新增 `getFavoriteMutualData()` 函数
   - 导出 `getFavoriteMutualData`

2. **server.js**
   - 新增路由: `/api/admin/favorite-mutual-data`

3. **public/admin.html**
   - 数据统计卡片新增"收藏互选情况"按钮
   - 新增收藏互选情况模态框

4. **public/js/admin.js**
   - 新增全局变量 `favoriteMutualData`
   - 新增事件监听器绑定
   - 新增所有收藏互选情况相关函数

## 使用说明

1. 点击"数据统计"卡片中的"收藏互选情况"按钮
2. 系统加载所有参与者的收藏数据
3. 使用搜索框和筛选器查看特定条件的数据
4. 红色标注的项目表示互相收藏关系

## 与"被收藏情况"的区别

| 特性 | 被收藏情况 | 收藏互选情况 |
|------|-----------|-------------|
| 显示范围 | 所有参与者 | 所有参与者 |
| 签到限制 | 无 | 无 |
| 主要信息 | 被收藏次数 | 收藏的对象列表 |
| 互选标识 | 无 | 有（红色） |
| 序号显示 | 无 | 无 |

## 与"终选互选情况"的区别

| 特性 | 终选互选情况 | 收藏互选情况 |
|------|-------------|-------------|
| 数据来源 | selections表 | favorites表 |
| 签到限制 | 已签到 | 无限制 |
| 优先级序号 | 有(1-7) | 无 |
| 选满筛选 | 有 | 无 |
| 互选标识 | 有（红色） | 有（红色） |
