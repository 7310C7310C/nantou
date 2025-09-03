-- 
-- Table structure for table `matchmaker_recommendations`
-- 用于存储红娘推荐记录
--

SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

DROP TABLE IF EXISTS `matchmaker_recommendations`;
CREATE TABLE `matchmaker_recommendations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `matchmaker_id` INT NOT NULL,
  `person1_id` INT NOT NULL,
  `person2_id` INT NOT NULL,
  `stars` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_matchmaker_recommendation` (`matchmaker_id`, `person1_id`, `person2_id`),
  CONSTRAINT `fk_recommendation_matchmaker` FOREIGN KEY (`matchmaker_id`) REFERENCES `staff_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recommendation_person1` FOREIGN KEY (`person1_id`) REFERENCES `participants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_recommendation_person2` FOREIGN KEY (`person2_id`) REFERENCES `participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
