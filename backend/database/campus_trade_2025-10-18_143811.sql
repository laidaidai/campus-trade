-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: campus_trade
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (11,'电子产品','📱',1,'2025-10-16 08:33:05'),(12,'图书教材','📚',2,'2025-10-16 08:33:05'),(13,'生活用品','🏠',3,'2025-10-16 08:33:05'),(14,'服装鞋帽','👔',4,'2025-10-16 08:33:05'),(15,'运动器材','⚽',5,'2025-10-16 08:33:05'),(16,'美妆护肤','💄',6,'2025-10-16 08:33:05'),(17,'数码配件','🔌',7,'2025-10-16 08:33:05'),(18,'文具用品','✏️',8,'2025-10-16 08:33:05'),(19,'食品饮料','🍔',9,'2025-10-16 08:33:05'),(20,'其他','📦',10,'2025-10-16 08:33:05');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;

--
-- Table structure for table `conversations`
--

DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `buyer_id` int NOT NULL,
  `seller_id` int NOT NULL,
  `last_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_message_time` datetime DEFAULT NULL,
  `buyer_unread_count` int DEFAULT '0',
  `seller_unread_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_conversation` (`product_id`,`buyer_id`,`seller_id`),
  KEY `buyer_id` (`buyer_id`),
  KEY `seller_id` (`seller_id`),
  CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversations`
--

/*!40000 ALTER TABLE `conversations` DISABLE KEYS */;
INSERT INTO `conversations` VALUES (1,4,3,2,'{\"product_id\":4,\"product_title\":\"11\",\"product_image\":\"http://localhost:3000/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\",\"original_price\":\"111.00\",\"final_price\":\"111.00\",\"address_id\":1,\"address_detail\":{\"id\":1,\"user_id\":3,\"name\":\"111\",\"phone\":\"111111\",\"province\":\"111\",\"city\":\"示例城市\",\"district\":\"11111\",\"detail\":\"示例街道 1 号\",\"is_default\":1,\"created_at\":\"2025-10-18T06:25:16.000Z\",\"updated_at\":\"2025-10-18T06:25:18.000Z\"},\"status\":\"confirmed\",\"remark\":\"\",\"order_id\":1}','2025-10-18 14:25:23',0,0,'2025-10-18 14:24:56','2025-10-18 14:25:31');
/*!40000 ALTER TABLE `conversations` ENABLE KEYS */;

--
-- Table structure for table `favorites`
--

DROP TABLE IF EXISTS `favorites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `favorites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_favorite` (`user_id`,`product_id`),
  KEY `idx_user_favorites` (`user_id`,`created_at`),
  KEY `idx_product_favorites` (`product_id`),
  CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `favorites`
--

