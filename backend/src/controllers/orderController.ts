import { Request, Response } from 'express';
import * as OrderModel from '../models/orderModel';
import * as ProductModel from '../models/productModel';

/**
 * 创建订单（从聊天订单消息确认后创建）
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_id, seller_id, price, address_id, remark } = req.body;
    const authenticatedReq = req as any;
    const buyerId = authenticatedReq.user?.userId;

    if (!buyerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    // 验证必填字段
    if (!product_id || !price) {
      res.status(400).json({
        success: false,
        message: '缺少必填字段'
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

    // 检查商品是否存在且可售
    const product = await ProductModel.getProductById(product_id);
    if (!product) {
      res.status(404).json({
        success: false,
        message: '商品不存在'
      });
      return;
    }

    if (product.status !== 'available') {
      res.status(400).json({
        success: false,
        message: '商品已售出或不可购买'
      });
      return;
    }

    // 不能购买自己发布的商品
    if (product.seller_id === buyerId) {
      res.status(400).json({
        success: false,
        message: '不能购买自己发布的商品'
      });
      return;
    }

    // 创建订单（卖家以商品实际归属为准，不信任客户端传入的 seller_id）
    const orderId = await OrderModel.createOrder(
      product_id,
      product.seller_id,
      buyerId,
      priceValue,
      address_id,
      remark
    );

    // 更新商品状态为已售出
    await ProductModel.updateProductStatus(product_id, 'sold');

    res.status(201).json({
      success: true,
      data: { order_id: orderId },
      message: '订单创建成功'
    });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({
      success: false,
      message: '创建订单失败'
    });
  }
};

/**
 * 获取订单详情
 */
export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    const order = await OrderModel.getOrderById(orderId);

    if (!order) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }

    // 验证权限：只有买家或卖家可以查看订单
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({
        success: false,
        message: '无权查看此订单'
      });
      return;
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
    });
  }
};

/**
 * 获取我的订单列表
 */
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    // 获取所有订单（买入和卖出）
    const buyerOrders = await OrderModel.getUserOrders(userId, 'buyer');
    const sellerOrders = await OrderModel.getUserOrders(userId, 'seller');

    // 标记订单类型并合并
    const ordersWithType = [
      ...buyerOrders.map(order => ({ ...order, is_buyer: true })),
      ...sellerOrders.map(order => ({ ...order, is_buyer: false }))
    ];

    // 按创建时间排序（最新的在前）
    ordersWithType.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    res.json({
      success: true,
      data: ordersWithType
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单列表失败'
    });
  }
};

/**
 * 更新订单状态
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    // 获取订单验证权限
    const order = await OrderModel.getOrderById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }

    // 只有卖家可以更新订单状态（发货、完成等）
    if (order.seller_id !== userId) {
      res.status(403).json({
        success: false,
        message: '无权修改此订单'
      });
      return;
    }

    // 验证订单状态白名单
    const validStatuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的订单状态'
      });
      return;
    }

    await OrderModel.updateOrderStatus(orderId, status);

    res.json({
      success: true,
      message: '订单状态更新成功'
    });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新订单状态失败'
    });
  }
};

/**
 * 取消订单
 */
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseInt(req.params.id);
    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    // 获取订单验证权限
    const order = await OrderModel.getOrderById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: '订单不存在'
      });
      return;
    }

    // 买家或卖家都可以取消订单
    if (order.buyer_id !== userId && order.seller_id !== userId) {
      res.status(403).json({
        success: false,
        message: '无权取消此订单'
      });
      return;
    }

    // 已完成或已取消的订单不允许再取消
    if (order.status === 'completed' || order.status === 'cancelled') {
      res.status(400).json({
        success: false,
        message: `订单已是${order.status === 'completed' ? '完成' : '取消'}状态，无法取消`
      });
      return;
    }

    await OrderModel.cancelOrder(orderId);

    // 如果订单被取消，恢复商品状态为可售
    if (order.product_id) {
      await ProductModel.updateProductStatus(order.product_id, 'available');
    }

    res.json({
      success: true,
      message: '订单已取消'
    });
  } catch (error) {
    console.error('取消订单失败:', error);
    res.status(500).json({
      success: false,
      message: '取消订单失败'
    });
  }
};

