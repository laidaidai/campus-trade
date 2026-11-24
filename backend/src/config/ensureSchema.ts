import pool from './database';
import { RowDataPacket } from 'mysql2';

/**
 * 幂等补齐运行所需的结构与历史数据。
 *
 * 项目没有独立的 migration 目录，这里集中处理少量必要的结构升级，
 * 避免新代码在旧数据库上直接报 Unknown column。
 */
const addColumnIfMissing = async (
  table: string,
  column: string,
  definition: string
): Promise<void> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );

  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    console.log(`✅ ${table}.${column} 已补齐`);
  }
};

export const ensureSchema = async (): Promise<void> => {
  // 订单收货信息快照：地址被删除后，历史订单仍能展示当时的收货信息
  await addColumnIfMissing('orders', 'address_name', 'address_name VARCHAR(50) NULL');
  await addColumnIfMissing('orders', 'address_phone', 'address_phone VARCHAR(20) NULL');
  await addColumnIfMissing('orders', 'address_full', 'address_full VARCHAR(300) NULL');

  // 上传文件归属表：删除图片时必须能确认“是谁上传的”
  await pool.query(`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INT PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      upload_type VARCHAR(20) NOT NULL DEFAULT 'products',
      user_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_filename_type (filename, upload_type),
      KEY idx_user (user_id),
      CONSTRAINT fk_uploaded_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 历史默认头像是外部 ui-avatars 链接，统一置空，交给前端本地头像生成器
  const [result] = await pool.query(
    `UPDATE users
        SET avatar = NULL
      WHERE avatar LIKE 'https://ui-avatars.com/%'`
  );
  const changed = (result as any).affectedRows || 0;
  if (changed > 0) {
    console.log(`✅ 已清理 ${changed} 个旧版外部默认头像`);
  }
};
