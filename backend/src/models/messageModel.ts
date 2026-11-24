import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// 会话接口
export interface Conversation extends RowDataPacket {
  id: number;
  product_id: number;
  buyer_id: number;
  seller_id: number;
  last_message: string | null;
  last_message_time: Date | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: Date;
  updated_at: Date;
  // 关联数据
  product_title?: string;
  product_image?: string;
  product_price?: number;
  product_status?: string;
  other_user_id?: number;
  other_user_name?: string;
  other_user_avatar?: string;
}

// 消息接口
export interface Message extends RowDataPacket {
  id: number;
  conversation_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  type: 'text' | 'image' | 'order';
  is_read: boolean;
  created_at: Date;
  // 关联数据
  sender_name?: string;
  sender_avatar?: string;
}

// 订单消息数据接口
export interface OrderMessageData {
  product_id: number;
  product_title: string;
  product_image: string;
  original_price: number;
  final_price: number;
  address_id?: number;
  address_detail?: {
    name: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
  };
  order_id?: number;
  status: 'pending' | 'modified' | 'confirmed' | 'rejected';
  remark?: string;
}

/**
 * 获取或创建会话
 */
export const getOrCreateConversation = async (
  productId: number,
  buyerId: number,
  sellerId: number
): Promise<Conversation> => {
  const [rows] = await pool.query<Conversation[]>(
    `SELECT c.*, 
            p.title as product_title,
            p.price as product_price,
            p.images as product_image
     FROM conversations c
     LEFT JOIN products p ON c.product_id = p.id
     WHERE c.product_id = ? AND c.buyer_id = ? AND c.seller_id = ?`,
    [productId, buyerId, sellerId]
  );

  if (rows.length > 0) {
    // 解析 images JSON 并获取第一张图片
    const conversation = rows[0];
    if (conversation.product_image) {
      const images = typeof conversation.product_image === 'string' 
        ? JSON.parse(conversation.product_image) 
        : conversation.product_image;
      conversation.product_image = images && images.length > 0 ? images[0] : null;
    }
    return conversation;
  }

  // 创建新会话
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO conversations (product_id, buyer_id, seller_id) 
     VALUES (?, ?, ?)`,
    [productId, buyerId, sellerId]
  );

  const [newRows] = await pool.query<Conversation[]>(
    `SELECT c.*, 
            p.title as product_title,
            p.price as product_price,
            p.images as product_image
     FROM conversations c
     LEFT JOIN products p ON c.product_id = p.id
     WHERE c.id = ?`,
    [result.insertId]
  );

  // 解析 images JSON 并获取第一张图片,转换为完整URL
  if (newRows.length > 0 && newRows[0].product_image) {
    const images = typeof newRows[0].product_image === 'string' 
      ? JSON.parse(newRows[0].product_image) 
      : newRows[0].product_image;
    const firstImage = images && images.length > 0 ? images[0] : null;
    
    // 如果是相对路径,转换为完整URL
    if (firstImage && !firstImage.startsWith('http')) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      newRows[0].product_image = `${baseUrl}${firstImage}`;
    } else {
      newRows[0].product_image = firstImage;
    }
  }

  return newRows[0];
};

/**
 * 获取用户的所有会话列表
 */
export const getUserConversations = async (userId: number): Promise<Conversation[]> => {
  const [rows] = await pool.query<Conversation[]>(
    `SELECT c.*,
            p.title as product_title,
            p.price as product_price,
            p.images as product_image,
            p.status as product_status,
            CASE 
              WHEN c.buyer_id = ? THEN c.seller_id
              ELSE c.buyer_id
            END as other_user_id,
            CASE 
              WHEN c.buyer_id = ? THEN u_seller.username
              ELSE u_buyer.username
            END as other_user_name,
            CASE 
              WHEN c.buyer_id = ? THEN u_seller.avatar
              ELSE u_buyer.avatar
            END as other_user_avatar
     FROM conversations c
     LEFT JOIN products p ON c.product_id = p.id
     LEFT JOIN users u_buyer ON c.buyer_id = u_buyer.id
     LEFT JOIN users u_seller ON c.seller_id = u_seller.id
     WHERE c.buyer_id = ? OR c.seller_id = ?
     ORDER BY c.updated_at DESC`,
    [userId, userId, userId, userId, userId]
  );

  // 解析每个会话的商品图片和头像
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  const conversations = rows.map(conv => {
    // 处理商品图片
    if (conv.product_image) {
      const images = typeof conv.product_image === 'string' 
        ? JSON.parse(conv.product_image) 
        : conv.product_image;
      const firstImage = images && images.length > 0 ? images[0] : null;
      
      // 如果是相对路径,转换为完整URL
      if (firstImage && !firstImage.startsWith('http')) {
        conv.product_image = `${baseUrl}${firstImage}`;
      } else {
        conv.product_image = firstImage;
      }
    }
    
    // 处理头像URL - 如果avatar是相对路径,转换为完整URL
    if (conv.other_user_avatar && !conv.other_user_avatar.startsWith('http')) {
      conv.other_user_avatar = `${baseUrl}${conv.other_user_avatar}`;
    }
    
    return conv;
  });

  return conversations;
};

/**
 * 发送消息
 */
export const sendMessage = async (
  conversationId: number,
  senderId: number,
  receiverId: number,
  content: string,
  type: 'text' | 'image' | 'order' = 'text'
): Promise<Message> => {
  // 插入消息
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO messages (conversation_id, sender_id, receiver_id, content, type)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, senderId, receiverId, content, type]
  );

  // 更新会话的最后消息和未读数
  const [conversation] = await pool.query<Conversation[]>(
    'SELECT buyer_id, seller_id FROM conversations WHERE id = ?',
    [conversationId]
  );

  if (conversation.length > 0) {
    const isBuyer = conversation[0].buyer_id === senderId;
    const unreadField = isBuyer ? 'seller_unread_count' : 'buyer_unread_count';

    await pool.query(
      `UPDATE conversations 
       SET last_message = ?,
           last_message_time = NOW(),
           ${unreadField} = ${unreadField} + 1,
           updated_at = NOW()
       WHERE id = ?`,
      [content, conversationId]
    );
  }

  // 返回消息详情
  const [rows] = await pool.query<Message[]>(
    `SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
     FROM messages m
     LEFT JOIN users u ON m.sender_id = u.id
     WHERE m.id = ?`,
    [result.insertId]
  );

  // 处理头像URL
  const message = rows[0];
  if (message && message.sender_avatar && !message.sender_avatar.startsWith('http')) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    message.sender_avatar = `${baseUrl}${message.sender_avatar}`;
  }

  return message;
};

/**
 * 获取会话的消息历史
 */
export const getConversationMessages = async (
  conversationId: number,
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> => {
  const [rows] = await pool.query<Message[]>(
    `SELECT m.*, u.username as sender_name, u.avatar as sender_avatar
     FROM messages m
     LEFT JOIN users u ON m.sender_id = u.id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [conversationId, limit, offset]
  );

  // 处理头像URL
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const messages = rows.map(msg => {
    if (msg.sender_avatar && !msg.sender_avatar.startsWith('http')) {
      msg.sender_avatar = `${baseUrl}${msg.sender_avatar}`;
    }
    return msg;
  });

  return messages.reverse(); // 按时间正序返回
};

