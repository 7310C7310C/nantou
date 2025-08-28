SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;
--
-- Table structure for table `participants`
--

DROP TABLE IF EXISTS `participants`;
CREATE TABLE `participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `baptismal_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_checked_in` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  KEY `idx_gender` (`gender`),
  KEY `idx_checked_in` (`is_checked_in`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `participants` VALUES (17,'2001','$2a$10$17OH.hSLHeCH0YMwaDK45O/Oddpn6gpP45de2vFKejfNODK6KBpB2','杨一','玛利亚','female','13000000000',0,'2025-08-21 13:56:27','2025-08-21 18:46:14'),(18,'1001','$2a$10$25vPsThFNB8K6YNKSsoOLuPCB0VJ/1mRyCNvRYJWBRv9DkyHRRAD2','杨一','若瑟','male','13000000001',0,'2025-08-21 15:16:44','2025-08-21 15:16:44'),(19,'2002','$2a$10$AZiv9iYDIQAzsnBRQ/6rLOP.rZOevGtBQzJgj7qDz0IY1x.sk/ZAW','杨一','玛利亚','female','13000000002',0,'2025-08-21 15:19:24','2025-08-21 15:19:24'),(20,'2003','$2a$10$TXZFuWd1bWWVo8MXdzIy1uuhKwb6V9Ir3vUiIQKSFjYuGqG9ky/HC','杨一','玛利亚','female','13000000003',0,'2025-08-21 15:27:57','2025-08-21 15:27:57'),(21,'2004','$2a$10$hozFjXsDUGQy4/Z.H8L3nuUwF7cZFh1PD9Ym3Na7suqL5RYvESG9W','杨一','玛利亚','female','13000000004',0,'2025-08-21 17:32:35','2025-08-21 17:34:44'),(22,'2005','$2a$10$YHJMT/.lZoNsW6YPEsHKHOQ4BHHDEvgt0MjCUooizMXPXPrVgWpK.','杨一','玛利亚','female','13000000005',0,'2025-08-21 18:39:32','2025-08-21 18:41:57'),(23,'2006','$2a$10$KyaucV2BleB7.Bf37dao5uwD7GxXPfp.aJoF83Nuq6FvNS1OwU.H2','杨一','玛利亚','female','13000000006',0,'2025-08-21 18:44:18','2025-08-21 18:46:32'),(24,'2007','$2a$10$nK7DmyqzCWnBNMVvi4ZLM.yPpyla.reAr9Ks2wiCw7h6vOSz2GT2u','杨一','小德兰','female','13000000007',0,'2025-08-21 20:00:25','2025-08-24 15:37:57'),(25,'2008','$2a$10$kD7y80ZSNxpG8GjS4X97cOJ7pfiN.hvw1p/UKAoQCfovDutfxCibS','杨8','玛利亚','female','13000000008',0,'2025-08-24 09:17:32','2025-08-24 09:17:32'),(26,'2009','$2a$10$uR1/pQCJQqCTGA7hhWA3g.4XZpBLRdj5RxaDkjA6xGVRMjxJk8.Mu','杨9','玛利亚','female','13000000009',0,'2025-08-24 09:18:49','2025-08-24 09:18:49'),(27,'2010','$2a$10$g./wuodweFrUMW.Af1Znc.dqiQs5rMcG8ddzZNHNXhO5LkDJ33nrC','杨10','玛利亚','female','13000000010',0,'2025-08-24 09:19:14','2025-08-24 09:19:14'),(28,'2011','$2a$10$NNaqMOSUiCb5KfTrQ5/tm.55nNcD7LGRA5zCI65HhZEV6y7wouG6q','杨11','玛利亚','female','13000000011',0,'2025-08-24 09:20:03','2025-08-24 09:20:03'),(29,'2012','$2a$10$xJ3B7YW5HhEfYc.Z4gU3huXj5TsHvHeoEvNo01BfG3xdVo6o.NeMS','杨12','玛利亚','female','13000000012',0,'2025-08-24 09:20:32','2025-08-24 09:20:32'),(30,'2013','$2a$10$UA5caE6RYMOqGLFyTi3CdOLNu2ENH1n.vAsY0sq3/dZuK5nH97906','杨13','玛利亚','female','13000000013',0,'2025-08-24 10:08:39','2025-08-24 10:08:39'),(31,'2014','$2a$10$I9RfxeynyD8uZfUknq6upeM8u7fs4ds1YS6iwagvxt37ixWyDJO5e','杨14','玛利亚','female','13000000014',0,'2025-08-25 17:06:25','2025-08-25 17:06:25');

--
-- Table structure for table `participant_photos`
--

DROP TABLE IF EXISTS `participant_photos`;
CREATE TABLE `participant_photos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `participant_id` int NOT NULL,
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_participant_id` (`participant_id`),
  KEY `idx_is_primary` (`is_primary`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `participant_photos_ibfk_1` FOREIGN KEY (`participant_id`) REFERENCES `participants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `participant_photos` VALUES (27,17,'https://imgt.nantou.love/2001_1.jpg',1,1,'2025-08-21 13:56:30','2025-08-21 13:56:30'),(28,17,'https://imgt.nantou.love/2001_2.jpg',0,2,'2025-08-21 13:56:34','2025-08-21 13:56:34'),(29,17,'https://imgt.nantou.love/2001_3.jpg',0,3,'2025-08-21 13:56:39','2025-08-21 13:56:39'),(30,17,'https://imgt.nantou.love/2001_4.jpg',0,4,'2025-08-21 13:56:49','2025-08-21 13:56:49'),(31,17,'https://imgt.nantou.love/2001_5.jpg',0,5,'2025-08-21 13:56:53','2025-08-21 13:56:53'),(32,18,'https://imgt.nantou.love/1001_1.jpg',1,1,'2025-08-21 15:16:50','2025-08-21 15:16:50'),(33,18,'https://imgt.nantou.love/1001_2.jpg',0,2,'2025-08-21 15:16:53','2025-08-21 15:16:53'),(34,18,'https://imgt.nantou.love/1001_3.jpg',0,3,'2025-08-21 15:16:57','2025-08-21 15:16:57'),(35,18,'https://imgt.nantou.love/1001_4.jpg',0,4,'2025-08-21 15:17:00','2025-08-21 15:17:00'),(36,18,'https://imgt.nantou.love/1001_5.jpg',0,5,'2025-08-21 15:17:05','2025-08-21 15:17:05'),(37,19,'https://imgt.nantou.love/2002_1.jpg',1,1,'2025-08-21 15:19:31','2025-08-21 15:19:31'),(38,19,'https://imgt.nantou.love/2002_2.jpg',0,2,'2025-08-21 15:19:35','2025-08-21 15:19:35'),(39,20,'https://imgt.nantou.love/2003_1.jpg',1,1,'2025-08-21 15:28:01','2025-08-21 15:28:01'),(40,21,'https://imgt.nantou.love/2004_1.jpg',1,1,'2025-08-21 17:32:40','2025-08-21 17:32:40'),(41,21,'https://imgt.nantou.love/2004_2.jpg',0,2,'2025-08-21 17:32:42','2025-08-21 17:32:42'),(42,22,'https://imgt.nantou.love/2005_1.jpg',1,1,'2025-08-21 18:39:37','2025-08-21 18:39:37'),(43,22,'https://imgt.nantou.love/2005_2.jpg',0,2,'2025-08-21 18:39:39','2025-08-21 18:39:39'),(44,22,'https://imgt.nantou.love/2005_3.jpg',0,3,'2025-08-21 18:39:42','2025-08-21 18:39:42'),(45,23,'https://imgt.nantou.love/2006_1.jpg',1,1,'2025-08-21 18:44:21','2025-08-21 18:44:21'),(46,24,'https://imgt.nantou.love/2007_1.jpg',1,1,'2025-08-21 20:00:28','2025-08-21 20:00:28'),(47,24,'https://imgt.nantou.love/2007_2.jpg',0,2,'2025-08-21 20:00:30','2025-08-21 20:00:30'),(48,24,'https://imgt.nantou.love/2007_3.jpg',0,3,'2025-08-21 20:00:34','2025-08-21 20:00:34'),(49,25,'https://imgt.nantou.love/2008_1.jpg',1,1,'2025-08-24 09:17:36','2025-08-24 09:17:36'),(50,26,'https://imgt.nantou.love/2009_1.jpg',1,1,'2025-08-24 09:18:52','2025-08-24 09:18:52'),(51,27,'https://imgt.nantou.love/2010_1.jpg',1,1,'2025-08-24 09:19:19','2025-08-24 09:19:19'),(52,28,'https://imgt.nantou.love/2011_1.jpg',1,1,'2025-08-24 09:20:06','2025-08-24 09:20:06'),(53,29,'https://imgt.nantou.love/2012_1.jpg',1,1,'2025-08-24 09:20:40','2025-08-24 09:20:40'),(54,30,'https://imgt.nantou.love/2013_1.jpg',1,1,'2025-08-24 10:08:43','2025-08-24 10:08:43'),(55,30,'https://imgt.nantou.love/2013_2.jpg',0,2,'2025-08-24 10:08:46','2025-08-24 10:08:46'),(56,31,'https://imgt.nantou.love/2014_1.jpg',1,1,'2025-08-25 17:06:29','2025-08-25 17:06:29'),(57,31,'https://imgt.nantou.love/2014_2.jpg',0,2,'2025-08-25 17:06:33','2025-08-25 17:06:33'),(58,31,'https://imgt.nantou.love/2014_3.jpg',0,3,'2025-08-25 17:06:36','2025-08-25 17:06:36'),(59,31,'https://imgt.nantou.love/2014_4.jpg',0,4,'2025-08-25 17:06:38','2025-08-25 17:06:38'),(60,31,'https://imgt.nantou.love/2014_5.jpg',0,5,'2025-08-25 17:06:41','2025-08-25 17:06:41');

--
-- Table structure for table `staff_users`
--

DROP TABLE IF EXISTS `staff_users`;
CREATE TABLE `staff_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO `staff_users` VALUES (1,'admin01','$2b$12$Dj2mHIw9mTf3BsD.BtdQKO0Z3YtoMbd.4BTa2OZWc12JHsh8lnekW','admin','2025-08-18 16:32:29','2025-08-18 16:32:29'),(2,'staff01','$2b$12$8kVf8skLggctqpXLK/L34.zqxpCdf9U2D6l7e7ZLJA0uF9RXcVvnq','staff','2025-08-18 16:32:29','2025-08-18 16:32:29'),(3,'mk01','$2b$12$rjy5XSQ0sPrbZxDcLR3il.baGIxj0kxtNSrvwc1LlTRQnjbKAzxfO','matchmaker','2025-08-18 16:32:29','2025-08-18 16:32:29');