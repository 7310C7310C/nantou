-- 创建参与者表
CREATE TABLE `participants` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `baptismal_name` VARCHAR(100),
  `gender` VARCHAR(10) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `photo_url` VARCHAR(500),
  `is_checked_in` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_gender` (`gender`),
  KEY `idx_checked_in` (`is_checked_in`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建工作人员表
CREATE TABLE `staff_users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建用户选择表
CREATE TABLE `selections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `selector_id` INT NOT NULL,
  `selected_id` INT NOT NULL,
  `priority` INT NOT NULL,
  `selection_type` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`selector_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`selected_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_selection` (`selector_id`, `selected_id`, `selection_type`),
  KEY `idx_selector` (`selector_id`),
  KEY `idx_selected` (`selected_id`),
  KEY `idx_type` (`selection_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建红娘推荐表
CREATE TABLE `matchmaker_recommendations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `matchmaker_id` INT NOT NULL,
  `person1_id` INT NOT NULL,
  `person2_id` INT NOT NULL,
  `stars` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`matchmaker_id`) REFERENCES `staff_users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`person1_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`person2_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_recommendation` (`person1_id`, `person2_id`),
  KEY `idx_matchmaker` (`matchmaker_id`),
  KEY `idx_person1` (`person1_id`),
  KEY `idx_person2` (`person2_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建分组表
CREATE TABLE `groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `group_number` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_number` (`group_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建分组成员关联表
CREATE TABLE `group_members` (
  `group_id` INT NOT NULL,
  `participant_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`group_id`, `participant_id`),
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  KEY `idx_group` (`group_id`),
  KEY `idx_participant` (`participant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建待聊名单结果表
CREATE TABLE `chat_lists` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `list_owner_id` INT NOT NULL,
  `recommended_id` INT NOT NULL,
  `rank` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`list_owner_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`recommended_id`) REFERENCES `participants`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_chat_list` (`list_owner_id`, `recommended_id`),
  KEY `idx_owner` (`list_owner_id`),
  KEY `idx_recommended` (`recommended_id`),
  KEY `idx_rank` (`rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;