import { Request, Response } from 'express';
import * as ProductModel from '../models/productModel';
import { parsePagination, toPositiveInt, trimmedString } from '../utils/validation';

const CONDITIONS = ['new', 'like-new', 'good', 'fair', 'poor'];
const STATUSES = ['available', 'sold', 'reserved'];

interface ProductInputResult {
  error?: string;
  data?: {
    title?: string;
    description?: string;
    price?: number;
    condition?: string;
    category?: string;
    images?: string[];
    status?: 'available' | 'sold' | 'reserved';
  };
}

const validateProductInput = (body: any, partial = false): ProductInputResult => {
  const data: ProductInputResult['data'] = {};

  if (!partial || body.title !== undefined) {
    const title = trimmedString(body.title);
    if (!title || title.length > 100) return { error: '标题不能为空且不能超过100个字符' };
    data!.title = title;
  }

  if (!partial || body.description !== undefined) {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description || description.length > 5000) {
      return { error: '描述不能为空且不能超过5000个字符' };
    }
    data!.description = description;
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0 || price > 9999999) {
      return { error: '价格不合法' };
    }
    data!.price = Math.round(price * 100) / 100;
  }

  if (!partial || body.condition !== undefined) {
    const condition = trimmedString(body.condition);
    if (!CONDITIONS.includes(condition)) return { error: '无效的商品成色' };
    data!.condition = condition;
  }

  if (!partial || body.category !== undefined) {
    const category = trimmedString(body.category);
    if (!category || category.length > 50) return { error: '商品分类不合法' };
    data!.category = category;
  }

  if (!partial || body.images !== undefined) {
    if (!Array.isArray(body.images) || body.images.length === 0 || body.images.length > 9) {
      return { error: '商品图片需为1-9张' };
    }
    const images = body.images.map((item: unknown) => trimmedString(item));
    if (images.some((url: string) => !url || url.length > 500)) {
      return { error: '商品图片地址不合法' };
    }
    data!.images = images;
  }

  if (body.status !== undefined) {
    const status = trimmedString(body.status);
    if (!STATUSES.includes(status)) return { error: '无效的商品状态' };
    data!.status = status as 'available' | 'sold' | 'reserved';
  }

  if (partial && Object.keys(data!).length === 0) {
    return { error: '没有需要更新的内容' };
  }

  return { data };
};

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = req.query.category as string;
    const status = req.query.status !== undefined ? String(req.query.status) : 'available';
    const { limit, offset } = parsePagination(req.query.limit, req.query.offset, 20);
    const search = req.query.search as string;
    const userId = req.query.user_id ? toPositiveInt(req.query.user_id) : null;
    if (req.query.user_id && !userId) {
      res.status(400).json({ success: false, message: '无效的用户ID' });
      return;
    }
    if (!['available', 'sold', 'reserved', 'all'].includes(status)) {
      res.status(400).json({ success: false, message: '无效的商品状态' });
      return;
    }
    if (typeof search === 'string' && search.length > 100) {
      res.status(400).json({ success: false, message: '搜索词过长' });
      return;
    }

    const products = await ProductModel.getAllProducts(
      category,
      status,
      limit,
      offset,
      search,
      userId ?? undefined
    );
    
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
    const id = toPositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: '无效的商品ID' });
      return;
    }
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
    const validation = validateProductInput(req.body, false);
    if (validation.error) {
      res.status(400).json({ success: false, message: validation.error });
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

    const productId = await ProductModel.createProduct({
      title: validation.data!.title!,
      description: validation.data!.description!,
      price: validation.data!.price!,
      condition: validation.data!.condition!,
      category: validation.data!.category!,
      images: validation.data!.images!,
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
    const id = toPositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: '无效的商品ID' });
      return;
    }
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
    const id = toPositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: '无效的商品ID' });
      return;
    }
    const sellerId = (req as any).user?.userId;
    
    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }
    
    // 有订单的商品不能物理删除，否则 orders.product_id 的级联删除会抹掉订单历史
    if (await ProductModel.hasOrdersForProduct(id)) {
      res.status(409).json({
        success: false,
        message: '该商品已产生订单，不能删除。可将其标记为下架或已售。'
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
    const id = toPositiveInt(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: '无效的商品ID' });
      return;
    }
    const sellerId = (req as any).user?.userId;

    if (!sellerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    const validation = validateProductInput(req.body, true);
    if (validation.error) {
      res.status(400).json({ success: false, message: validation.error });
      return;
    }

    const success = await ProductModel.updateProduct(id, validation.data!, sellerId);
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
    const { limit, offset } = parsePagination(req.query.limit, req.query.offset, 20);
    
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
