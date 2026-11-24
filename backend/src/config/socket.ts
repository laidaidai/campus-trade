import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import * as MessageModel from '../models/messageModel';
import { UserModel } from '../models/userModel';
import pool from './database';

// 验证JWT密钥环境变量
if (!process.env.JWT_SECRET) {
  throw new Error('缺少必需的环境变量: JWT_SECRET\n请在 .env 文件中配置 JWT_SECRET');
}

const JWT_SECRET = process.env.JWT_SECRET;

// 存储用户ID和socket的映射
const userSockets = new Map<number, Socket>();

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? true // 生产环境允许所有来源（通过nginx代理）
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            process.env.FRONTEND_URL || ''
          ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true
    },
    // 添加路径配置，确保与nginx代理路径一致
    path: '/socket.io/',
    // 增加连接超时时间
    pingTimeout: 60000,
    pingInterval: 25000
  });

  console.log('Socket.IO server initialized');

  // 认证中间件
  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error('Authentication failed'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await UserModel.findById(Number(decoded.userId));
      if (!user) {
        return next(new Error('User no longer exists'));
      }
      (socket as any).userId = Number(decoded.userId);

      next();
    } catch (error: any) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;

    // 保存用户socket映射
    userSockets.set(userId, socket);

    // 用户加入自己的房间
    socket.join(`user:${userId}`);

    // 监听发送消息事件
    socket.on('send_message', async (data: any) => {
      try {
        if (!data || typeof data !== 'object') {
          socket.emit('message_error', { error: '消息参数不合法' });
          return;
        }

        const conversationId = Number(data.conversationId);
        const receiverId = Number(data.receiverId);
        const type = String(data.type || 'text');
        const content = typeof data.content === 'string' ? data.content.trim() : '';

        if (!Number.isInteger(conversationId) || conversationId <= 0) {
          socket.emit('message_error', { error: '无效的会话ID' });
          return;
        }
        if (!['text', 'image', 'order'].includes(type)) {
          socket.emit('message_error', { error: '不支持的消息类型' });
          return;
        }
        if (!content || content.length > 5000) {
          socket.emit('message_error', { error: '消息内容不能为空且不能超过5000个字符' });
          return;
        }

        // 验证发送者是否是会话参与者
        const conversation = await MessageModel.getConversationById(conversationId);
        if (!conversation) {
          socket.emit('message_error', { error: '会话不存在' });
          return;
        }
        const buyerId = Number(conversation.buyer_id);
        const sellerId = Number(conversation.seller_id);
        if (buyerId === sellerId) {
          socket.emit('message_error', { error: '该会话无效' });
          return;
        }
        if (Number(userId) !== buyerId && Number(userId) !== sellerId) {
          socket.emit('message_error', { error: '无权在此会话中发送消息' });
          return;
        }

        // 接收人只能是对端，不能由客户端任意指定
        const expectedReceiverId = Number(userId) === buyerId ? sellerId : buyerId;
        if (!Number.isInteger(receiverId) || receiverId !== expectedReceiverId) {
          socket.emit('message_error', { error: '消息接收人不正确' });
          return;
        }

        // 订单消息必须是合法 JSON，且商品与当前会话一致
        if (type === 'order') {
          let orderData: any;
          try {
            orderData = JSON.parse(content);
          } catch {
            socket.emit('message_error', { error: '订单数据格式不正确' });
            return;
          }
          if (
            !orderData ||
            Number(orderData.product_id) !== Number(conversation.product_id) ||
            !Number.isFinite(Number(orderData.final_price)) ||
            Number(orderData.final_price) <= 0
          ) {
            socket.emit('message_error', { error: '订单数据与当前商品不匹配' });
            return;
          }
        }

        // 保存消息到数据库
        const message = await MessageModel.sendMessage(
          conversationId,
          Number(userId),
          receiverId,
          content,
          type as 'text' | 'image' | 'order'
        );

        // 发送给接收者
        const receiverSocket = userSockets.get(receiverId);
        if (receiverSocket) {
          receiverSocket.emit('new_message', {
            conversationId,
            message
          });
        }

        // 确认发送成功
        socket.emit('message_sent', {
          conversationId,
          message
        });

        // 发送未读数更新
        if (receiverSocket) {
          const unreadCount = await MessageModel.getUnreadCount(receiverId);
          receiverSocket.emit('unread_count_updated', { count: unreadCount });
        }

        
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // 监听标记已读事件
    socket.on('mark_as_read', async (data: any) => {
      try {
        const { conversationId } = data;

        // 验证用户是否是会话参与者
        const conversation = await MessageModel.getConversationById(conversationId);
        if (!conversation || (conversation.buyer_id !== userId && conversation.seller_id !== userId)) {
          return;
        }

        await MessageModel.markMessagesAsRead(conversationId, userId);
        
        // 更新未读数
        const unreadCount = await MessageModel.getUnreadCount(userId);
        socket.emit('unread_count_updated', { count: unreadCount });

        // 获取会话信息，通知发送者消息已被读取
        interface ConvRow extends RowDataPacket {
          buyer_id: number;
          seller_id: number;
        }
        const [conversations] = await pool.query<ConvRow[]>(
          'SELECT buyer_id, seller_id FROM conversations WHERE id = ?',
          [conversationId]
        );

        if (conversations.length > 0) {
          const conv = conversations[0];
          const senderId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
          const senderSocket = userSockets.get(senderId);
          
        if (senderSocket) { senderSocket.emit('messages_read', { conversationId }); }
        }

        console.log(`User ${userId} marked conversation ${conversationId} as read`);
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    });

    // 监听正在输入事件
    socket.on('typing', (data: any) => {
      const { conversationId, receiverId } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('user_typing', {
          conversationId,
          userId
        });
      }
    });

    // 监听停止输入事件
    socket.on('stop_typing', (data: any) => {
      const { conversationId, receiverId } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('user_stop_typing', {
          conversationId,
          userId
        });
      }
    });

    // 断开连接
    socket.on('disconnect', () => {
      userSockets.delete(userId);
      socket.leave(`user:${userId}`);
    });
  });

  console.log('Socket.IO initialized');
  return io;
};
