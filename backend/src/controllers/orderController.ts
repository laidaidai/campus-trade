import { Request, Response } from 'express';
import * as OrderModel from '../models/orderModel';
import * as ProductModel from '../models/productModel';
import * as MessageModel from '../models/messageModel';
import * as AddressModel from '../models/addressModel';
import { toPositiveInt } from '../utils/validation';

/**
 * 创建订单（从聊天订单消息确认后创建）
 *
 * 价格不能直接相信客户端：
 * - 必须带上 conversation_id；
 * - 以会话里最新一条 order 消息的 final_price 为准；
 * - 低于商品原价的价格，只接受卖家发出的最新报价；
 * - 商品状态用条件更新原子地扣减，避免并发重复下单。
 */
export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_id, price, address_id, remark, conversation_id } = req.body;
    const authenticatedReq = req as any;
    const callerId = Number(authenticatedReq.user?.userId);

    if (!callerId) {
      res.status(401).json({
        success: false,
        message: '未登录或登录已过期'
      });
      return;
    }

    const productId = Number(product_id);
    const conversationId = Number(conversation_id);
    const priceValue = Number(price);
    let buyerId = callerId;

    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({ success: false, message: '商品参数不合法' });
      return;
    }
    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      res.status(400).json({ success: false, message: '缺少有效的会话信息' });
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue <= 0 || priceValue > 9999999) {
      res.status(400).json({ success: false, message: '价格不合法' });
      return;
    }

    const product = await ProductModel.getProductById(productId);
    if (!product) {
      res.status(404).json({ success: false, message: '商品不存在' });
      return;
    }
    if (product.status !== 'available') {
      res.status(400).json({ success: false, message: '商品已售出或不可购买' });
      return;
    }

    // 会话必须对应当前商品和商品真实卖家；买家或卖家都可以发起最终确认
    const conversation = await MessageModel.getConversationById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, message: '会话不存在' });
      return;
    }
    if (
      Number(conversation.product_id) !== productId ||
      Number(conversation.seller_id) !== Number(product.seller_id)
    ) {
      res.status(400).json({ success: false, message: '会话与订单信息不匹配' });
      return;
    }
    if (
      callerId !== Number(conversation.buyer_id) &&
      callerId !== Number(conversation.seller_id)
    ) {
      res.status(403).json({ success: false, message: '无权操作此会话的订单' });
      return;
    }

    // 卖家代买家确认时，以会话里的真实买家作为订单买家
    buyerId = Number(conversation.buyer_id);
    if (Number(product.seller_id) === buyerId) {
      res.status(400).json({ success: false, message: '不能购买自己发布的商品' });
      return;
    }

    // 服务端以聊天中最新一条订单消息作为报价依据
    const latestOrderMessage = await MessageModel.getLatestOrderMessage(conversationId);
    if (!latestOrderMessage) {
      res.status(400).json({ success: false, message: '请先在聊天中发起订单' });
      return;
    }

    let orderMessageData: any;
    try {
      orderMessageData = typeof latestOrderMessage.content === 'string'
        ? JSON.parse(latestOrderMessage.content)
        : latestOrderMessage.content;
    } catch {
      res.status(400).json({ success: false, message: '订单报价数据异常' });
      return;
    }

    if (Number(orderMessageData?.product_id) !== productId) {
      res.status(400).json({ success: false, message: '订单报价与商品不匹配' });
      return;
    }

    const quotedPrice = Number(orderMessageData?.final_price);
    if (!Number.isFinite(quotedPrice) || quotedPrice !== priceValue) {
      res.status(400).json({ success: false, message: '订单价格与最新报价不一致，请刷新后重试' });
      return;
    }

    // 非原价的优惠价必须由卖家发出，买家不能自己伪造一个低价订单消息
    if (
      priceValue !== Number(product.price) &&
      Number(latestOrderMessage.sender_id) !== Number(product.seller_id)
    ) {
      res.status(400).json({ success: false, message: '该价格未经过卖家确认' });
      return;
    }

    // 收货地址必须存在且属于当前买家，同时保存下单时的地址快照
    if (address_id === undefined || address_id === null || address_id === '') {
      res.status(400).json({ success: false, message: '请选择收货地址' });
      return;
    }
    const addressId = Number(address_id);
    if (!Number.isInteger(addressId) || addressId <= 0) {
      res.status(400).json({ success: false, message: '收货地址参数不合法' });
      return;
    }
    const address = await AddressModel.getAddressById(addressId, Number(buyerId));
    if (!address) {
      res.status(400).json({ success: false, message: '收货地址不存在或不属于当前用户' });
      return;
    }

    const remarkText = remark === undefined || remark === null ? null : String(remark).trim();
    if (remarkText && remarkText.length > 500) {
      res.status(400).json({ success: false, message: '备注不能超过500个字符' });
      return;
    }

    // 原子占货，防止两个请求同时把同一件商品下单
    const reserved = await ProductModel.markProductSold(productId);
    if (!reserved) {
      res.status(409).json({ success: false, message: '商品刚刚已被其他买家下单' });
      return;
    }

    let orderId: number;
    try {
      orderId = await OrderModel.createOrder(
        productId,
        Number(product.seller_id),
        Number(buyerId),
        priceValue,
        addressId,
        remarkText || undefined,
        {
          name: address.name,
          phone: address.phone,
          full: `${address.province} ${address.city} ${address.district} ${address.detail}`.trim()
        }
      );
    } catch (error) {
      // 订单落库失败时释放占货，避免商品被永久锁死
      await ProductModel.updateProductStatus(productId, 'available');
      throw error;
    }

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
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      res.status(400).json({
        success: false,
        message: '无效的订单ID'
      });
      return;
    }
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
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      res.status(400).json({
        success: false,
        message: '无效的订单ID'
      });
      return;
    }
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

    // 验证订单状态白名单和状态机
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'] as const;
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: '无效的订单状态'
      });
      return;
    }

    const transitions: Record<string, string[]> = {
      pending: ['paid', 'cancelled'],
      paid: ['shipped', 'cancelled'],
      shipped: ['completed'],
      completed: [],
      cancelled: []
    };
    if (!transitions[order.status]?.includes(status)) {
      res.status(409).json({
        success: false,
        message: `订单不能从 ${order.status} 直接变更为 ${status}`
      });
      return;
    }

    const updated = await OrderModel.updateOrderStatus(orderId, status);
    if (!updated) {
      res.status(404).json({ success: false, message: '订单不存在' });
      return;
    }

    // 通过状态接口取消订单时，同样按“无其他进行中订单”释放商品
    if (status === 'cancelled') {
      const hasActive = await OrderModel.hasActiveOrdersForProduct(order.product_id, orderId);
      if (!hasActive) {
        await ProductModel.updateProductStatus(order.product_id, 'available');
      }
    }

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
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      res.status(400).json({
        success: false,
        message: '无效的订单ID'
      });
      return;
    }
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

    // 只有待付款/已付款订单可以取消；已发货、已完成、已取消都不能回退
    if (!['pending', 'paid'].includes(order.status)) {
      res.status(400).json({
        success: false,
        message: order.status === 'shipped'
          ? '订单已发货，无法取消'
          : `订单已是${order.status === 'completed' ? '完成' : '取消'}状态，无法取消`
      });
      return;
    }

    const cancelled = await OrderModel.cancelOrder(orderId);
    if (!cancelled) {
      res.status(404).json({ success: false, message: '订单不存在' });
      return;
    }

    // 同一商品没有其他进行中的订单时，才恢复为可售
    const hasActive = await OrderModel.hasActiveOrdersForProduct(order.product_id, orderId);
    if (!hasActive) {
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

