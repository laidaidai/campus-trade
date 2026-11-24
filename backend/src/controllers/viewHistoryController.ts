import { Request, Response } from 'express';
import * as ViewHistoryModel from '../models/viewHistoryModel';
import { getProductById } from '../models/productModel';
import { parsePagination, toPositiveInt } from '../utils/validation';

// 添加浏览记录
export const addViewHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const productId = toPositiveInt(req.body.productId);

    if (!productId) {
      res.status(400).json({ error: '无效的商品ID' });
      return;
    }

    // 不存在的商品不能写入浏览历史
    const product = await getProductById(productId);
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    await ViewHistoryModel.addViewHistory(userId, productId);

    res.json({ success: true, message: '浏览记录已添加' });
  } catch (error) {
    console.error('添加浏览记录失败:', error);
    res.status(500).json({ error: '添加浏览记录失败' });
  }
};

// 获取浏览历史
export const getViewHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { limit, offset } = parsePagination(req.query.limit, req.query.offset, 20);
    
    const history = await ViewHistoryModel.getUserViewHistory(userId, limit, offset);
    
    res.json({
      success: true,
      data: history,
      pagination: {
        limit,
        offset,
        hasMore: history.length === limit
      }
    });
  } catch (error) {
    console.error('获取浏览历史失败:', error);
    res.status(500).json({ error: '获取浏览历史失败' });
  }
};

// 清空浏览历史
export const clearViewHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    
    await ViewHistoryModel.clearUserViewHistory(userId);
    
    res.json({ success: true, message: '浏览历史已清空' });
  } catch (error) {
    console.error('清空浏览历史失败:', error);
    res.status(500).json({ error: '清空浏览历史失败' });
  }
};

// 删除单条浏览记录
export const deleteViewHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const historyId = toPositiveInt(req.params.id);
    if (!historyId) {
      res.status(400).json({ error: '无效的浏览记录ID' });
      return;
    }
    
    await ViewHistoryModel.deleteViewHistory(userId, historyId);
    
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('删除浏览记录失败:', error);
    res.status(500).json({ error: '删除失败' });
  }
};
