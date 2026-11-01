import express from 'express';
import * as OrderController from '../controllers/orderController';
import { authenticateToken } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = express.Router();

// 所有订单路由都需要认证
router.use(authenticateToken);

// 创建订单
router.post('/', writeLimiter, OrderController.createOrder);

// 获取我的订单列表（买家或卖家）
router.get('/my', OrderController.getMyOrders);

// 获取订单详情
router.get('/:id', OrderController.getOrderById);

// 更新订单状态
router.patch('/:id/status', OrderController.updateOrderStatus);

// 取消订单
router.patch('/:id/cancel', OrderController.cancelOrder);

export default router;

