import express from 'express';
import { uploadSingle, uploadMultiple } from '../middleware/upload';
import * as uploadController from '../controllers/uploadController';
import { authenticateToken } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimit';

const router = express.Router();

// 所有上传接口均需要认证
router.post('/single', authenticateToken, uploadLimiter, uploadSingle, uploadController.uploadSingleImage);

// 多张图片上传 (最多9张)
router.post('/multiple', authenticateToken, uploadLimiter, uploadMultiple, uploadController.uploadMultipleImages);

// 删除图片
router.delete('/delete', authenticateToken, uploadController.deleteImage);

export default router;
