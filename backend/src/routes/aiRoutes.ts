import { Router } from 'express';
import * as AiController from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import { aiLimiter, aiDailyLimiter } from '../middleware/rateLimit';

const router = Router();

// 状态查询不需要登录（前端首屏就要判断是否显示入口）
router.get('/status', AiController.getStatus);

// 对话与文案生成需要登录，并单独限流（AI 调用有真金白银的成本）
router.post('/chat', authenticateToken, aiLimiter, aiDailyLimiter, AiController.chat);
router.post('/describe', authenticateToken, aiLimiter, aiDailyLimiter, AiController.generateDescription);

export default router;
