/**
 * 验证码存储服务 (MySQL 实现)
 *
 * 相比内存实现的好处：
 * - 服务重启后验证码不丢失
 * - 支持多实例 / 多进程部署（PM2 cluster、Docker 多副本）
 * - 统一的过期清理，不依赖进程生命周期
 */
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';

type CodeType = 'register' | 'reset-password';

interface CodeRow extends RowDataPacket {
  code: string;
  created_at: number; // UNIX 毫秒时间戳
  expires_at: number; // UNIX 毫秒时间戳
}

// 验证码有效期 (5分钟)
const CODE_EXPIRY_TIME = 5 * 60 * 1000;

// 发送间隔限制 (60秒)
const SEND_INTERVAL = 60 * 1000;

// 单个验证码最大尝试次数，超过后作废，防止暴力破解
const MAX_ATTEMPTS = 5;

/**
 * 创建验证码表（幂等）
 */
export const ensureVerificationTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL,
      type VARCHAR(32) NOT NULL,
      code VARCHAR(8) NOT NULL,
      attempts INT DEFAULT 0,
      created_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      UNIQUE KEY unique_email_type (email, type),
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

/**
 * 生成6位随机验证码（使用密码学安全随机数）
 */
export const generateCode = (): string => {
  const crypto = require('crypto');
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * 保存验证码
 * @returns false 表示处于发送冷却期，未保存
 */
export const saveCode = async (
  email: string,
  code: string,
  type: CodeType = 'register'
): Promise<boolean> => {
  const now = Date.now();

  const [rows] = await pool.query<CodeRow[]>(
    'SELECT created_at FROM verification_codes WHERE email = ? AND type = ?',
    [normalizeEmail(email), type]
  );

  if (rows.length > 0 && now - Number(rows[0].created_at) < SEND_INTERVAL) {
    return false; // 发送太频繁
  }

  await pool.query(
    `INSERT INTO verification_codes (email, type, code, attempts, created_at, expires_at)
     VALUES (?, ?, ?, 0, ?, ?)
     ON DUPLICATE KEY UPDATE code = VALUES(code), attempts = 0, created_at = VALUES(created_at), expires_at = VALUES(expires_at)`,
    [normalizeEmail(email), type, code, now, now + CODE_EXPIRY_TIME]
  );

  return true;
};

/**
 * 验证验证码
 */
export const verifyCode = async (
  email: string,
  code: string,
  type: CodeType = 'register'
): Promise<boolean> => {
  const key = normalizeEmail(email);

  const [rows] = await pool.query<CodeRow[]>(
    'SELECT code, created_at, expires_at, attempts FROM verification_codes WHERE email = ? AND type = ?',
    [key, type]
  );

  if (rows.length === 0) {
    return false; // 验证码不存在
  }

  const stored = rows[0];

  // 已过期
  if (Date.now() > Number(stored.expires_at)) {
    await pool.query('DELETE FROM verification_codes WHERE email = ? AND type = ?', [key, type]);
    return false;
  }

  // 错误次数过多，作废
  if (Number((stored as any).attempts) >= MAX_ATTEMPTS) {
    await pool.query('DELETE FROM verification_codes WHERE email = ? AND type = ?', [key, type]);
    return false;
  }

  if (String(stored.code) !== String(code).trim()) {
    await pool.query(
      'UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ? AND type = ?',
      [key, type]
    );
    return false;
  }

  // 验证成功后删除验证码(一次性使用)
  await pool.query('DELETE FROM verification_codes WHERE email = ? AND type = ?', [key, type]);
  return true;
};

/**
 * 获取剩余发送冷却时间(秒)
 */
export const getRemainingCooldown = async (
  email: string,
  type: CodeType = 'register'
): Promise<number> => {
  const [rows] = await pool.query<CodeRow[]>(
    'SELECT created_at FROM verification_codes WHERE email = ? AND type = ?',
    [normalizeEmail(email), type]
  );

  if (rows.length === 0) {
    return 0;
  }

  const remaining = SEND_INTERVAL - (Date.now() - Number(rows[0].created_at));
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
};

/**
 * 清理所有过期的验证码
 */
export const cleanExpiredCodes = async (): Promise<void> => {
  try {
    await pool.query('DELETE FROM verification_codes WHERE expires_at < ?', [Date.now()]);
  } catch (error) {
    console.error('清理过期验证码失败:', error);
  }
};

// 定期清理过期验证码 (每分钟)
const cleanupTimer = setInterval(cleanExpiredCodes, 60 * 1000);
// 不阻止进程退出
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();
