import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { UserController, isEmailVerificationRequired } from '../controllers/userController';
import { authLimiter, sendCodeLimiter } from '../middleware/rateLimit';

const router = Router();

// 前端配置查询：当前部署是否需要邮箱验证
router.get('/config', (_req, res) => {
  res.json({ requireEmailVerification: isEmailVerificationRequired() });
});

// 发送验证码
router.post('/send-code', sendCodeLimiter, AuthController.sendVerificationCode);

// 验证验证码 (可选)
router.post('/verify-code', authLimiter, AuthController.verifyVerificationCode);

// 重置密码
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// 用户注册
router.post('/register', authLimiter, UserController.register);

export default router;
