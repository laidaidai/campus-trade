import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import * as MessageModel from '../models/messageModel';
import { getProductById } from '../models/productModel';

const MESSAGE_TYPES = ['text', 'image', 'order'] as const;

const parseInteger = (raw: unknown): number | null => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
};

/**
 * 获取或创建会话
 */
export const getOrCreateConversation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const productId = Number(req.body.productId);
    const sellerId = Number(req.body.sellerId);
    const buyerId = Number(req.user?.userId);

    if (!Number.isInteger(buyerId) || buyerId <= 0) {
      return res.status(401).json({ error: '未授权' });
    }

    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(sellerId) || sellerId <= 0) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const product = await getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    // 卖家必须与商品实际归属一致，避免用伪造的 sellerId 建会话
    if (Number(product.seller_id) !== sellerId) {
      return res.status(400).json({ error: '商品卖家信息不匹配' });
    }

    // 自己不能和自己创建买卖会话
    if (buyerId === sellerId) {
      return res.status(400).json({ error: '不能与自己创建会话' });
    }

    const conversation = await MessageModel.getOrCreateConversation(
      productId,
      buyerId,
      sellerId
    );

    res.json({ conversation });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
};

/**
 * 获取用户的会话列表
 */
export const getUserConversations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const conversations = await MessageModel.getUserConversations(userId);
    res.json({ conversations });
  } catch (error) {
    console.error('Error in getUserConversations:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
};

/**
 * 获取会话的消息历史
 */
export const getConversationMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = parseInteger(req.params.conversationId);
    if (!conversationId) {
      return res.status(400).json({ error: '无效的会话ID' });
    }
    const limitRaw = Number(req.query.limit ?? 50);
    const offsetRaw = Number(req.query.offset ?? 0);
    const limit = Number.isInteger(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 50;
    const offset = Number.isInteger(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    // 验证用户是否是会话参与者
    const conversation = await MessageModel.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ error: '无权查看此会话' });
    }

    const messages = await MessageModel.getConversationMessages(
      conversationId,
      limit,
      offset
    );

    res.json({ messages });
  } catch (error) {
    console.error('Error in getConversationMessages:', error);
    res.status(500).json({ error: '获取消息历史失败' });
  }
};
/**
 * 发送消息
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📨 收到发送消息请求:', {
      params: req.params,
      body: req.body,
      userId: req.user?.userId
    });

    const conversationId = parseInteger(req.params.conversationId);
    const senderId = req.user?.userId;
    const { receiver_id } = req.body;
    const receiverId = parseInteger(receiver_id);
    const type = String(req.body.type || 'text');
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';

    if (!senderId) {
      console.error('❌ 未授权: userId 不存在');
      return res.status(401).json({ error: '未授权' });
    }

    if (!conversationId || !receiverId || !content) {
      console.error('❌ 缺少必要参数:', { conversationId, receiver_id, content });
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!MESSAGE_TYPES.includes(type as any)) {
      return res.status(400).json({ error: '不支持的消息类型' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: '消息内容不能超过5000个字符' });
    }

    // 验证用户是否是会话参与者
    const conversation = await MessageModel.getConversationById(conversationId);
    console.log('📋 会话信息:', conversation);
    
    if (!conversation) {
      console.error('❌ 会话不存在:', conversationId);
      return res.status(404).json({ error: '会话不存在' });
    }

    const buyerId = Number(conversation.buyer_id);
    const sellerId = Number(conversation.seller_id);
    if (buyerId === sellerId) {
      return res.status(400).json({ error: '该会话无效，请从商品页重新发起会话' });
    }

    if (Number(senderId) !== buyerId && Number(senderId) !== sellerId) {
      console.error('❌ 无权发送消息:', { 
        senderId, 
        buyer_id: conversation.buyer_id, 
        seller_id: conversation.seller_id 
      });
      return res.status(403).json({ error: '无权在此会话中发送消息' });
    }

    const expectedReceiverId = Number(senderId) === buyerId ? sellerId : buyerId;
    if (receiverId !== expectedReceiverId) {
      return res.status(400).json({ error: '消息接收人不正确' });
    }

    if (type === 'order') {
      let orderData: any;
      try {
        orderData = JSON.parse(content);
      } catch {
        return res.status(400).json({ error: '订单数据格式不正确' });
      }
      if (
        !orderData ||
        Number(orderData.product_id) !== Number(conversation.product_id) ||
        !Number.isFinite(Number(orderData.final_price)) ||
        Number(orderData.final_price) <= 0
      ) {
        return res.status(400).json({ error: '订单数据与当前商品不匹配' });
      }
    }

    console.log('✅ 开始发送消息:', { conversationId, senderId, receiver_id: receiverId, type });

    const message = await MessageModel.sendMessage(
      conversationId,
      senderId,
      receiverId,
      content,
      type as 'text' | 'image' | 'order'
    );

    console.log('✅ 消息发送成功:', message);

    res.json({ 
      success: true,
      message,
      conversationId,
      sender_id: senderId
    });
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    console.error('错误堆栈:', (error as Error).stack);
    res.status(500).json({ 
      error: '发送消息失败',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

/**
 * 标记消息为已读
 */
export const markAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = parseInteger(req.params.conversationId);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }
    if (!conversationId) {
      return res.status(400).json({ error: '无效的会话ID' });
    }

    // 验证用户是否是会话参与者
    const conversation = await MessageModel.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ error: '无权操作此会话' });
    }

    await MessageModel.markMessagesAsRead(conversationId, userId);
    res.json({ message: '已标记为已读' });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ error: '标记已读失败' });
  }
};

/**
 * 获取未读消息数
 */
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    const count = await MessageModel.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({ error: '获取未读数失败' });
  }
};

/**
 * 删除会话
 */
export const deleteConversation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const conversationId = parseInteger(req.params.conversationId);
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '未授权' });
    }

    if (!conversationId) {
      return res.status(400).json({ error: '无效的会话ID' });
    }

    // 验证用户是否是会话参与者
    const conversation = await MessageModel.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }

    if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
      return res.status(403).json({ error: '无权删除此会话' });
    }

    // 删除会话
    await MessageModel.deleteConversation(conversationId);
    
    res.json({ message: '会话已删除' });
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
};
