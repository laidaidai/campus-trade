import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  category: string;
  images: string[];
  seller_id: number;
  status: 'available' | 'sold' | 'reserved';
  created_at: Date;
  updated_at: Date;
  // 关联信息
  seller_name?: string;
  seller_avatar?: string;
}

export interface ProductWithSeller extends Product {
  seller_name: string;
  seller_avatar: string;
}

export const getAllProducts = async (
  category?: string,
  status: string = 'available',
  limit: number = 20,
  offset: number = 0,
  search?: string,
  sellerId?: number
): Promise<ProductWithSeller[]> => {
  let query = `
    SELECT 
      p.*,
      u.username as seller_name,
      u.avatar as seller_avatar,
      COALESCE(COUNT(DISTINCT f.id), 0) as favorite_count,
      ${search ? `
      CASE 
        WHEN p.title LIKE ? THEN 3
        WHEN p.title LIKE ? THEN 2
        WHEN p.description LIKE ? THEN 1
        ELSE 0
      END as relevance
      ` : '0 as relevance'}
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN favorites f ON p.id = f.product_id
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  // 添加搜索相关度参数
  if (search) {
    const exactMatch = search;
    const startMatch = `${search}%`;
    const containsMatch = `%${search}%`;
    params.push(exactMatch, startMatch, containsMatch);
  }
  
  // 状态过滤（如果status为空或'all'，则不过滤状态）
  if (status && status !== 'all' && status !== '') {
    query += ' AND p.status = ?';
    params.push(status);
  }
  
  // 模糊搜索条件
  if (search) {
    query += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (category && category !== 'all') {
    query += ' AND p.category = ?';
    params.push(category);
  }
  
  // 按卖家ID过滤
  if (sellerId) {
    query += ' AND p.seller_id = ?';
    params.push(sellerId);
  }
  
  // 添加 GROUP BY 子句
  query += ' GROUP BY p.id';
  
  // 按相关度和时间排序
  query += search 
    ? ' ORDER BY relevance DESC, p.created_at DESC LIMIT ? OFFSET ?'
    : ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  
  // 解析 JSON 字段
  return rows.map(row => ({
    ...row,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images
  })) as ProductWithSeller[];
};

export const getProductById = async (id: number): Promise<ProductWithSeller | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT 
      p.*,
      u.username as seller_name,
      u.avatar as seller_avatar,
      COALESCE(COUNT(DISTINCT f.id), 0) as favorite_count
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    LEFT JOIN favorites f ON p.id = f.product_id
    WHERE p.id = ?
    GROUP BY p.id
    `,
    [id]
  );
  
  if (rows.length === 0) return null;
  
  const product = rows[0];
  return {
    ...product,
    images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images
  } as ProductWithSeller;
};

export const createProduct = async (productData: {
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  images: string[];
  seller_id: number;
}): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO products (title, description, price, \`condition\`, category, images, seller_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      productData.title,
      productData.description,
      productData.price,
      productData.condition,
      productData.category,
      JSON.stringify(productData.images),
      productData.seller_id
    ]
  );
  return result.insertId;
};

export const updateProductStatus = async (
  id: number,
  status: 'available' | 'sold' | 'reserved',
  sellerId?: number
): Promise<boolean> => {
  const where = sellerId !== undefined ? 'WHERE id = ? AND seller_id = ?' : 'WHERE id = ?';
  const params: any[] = sellerId !== undefined ? [status, id, sellerId] : [status, id];
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE products SET status = ? ${where}`,
    params
  );
  return result.affectedRows > 0;
};

// 更新商品基础信息（标题、价格、描述、类别、成色、状态、图片）
export const updateProduct = async (
  id: number,
  data: {
    title?: string;
    price?: number;
    description?: string;
    category?: string;
    condition?: string;
    status?: 'available' | 'sold' | 'reserved';
    images?: string[];
  },
  sellerId?: number
): Promise<boolean> => {
  const fields: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
  if (data.price !== undefined) { fields.push('price = ?'); params.push(data.price); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
  if (data.condition !== undefined) { fields.push('`condition` = ?'); params.push(data.condition); }
  if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
  if (data.images !== undefined) { fields.push('images = ?'); params.push(JSON.stringify(data.images)); }

  if (fields.length === 0) {
    return false;
  }

  const where = sellerId !== undefined ? 'WHERE id = ? AND seller_id = ?' : 'WHERE id = ?';
  const whereParams = sellerId !== undefined ? [...params, id, sellerId] : [...params, id];
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE products SET ${fields.join(', ')} ${where}`,
    whereParams
  );
  return result.affectedRows > 0;
};

export const deleteProduct = async (id: number, sellerId?: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    sellerId !== undefined
      ? 'DELETE FROM products WHERE id = ? AND seller_id = ?'
      : 'DELETE FROM products WHERE id = ?',
    sellerId !== undefined ? [id, sellerId] : [id]
  );
  return result.affectedRows > 0;
};

// 获取用户发布的商品
export const getUserProducts = async (
  userId: number,
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ProductWithSeller[]> => {
  let query = `
    SELECT 
      p.*,
      u.username as seller_name,
      u.avatar as seller_avatar
    FROM products p
    LEFT JOIN users u ON p.seller_id = u.id
    WHERE p.seller_id = ?
  `;
  
  const params: any[] = [userId];
  
  if (status && status !== 'all') {
    query += ' AND p.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  
  return rows.map(row => ({
    ...row,
    images: typeof row.images === 'string' ? JSON.parse(row.images) : row.images
  })) as ProductWithSeller[];
};