/**
 * 标记消息为已读
 */
export const markMessagesAsRead = async (
  conversationId: number,
  userId: number
): Promise<void> => {
  await pool.query(
    `UPDATE messages 
     SET is_read = TRUE 
     WHERE conversation_id = ? AND receiver_id = ? AND is_read = FALSE`,
    [conversationId, userId]
  );

  // 重置未读计数
  const [conversation] = await pool.query<Conversation[]>(
    'SELECT buyer_id FROM conversations WHERE id = ?',
    [conversationId]
  );

  if (conversation.length > 0) {
    const isBuyer = conversation[0].buyer_id === userId;
    const unreadField = isBuyer ? 'buyer_unread_count' : 'seller_unread_count';

    await pool.query(
      `UPDATE conversations SET ${unreadField} = 0 WHERE id = ?`,
      [conversationId]
    );
  }
};

/**
 * 获取用户的未读消息总数
 */
export const getUnreadCount = async (userId: number): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 
       SUM(CASE WHEN buyer_id = ? THEN buyer_unread_count ELSE 0 END) +
       SUM(CASE WHEN seller_id = ? THEN seller_unread_count ELSE 0 END) as total_unread
     FROM conversations
     WHERE buyer_id = ? OR seller_id = ?`,
    [userId, userId, userId, userId]
  );

  return rows[0]?.total_unread || 0;
};

/**
 * 根据ID获取会话
 */
export const getConversationById = async (conversationId: number): Promise<Conversation | null> => {
  const [rows] = await pool.query<Conversation[]>(
    `SELECT * FROM conversations WHERE id = ?`,
    [conversationId]
  );

  return rows.length > 0 ? rows[0] : null;
};

/**
 * 获取会话中最新的一条订单消息。
 * 订单金额以服务端保存的这条消息为准，不能直接相信客户端传上来的 price。
 */
export const getLatestOrderMessage = async (
  conversationId: number
): Promise<Message | null> => {
  const [rows] = await pool.query<Message[]>(
    `SELECT *
       FROM messages
      WHERE conversation_id = ? AND type = 'order'
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [conversationId]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * 删除会话及其所有消息
 */
export const deleteConversation = async (conversationId: number): Promise<void> => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 删除所有消息
    await connection.query(
      'DELETE FROM messages WHERE conversation_id = ?',
      [conversationId]
    );

    // 删除会话
    await connection.query(
      'DELETE FROM conversations WHERE id = ?',
      [conversationId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
