import { Request, Response } from 'express';
import * as OrderModel from '../models/orderModel';
import * as ProductModel from '../models/productModel';
import * as MessageModel from '../models/messageModel';
import * as AddressModel from '../models/addressModel';
import * as ReviewModel from '../models/reviewModel';
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
    const {
      product_id,
      price,
      address_id,
      remark,
      conversation_id,
      delivery_mode,
      meetup_place,
      meetup_time
    } = req.body;
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

    const deliveryMode = delivery_mode === undefined ? 'shipping' : String(delivery_mode);
    if (deliveryMode !== 'meetup' && deliveryMode !== 'shipping') {
      res.status(400).json({ success: false, message: '交易方式不合法' });
      return;
    }

    const remarkText = remark === undefined || remark === null ? null : String(remark).trim();
    if (remarkText && remarkText.length > 500) {
      res.status(400).json({ success: false, message: '备注不能超过500个字符' });
      return;
    }

    let addressId: number | null = null;
    let addressSnapshot: OrderModel.AddressSnapshot | undefined;
    let meetupPlace: string | null = null;
    let meetupTime: string | null = null;

    if (deliveryMode === 'meetup') {
      meetupPlace = meetup_place === undefined || meetup_place === null ? '' : String(meetup_place).trim();
      if (!meetupPlace) {
        res.status(400).json({ success: false, message: '请填写面交地点' });
        return;
      }
      if (meetupPlace.length > 200) {
        res.status(400).json({ success: false, message: '面交地点不能超过200个字符' });
        return;
      }

      meetupTime = meetup_time === undefined || meetup_time === null ? null : String(meetup_time).trim();
      if (meetupTime && meetupTime.length > 100) {
        res.status(400).json({ success: false, message: '面交时间不能超过100个字符' });
        return;
      }
      if (!meetupTime) meetupTime = null;
    } else {
      // 邮寄必须有收货地址，且属于当前买家；同时保存下单时的地址快照
      if (address_id === undefined || address_id === null || address_id === '') {
        res.status(400).json({ success: false, message: '请选择收货地址' });
        return;
      }
      const parsedAddressId = Number(address_id);
      if (!Number.isInteger(parsedAddressId) || parsedAddressId <= 0) {
        res.status(400).json({ success: false, message: '收货地址参数不合法' });
        return;
      }
      const address = await AddressModel.getAddressById(parsedAddressId, Number(buyerId));
      if (!address) {
        res.status(400).json({ success: false, message: '收货地址不存在或不属于当前用户' });
        return;
      }
      addressId = parsedAddressId;
      addressSnapshot = {
        name: address.name,
        phone: address.phone,
        full: `${address.province} ${address.city} ${address.district} ${address.detail}`.trim()
      };
    }

    // 原子占货，防止两个请求同时把同一件商品下单
    const reserved = await ProductModel.reserveProduct(productId);
    if (!reserved) {
      res.status(409).json({ success: false, message: '商品刚刚已被其他买家下单' });
      return;
    }

    // 卖家在聊天中确认交易时创建订单，此时订单直接进入待面交/待发货
    const initialStatus = callerId === Number(product.seller_id) ? 'confirmed' : 'pending';

    let orderId: number;
    try {
      orderId = await OrderModel.createOrder({
        productId,
        sellerId: Number(product.seller_id),
        buyerId: Number(buyerId),
        price: priceValue,
        deliveryMode,
        status: initialStatus,
        addressId,
        remark: remarkText || undefined,
        addressSnapshot,
        meetupPlace,
        meetupTime
      });
    } catch (error) {
      // 订单落库失败时释放占货，避免商品被永久锁死
      await ProductModel.releaseProductReservation(productId);
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

    order.reviews = await ReviewModel.getOrderReviews(orderId);

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
 *
 * pending -> confirmed（卖家确认） -> completed（买家确认面交/收货）
 * pending -> confirmed（卖家确认） -> shipped（邮寄发货） -> completed（买家确认收货）
 */
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      res.status(400).json({ success: false, message: '无效的订单ID' });
      return;
    }

    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未登录或登录已过期' });
      return;
    }

    const order = await OrderModel.getOrderById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: '订单不存在' });
      return;
    }

    const isBuyer = Number(order.buyer_id) === Number(userId);
    const isSeller = Number(order.seller_id) === Number(userId);
    if (!isBuyer && !isSeller) {
      res.status(403).json({ success: false, message: '无权修改此订单' });
      return;
    }

    const requestedStatus = String(req.body?.status || '');
    if (!['confirmed', 'shipped', 'completed', 'cancelled'].includes(requestedStatus)) {
      res.status(400).json({ success: false, message: '无效的订单状态' });
      return;
    }

    if (requestedStatus === 'confirmed') {
      if (!isSeller) {
        res.status(403).json({ success: false, message: '只有卖家可以确认订单' });
        return;
      }
      if (order.status !== 'pending') {
        res.status(409).json({ success: false, message: '当前订单状态不能确认' });
        return;
      }
    }

    if (requestedStatus === 'shipped') {
      if (!isSeller) {
        res.status(403).json({ success: false, message: '只有卖家可以发货' });
        return;
      }
      if (order.delivery_mode !== 'shipping' || order.status !== 'confirmed') {
        res.status(409).json({ success: false, message: '只有已确认的邮寄订单可以发货' });
        return;
      }
    }

    if (requestedStatus === 'completed') {
      if (!isBuyer) {
        res.status(403).json({ success: false, message: '请由买家确认交易完成' });
        return;
      }
      const canComplete =
        order.delivery_mode === 'meetup'
          ? order.status === 'confirmed'
          : order.status === 'shipped';
      if (!canComplete) {
        res.status(409).json({
          success: false,
          message: order.delivery_mode === 'meetup'
            ? '面交订单需在卖家确认后完成'
            : '邮寄订单需在卖家发货后确认收货'
        });
        return;
      }
    }

    if (requestedStatus === 'cancelled') {
      if (!['pending', 'confirmed'].includes(order.status)) {
        res.status(400).json({
          success: false,
          message: order.status === 'shipped' ? '订单已发货，无法取消' : '当前订单无法取消'
        });
        return;
      }
    }

    const updated = await OrderModel.updateOrderStatus(
      orderId,
      requestedStatus as OrderModel.OrderStatus
    );
    if (!updated) {
      res.status(404).json({ success: false, message: '订单不存在' });
      return;
    }

    if (requestedStatus === 'completed') {
      await ProductModel.finalizeProductSold(order.product_id);
    }

    if (requestedStatus === 'cancelled') {
      const hasActive = await OrderModel.hasActiveOrdersForProduct(order.product_id, orderId);
      if (!hasActive) {
        await ProductModel.releaseProductReservation(order.product_id);
      }
    }

    res.json({ success: true, message: '订单状态更新成功' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ success: false, message: '更新订单状态失败' });
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

    // 只有待确认/已确认订单可以取消；已发货、已完成、已取消都不能回退
    if (!['pending', 'confirmed'].includes(order.status)) {
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
      await ProductModel.releaseProductReservation(order.product_id);
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

/**
 * 完成后互评：买卖双方各可评价对方一次。
 */
export const createReview = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = toPositiveInt(req.params.id);
    if (!orderId) {
      res.status(400).json({ success: false, message: '无效的订单ID' });
      return;
    }

    const authenticatedReq = req as any;
    const userId = authenticatedReq.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: '未登录或登录已过期' });
      return;
    }

    const order = await OrderModel.getOrderById(orderId);
    if (!order) {
      res.status(404).json({ success: false, message: '订单不存在' });
      return;
    }

    const isBuyer = Number(order.buyer_id) === Number(userId);
    const isSeller = Number(order.seller_id) === Number(userId);
    if (!isBuyer && !isSeller) {
      res.status(403).json({ success: false, message: '无权评价此订单' });
      return;
    }
    if (order.status !== 'completed') {
      res.status(400).json({ success: false, message: '交易完成后才能评价' });
      return;
    }

    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ success: false, message: '评分需为 1-5 星' });
      return;
    }

    const content = req.body?.content === undefined || req.body?.content === null
      ? null
      : String(req.body.content).trim();
    if (content && content.length > 500) {
      res.status(400).json({ success: false, message: '评价不能超过500个字符' });
      return;
    }

    const revieweeId = isBuyer ? Number(order.seller_id) : Number(order.buyer_id);

    try {
      const reviewId = await ReviewModel.createReview(
        orderId,
        Number(userId),
        revieweeId,
        rating,
        content || undefined
      );
      res.status(201).json({
        success: true,
        data: { review_id: reviewId },
        message: '评价已提交'
      });
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        res.status(409).json({ success: false, message: '你已经评价过这笔订单' });
        return;
      }
      throw error;
    }
  } catch (error) {
    console.error('提交评价失败:', error);
    res.status(500).json({ success: false, message: '提交评价失败' });
  }
};

