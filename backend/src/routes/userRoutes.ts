import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 公开路由
router.post('/register', UserController.register);
router.post('/login', UserController.login);

// 需要认证的路由（必须放在动态路由之前）
router.get('/profile', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, UserController.updateProfile);
router.put('/profile/password', authenticateToken, UserController.changePassword);

// 动态路由（必须放在最后，避免拦截其他路由）
router.get('/:id', UserController.getUserById); // 获取用户信息（公开）

export default router;