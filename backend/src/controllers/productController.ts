import { Request, Response } from 'express';
import * as ProductModel from '../models/productModel';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string;
    // 使用 ?? 而不是 || 来处理空字符串的情况
    const status = req.query.status !== undefined ? (req.query.status as string) : 'available';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : undefined;
    
    const products = await ProductModel.getAllProducts(category, status, limit, offset, search, userId);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        limit,
        offset,
        hasMore: products.length === limit
      }
    });
  } catch (error) {
    console.error('获取商品列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品列表失败'
    });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const product = await ProductModel.getProductById(id);
    
    if (!product) {
      res.status(404).json({
        success: false,
        message: '商品不存在'
      });
      return;
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('获取商品详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取商品详情失败'
    });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, price, condition, category, images } = req.body;
    
    // 验证必填字段
    if (!title || !description || !price || !condition || !category) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
      return;
    }
    
    // 从认证中间件获取当前用户ID
    const authenticatedReq = req as any;
    const seller_id = authenticatedReq.user?.userId;
    
    if (!seller_id) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    // 验证价格合法性
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0 || priceValue > 9999999) {
      res.status(400).json({
        success: false,
        message: '价格不合法'
      });
      return;
    }

    const productId = await ProductModel.createProduct({
      title,
      description,
      price: priceValue,
      condition,
      category,
      images: images || [],
      seller_id
    });
    
    res.status(201).json({
      success: true,
      data: { id: productId },
      message: '商品发布成功'
    });
  } catch (error) {
    console.error('创建商品失败:', error);
    res.status(500).json({
      success: false,
      message: '创建商品失败'
    });
  }
};

export const updateProductStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const sellerId = (req as any).user?.userId;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }
    
    if (!['available', 'sold', 'reserved'].includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的状态值'
      });
      return;
    }
    
    const success = await ProductModel.updateProductStatus(id, status, sellerId);
    
    if (!success) {
      res.status(404).json({
        success: false,
        message: '商品不存在或无权操作'
      });
      return;
    }
    
    res.json({
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    console.error('更新商品状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新商品状态失败'
    });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const sellerId = (req as any).user?.userId;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }
    
    const success = await ProductModel.deleteProduct(id, sellerId);
    
    if (!success) {
      res.status(404).json({
        success: false,
        message: '商品不存在或无权操作'
      });
      return;
    }
    
    res.json({
      success: true,
      message: '商品删除成功'
    });
  } catch (error) {
    console.error('删除商品失败:', error);
    res.status(500).json({
      success: false,
      message: '删除商品失败'
    });
  }
};

// 编辑商品
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id);
    const sellerId = (req as any).user?.userId;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }
    
    const success = await ProductModel.updateProduct(id, req.body, sellerId);
    if (!success) {
      res.status(404).json({ success: false, message: '商品不存在或无权操作' });
      return;
    }
    res.json({ success: true, message: '商品已更新' });
  } catch (error) {
    console.error('编辑商品失败:', error);
    res.status(500).json({ success: false, message: '编辑商品失败' });
  }
};
// 获取当前用户发布的商品
export const getMyProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const status = req.query.status as string;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const products = await ProductModel.getUserProducts(userId, status, limit, offset);
    
    res.json({
      success: true,
      data: products,
      pagination: {
        limit,
        offset,
        hasMore: products.length === limit
      }
    });
  } catch (error) {
    console.error('获取我的发布失败:', error);
    res.status(500).json({
      success: false,
      message: '获取我的发布失败'
    });
  }
};
