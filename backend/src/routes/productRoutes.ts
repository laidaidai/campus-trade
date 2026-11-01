import express from 'express';
import * as productController from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';
import { writeLimiter } from '../middleware/rateLimit';

const router = express.Router();

// 获取商品列表 (支持分类筛选) - 公开访问
router.get('/', productController.getProducts);

// 获取我的发布 (需要认证)
router.get('/my/products', authenticateToken, productController.getMyProducts);

// 获取单个商品详情 - 公开访问
router.get('/:id', productController.getProductById);

// 创建商品 (需要认证)
router.post('/', authenticateToken, writeLimiter, productController.createProduct);

// 更新商品状态 (需要认证)
router.patch('/:id/status', authenticateToken, productController.updateProductStatus);

// 编辑商品 (需要认证)
router.put('/:id', authenticateToken, productController.updateProduct);

// 删除商品 (需要认证)
router.delete('/:id', authenticateToken, productController.deleteProduct);

export default router;
