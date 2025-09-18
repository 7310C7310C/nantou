# 核心算法模块接口契约

## 一、函数

1.  **`generateGroups(participants, selections, matchmaker_picks, options)`**
2.  **`generateChatLists(participants, selections, matchmaker_picks, options)`**

## 二、输入数据结构 (Inputs)

#### 1. `participants`: `Array<Object>`
```json
[
  { "id": 1001, "gender": "male" },
  { "id": 2001, "gender": "female" }
]
```

#### 2. `selections`: `Object`
```json
{
  "1001": [ 
    { "id": "2101", "priority": 1 },
    { "id": "2102", "priority": 2 },
    { "id": "2103", "priority": 3 },
    { "id": "2104", "priority": 4 },
    { "id": "2105", "priority": 5 }
  ],
  "1101": [ 
    { "id": "2001", "priority": 1 },
    { "id": "2002", "priority": 2 },
    { "id": "2003", "priority": 3 },
    { "id": "2004", "priority": 4 },
    { "id": "2005", "priority": 5 }
  ]
}
```

#### 3. `matchmaker_picks`: `Array<Object>`
```json
[
  { "matchmaker_id": "mk_A", "person1_id": 1001, "person2_id": 2001, "stars": 5 },
  { "matchmaker_id": "mk_B", "person1_id": 2001, "person2_id": 1001, "stars": 3 },
  { "matchmaker_id": "mk_A", "person1_id": 1002, "person2_id": 2003, "stars": 2 }
]
```

#### 4. `options`: `Object`
```json
{
  "group_size_male": 4,
  "group_size_female": 4,
  "list_size": 5
}
```

## 三、输出数据结构 (Outputs)

#### `generateGroups()` 的返回值
```json
{
  "groups": [
    {
      "group_id": 1,
      "male_ids": ["1001", "1005", "1008", "1012"],
      "female_ids": ["2101", "2103", "2109", "2111"]
    },
    {
      "group_id": 2,
      "male_ids": ["1002", "1006", "1010", "1015"],
      "female_ids": ["2102", "2104", "2106", "2113"]
    },
    {
      "group_id": 21,
      "male_ids": ["1081", "1082", "1083", "1084", "1085"],
      "female_ids": ["2091", "2092", "2093"]
    }
  ]
}
```

#### `generateChatLists()` 的返回值
```json
{
  "1001": [2001, 2002, 2005, 2008, 2010],
  "2001": [1001, 1002, 1007, 1009, 1011]
}
```