/*!40000 ALTER TABLE `favorites` DISABLE KEYS */;
INSERT INTO `favorites` VALUES (1,3,4,'2025-10-18 06:24:55');
/*!40000 ALTER TABLE `favorites` ENABLE KEYS */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('text','image','order') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,3,2,'{\"product_id\":4,\"product_title\":\"11\",\"product_image\":\"http://localhost:3000/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\",\"original_price\":\"111.00\",\"final_price\":\"111.00\",\"address_id\":1,\"address_detail\":{\"id\":1,\"user_id\":3,\"name\":\"111\",\"phone\":\"111111\",\"province\":\"111\",\"city\":\"示例城市\",\"district\":\"11111\",\"detail\":\"示例街道 1 号\",\"is_default\":1,\"created_at\":\"2025-10-18T06:25:16.000Z\",\"updated_at\":\"2025-10-18T06:25:18.000Z\"},\"status\":\"pending\",\"remark\":\"\"}','order',1,'2025-10-18 14:25:22'),(2,1,3,2,'{\"product_id\":4,\"product_title\":\"11\",\"product_image\":\"http://localhost:3000/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\",\"original_price\":\"111.00\",\"final_price\":\"111.00\",\"address_id\":1,\"address_detail\":{\"id\":1,\"user_id\":3,\"name\":\"111\",\"phone\":\"111111\",\"province\":\"111\",\"city\":\"示例城市\",\"district\":\"11111\",\"detail\":\"示例街道 1 号\",\"is_default\":1,\"created_at\":\"2025-10-18T06:25:16.000Z\",\"updated_at\":\"2025-10-18T06:25:18.000Z\"},\"status\":\"confirmed\",\"remark\":\"\",\"order_id\":1}','order',1,'2025-10-18 14:25:23');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `seller_id` int NOT NULL COMMENT '卖家ID',
  `buyer_id` int NOT NULL COMMENT '买家ID',
  `price` decimal(10,2) NOT NULL COMMENT '成交价格',
  `status` enum('pending','paid','shipped','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '订单状态',
  `address_id` int DEFAULT NULL COMMENT '收货地址ID',
  `remark` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '备注',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '下单时间',
  `paid_at` datetime DEFAULT NULL COMMENT '付款时间',
  `shipped_at` datetime DEFAULT NULL COMMENT '发货时间',
  `completed_at` datetime DEFAULT NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `address_id` (`address_id`),
  KEY `idx_seller` (`seller_id`,`status`),
  KEY `idx_buyer` (`buyer_id`,`status`),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_3` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `orders_ibfk_4` FOREIGN KEY (`address_id`) REFERENCES `user_addresses` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,4,2,3,111.00,'pending',1,'','2025-10-18 14:25:23',NULL,NULL,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `condition` enum('new','like-new','good','fair','poor') NOT NULL,
  `category` varchar(50) NOT NULL,
  `images` json DEFAULT NULL,
  `seller_id` int NOT NULL,
  `status` enum('available','sold','reserved') DEFAULT 'available',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_id` (`seller_id`),
  KEY `idx_category` (`category`),
  KEY `idx_status` (`status`),
  KEY `idx_price` (`price`),
  KEY `idx_created_at` (`created_at`),
  FULLTEXT KEY `title` (`title`,`description`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'111','1111',1111.00,'new','服装鞋帽','[\"/uploads/products/9be927cc10948900ad9b49a2be9b9b78.png\", \"/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\", \"/uploads/products/2d06291a8ed02f8cfc6b3c657ad20d32.png\", \"/uploads/products/4d6b94ca714e41481156ea2b296c6516.png\", \"/uploads/products/77dcdb31c07ffe178c048f9002be13f2.png\", \"/uploads/products/ca32569101c5eef101db9a627d0be7b2.png\"]',2,'available','2025-10-18 05:58:13','2025-10-18 05:58:13'),(2,'111','1111',11.00,'new','生活用品','[\"/uploads/products/9be927cc10948900ad9b49a2be9b9b78.png\", \"/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\", \"/uploads/products/2d06291a8ed02f8cfc6b3c657ad20d32.png\", \"/uploads/products/4d6b94ca714e41481156ea2b296c6516.png\", \"/uploads/products/77dcdb31c07ffe178c048f9002be13f2.png\", \"/uploads/products/ca32569101c5eef101db9a627d0be7b2.png\"]',2,'available','2025-10-18 05:59:04','2025-10-18 05:59:04'),(3,'1111','111',1111.00,'new','生活用品','[\"/uploads/products/9be927cc10948900ad9b49a2be9b9b78.png\", \"/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\", \"/uploads/products/2d06291a8ed02f8cfc6b3c657ad20d32.png\", \"/uploads/products/4d6b94ca714e41481156ea2b296c6516.png\", \"/uploads/products/77dcdb31c07ffe178c048f9002be13f2.png\"]',2,'available','2025-10-18 06:03:54','2025-10-18 06:03:54'),(4,'11','111',111.00,'like-new','图书教材','[\"/uploads/products/8c6035a916b85dd7157e6dafd963e2d5.JPEG\"]',2,'sold','2025-10-18 06:20:58','2025-10-18 06:25:23');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;

--
-- Table structure for table `user_addresses`
--

DROP TABLE IF EXISTS `user_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_addresses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收货人姓名',
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '联系电话',
  `province` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '省份',
  `city` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '城市',
  `district` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '区县',
  `detail` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '详细地址',
  `is_default` tinyint(1) DEFAULT '0' COMMENT '是否默认地址',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_default` (`user_id`,`is_default`),
  CONSTRAINT `user_addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_addresses`
--

/*!40000 ALTER TABLE `user_addresses` DISABLE KEYS */;
INSERT INTO `user_addresses` VALUES (1,3,'111','111111','111','示例城市','11111','示例街道 1 号',1,'2025-10-18 14:25:16','2025-10-18 14:25:18');
/*!40000 ALTER TABLE `user_addresses` ENABLE KEYS */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `role` enum('user','admin','moderator') NOT NULL DEFAULT 'user' COMMENT '用户角色：user-普通用户，admin-管理员，moderator-版主',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'testuser','test@campus.com','$2a$12$/7abif9sm/ruv.oyCPOPaOcs2HQgfKKPnU55X9WQhN1CccVXaUf5W',NULL,'13800000000','user','2025-10-18 06:37:43','2025-10-18 06:37:43'),(2,'admin','admin@example.com','$2a$12$/7abif9sm/ruv.oyCPOPaOcs2HQgfKKPnU55X9WQhN1CccVXaUf5W',NULL,NULL,'admin','2025-10-18 06:37:43','2025-10-18 06:37:43'),(3,'demo','demo@example.com','$2a$12$/7abif9sm/ruv.oyCPOPaOcs2HQgfKKPnU55X9WQhN1CccVXaUf5W',NULL,NULL,'user','2025-10-18 06:37:43','2025-10-18 06:37:43');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

--
-- Table structure for table `verification_codes`
--

DROP TABLE IF EXISTS `verification_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verification_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱',
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证码',
  `type` enum('register','reset-password') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '验证码类型',
  `expires_at` datetime NOT NULL COMMENT '过期时间',
  `is_used` tinyint(1) DEFAULT '0' COMMENT '是否已使用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_type` (`email`,`type`,`expires_at`),
  KEY `idx_cleanup` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_codes`
--

/*!40000 ALTER TABLE `verification_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_codes` ENABLE KEYS */;

--
-- Table structure for table `view_history`
--

DROP TABLE IF EXISTS `view_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `view_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `view_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_product` (`user_id`,`product_id`),
  KEY `idx_user_time` (`user_id`,`view_time` DESC),
  KEY `idx_product` (`product_id`),
  CONSTRAINT `view_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `view_history_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `view_history`
--

/*!40000 ALTER TABLE `view_history` DISABLE KEYS */;
INSERT INTO `view_history` VALUES (1,3,4,'2025-10-18 14:24:52');
/*!40000 ALTER TABLE `view_history` ENABLE KEYS */;

--
-- Dumping routines for database 'campus_trade'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-18 14:38:22
