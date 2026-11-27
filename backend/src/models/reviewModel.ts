import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface Review extends RowDataPacket {
  id: number;
  order_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;
  content?: string | null;
  created_at: Date;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export const getOrderReviews = async (orderId: number): Promise<Review[]> => {
  const [rows] = await pool.query<Review[]>(
    `SELECT r.*, u.username as reviewer_name, u.avatar as reviewer_avatar
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.order_id = ?
      ORDER BY r.created_at ASC`,
    [orderId]
  );
  return rows;
};

export const createReview = async (
  orderId: number,
  reviewerId: number,
  revieweeId: number,
  rating: number,
  content?: string
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO reviews (order_id, reviewer_id, reviewee_id, rating, content)
     VALUES (?, ?, ?, ?, ?)`,
    [orderId, reviewerId, revieweeId, rating, content ?? null]
  );
  return result.insertId;
};

export const getUserRating = async (
  userId: number
): Promise<{ rating_avg: number | null; rating_count: number }> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ROUND(AVG(rating), 1) as rating_avg, COUNT(*) as rating_count
       FROM reviews
      WHERE reviewee_id = ?`,
    [userId]
  );
  return {
    rating_avg: rows[0]?.rating_avg ?? null,
    rating_count: Number(rows[0]?.rating_count ?? 0)
  };
};
