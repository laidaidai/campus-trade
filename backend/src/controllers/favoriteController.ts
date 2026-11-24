import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as FavoriteModel from '../models/favoriteModel';
import { getProductById } from '../models/productModel';
import { toPositiveInt } from '../utils/validation';

// 添加收藏
export const addFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = toPositiveInt(req.body.productId);

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    if (!productId) {
      res.status(400).json({ error: '无效的商品ID' });
      return;
    }

    const product = await getProductById(productId);
    if (!product) {
      res.status(404).json({ error: '商品不存在' });
      return;
    }

    // 检查是否已收藏
    const alreadyFavorited = await FavoriteModel.isFavorited(userId, productId);
    if (alreadyFavorited) {
      res.status(400).json({ error: '已经收藏过该商品' });
      return;
    }

    try {
      const favoriteId = await FavoriteModel.addFavorite(userId, productId);
      res.status(201).json({
        success: true,
        message: '收藏成功',
        favoriteId
      });
    } catch (error: any) {
      // 并发重复收藏由唯一键兜底，不让它冒成 500
      if (error?.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ error: '已经收藏过该商品' });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('添加收藏失败:', error);
    res.status(500).json({ error: '添加收藏失败' });
  }
};

// 取消收藏
export const removeFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = toPositiveInt(req.params.productId);
    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    if (!productId) {
      res.status(400).json({ error: '无效的商品ID' });
      return;
    }
    const success = await FavoriteModel.removeFavorite(userId, productId);
    
    if (success) {
      res.json({ 
        success: true,
        message: '取消收藏成功' 
      });
    } else {
      res.status(404).json({ error: '未找到该收藏记录' });
    }
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ error: '取消收藏失败' });
  }
};

// 检查是否已收藏
export const checkFavorite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const productId = toPositiveInt(req.params.productId);

    if (!userId) {
      res.json({ isFavorited: false });
      return;
    }
    if (!productId) {
      res.status(400).json({ error: '无效的商品ID' });
      return;
    }

    const isFavorited = await FavoriteModel.isFavorited(userId, productId);
    res.json({ isFavorited });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.status(500).json({ error: '检查收藏状态失败' });
  }
};

// 获取用户的收藏列表
export const getUserFavorites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: '请先登录' });
      return;
    }

    const favorites = await FavoriteModel.getUserFavorites(userId);
    res.json({ 
      success: true,
      data: favorites 
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
};

// 获取商品的收藏数
export const getFavoriteCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = toPositiveInt(req.params.productId);
    if (!productId) {
      res.status(400).json({ error: '无效的商品ID' });
      return;
    }
    const count = await FavoriteModel.getFavoriteCount(productId);
    res.json({ count });
  } catch (error) {
    console.error('获取收藏数失败:', error);
    res.status(500).json({ error: '获取收藏数失败' });
  }
};
