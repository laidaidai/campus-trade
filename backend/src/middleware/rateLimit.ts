import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * 统一限流配置
 *
 * 说明：默认使用内存存储，适用于单实例部署。
 * 多实例部署时建议接入 rate-limit-redis。
 */

// 生产环境可通过环境变量关闭（例如已有网关层限流）
const DISABLED = process.env.RATE_LIMIT_DISABLED === 'true';

const createLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  /** 自定义计数维度，默认按 IP */
  keyGenerator?: (req: Request) => string;
}) =>
  rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true, // 返回 RateLimit-* 响应头
    legacyHeaders: false, // 关闭 X-RateLimit-* 响应头
    skip: () => DISABLED,
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    // 统一的中文错误响应格式
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: options.message,
        message: options.message,
      });
    },
  });

/**
 * 登录 / 注册：防止暴力破解与批量注册
 * 每个 IP 每 15 分钟最多 20 次
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: '操作过于频繁，请 15 分钟后再试',
});

/**
 * 发送验证码：按 IP 限制，防止邮件轰炸
 * 每个 IP 每小时最多 10 次
 */
export const sendCodeLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: '验证码发送过于频繁，请稍后再试',
});

/**
 * 文件上传：防止刷磁盘
 * 每个 IP 每 10 分钟最多 100 次
 */
export const uploadLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: '上传过于频繁，请稍后再试',
});

/**
 * 写操作（发布商品、下单、发消息）：防止刷接口
 * 每个 IP 每分钟最多 60 次
 */
export const writeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: '操作过于频繁，请稍后再试',
});

/**
 * 全局兜底限流：防止接口被恶意爬取
 * 每个 IP 每分钟最多 300 次
 */
export const globalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: '请求过于频繁，请稍后再试',
});

/**
 * AI 助手：按「用户」而不是 IP 计数，因为 AI 调用有真实 token 成本
 *   - 每分钟 10 次：防连点、防脚本
 *   - 每天 300 次：防刷爆账单
 * 注意：aiLimiter 必须挂在 authenticateToken 之后，才能拿到 req.user
 */
const aiKey = (req: Request): string => {
  const userId = (req as Request & { user?: { userId: number } }).user?.userId;
  return userId ? `ai:u:${userId}` : `ai:ip:${getClientIp(req)}`;
};

export const aiLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'AI 助手调用过于频繁，请稍等片刻再问',
  keyGenerator: aiKey,
});

export const aiDailyLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 300,
  message: '今天的 AI 助手使用次数已达上限，明天再来吧',
  keyGenerator: aiKey,
});

/**
 * 调试用：从请求中提取 IP（考虑反向代理）
 */
export const getClientIp = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
  req.socket.remoteAddress ||
  'unknown';
