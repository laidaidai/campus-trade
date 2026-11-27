-- 校园面交 / 邮寄双模式交易闭环
-- 1. 订单增加交易方式、面交信息和双方确认时间
-- 2. 新增互评表，评价与订单一一绑定

ALTER TABLE orders
  MODIFY COLUMN status ENUM('pending', 'confirmed', 'paid', 'shipped', 'completed', 'cancelled')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '订单状态',
  ADD COLUMN delivery_mode ENUM('meetup', 'shipping')
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'shipping'
    COMMENT '交易方式：meetup-面交，shipping-邮寄' AFTER price,
  ADD COLUMN meetup_place VARCHAR(200)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '面交地点' AFTER delivery_mode,
  ADD COLUMN meetup_time VARCHAR(100)
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
    COMMENT '面交时间' AFTER meetup_place,
  ADD COLUMN confirmed_at DATETIME DEFAULT NULL
    COMMENT '卖家确认时间' AFTER paid_at,
  ADD COLUMN cancelled_at DATETIME DEFAULT NULL
    COMMENT '取消时间' AFTER completed_at;

CREATE TABLE IF NOT EXISTS reviews (
  id INT NOT NULL AUTO_INCREMENT,
  order_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  reviewee_id INT NOT NULL,
  rating TINYINT NOT NULL COMMENT '1-5 星',
  content VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_order_reviewer (order_id, reviewer_id),
  KEY idx_reviewee (reviewee_id, created_at),
  KEY idx_order (order_id),
  CONSTRAINT reviews_order_fk FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewer_fk FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT reviews_reviewee_fk FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
