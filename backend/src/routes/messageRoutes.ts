import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';
import * as messageController from '../controllers/messageController';

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 获取或创建会话
router.post('/conversations', writeLimiter, messageController.getOrCreateConversation);

// 获取用户的会话列表
router.get('/conversations', messageController.getUserConversations);

// 获取会话的消息历史
router.get('/conversations/:conversationId/messages', messageController.getConversationMessages);

// 发送消息
router.post('/conversations/:conversationId/messages', writeLimiter, messageController.sendMessage);

// 标记消息为已读
router.put('/conversations/:conversationId/read', messageController.markAsRead);

// 获取未读消息数
router.get('/unread-count', messageController.getUnreadCount);

// 删除会话
router.delete('/conversations/:conversationId', messageController.deleteConversation);

export default router;
