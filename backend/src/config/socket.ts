import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import * as MessageModel from '../models/messageModel';
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
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;
    
    if (!token) return next(new Error('Authentication failed'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      (socket as any).userId = decoded.userId;
      
      next();
    } catch (error: any) { next(new Error('Invalid token')); }
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
        const { conversationId, receiverId, content, type = 'text' } = data;
        
        // 保存消息到数据库
        const message = await MessageModel.sendMessage(
          conversationId,
          userId,
          receiverId,
          content,
          type
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
