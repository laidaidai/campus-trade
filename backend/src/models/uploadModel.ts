import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * 记录上传文件归属。同一文件被多人复用时，只保留首次上传者，
 * 后续用户不会覆盖 owner，删除时也不会把共享文件删掉。
 */
export const recordUploadedFile = async (
  filename: string,
  uploadType: 'products' | 'avatars',
  userId: number
): Promise<void> => {
  await pool.query<ResultSetHeader>(
    `INSERT IGNORE INTO uploaded_files (filename, upload_type, user_id)
     VALUES (?, ?, ?)`,
    [filename, uploadType, userId]
  );
};

export const getUploadOwner = async (
  filename: string,
  uploadType: 'products' | 'avatars'
): Promise<number | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id
       FROM uploaded_files
      WHERE filename = ? AND upload_type = ?
      LIMIT 1`,
    [filename, uploadType]
  );
  return rows.length > 0 ? Number(rows[0].user_id) : null;
};

export const deleteUploadRecord = async (
  filename: string,
  uploadType: 'products' | 'avatars'
): Promise<void> => {
  await pool.query(
    'DELETE FROM uploaded_files WHERE filename = ? AND upload_type = ?',
    [filename, uploadType]
  );
};

/**
 * 文件是否已被业务数据引用：被商品图或头像引用时不能删除。
 */
export const isUploadReferenced = async (
  filename: string,
  uploadType: 'products' | 'avatars'
): Promise<boolean> => {
  const likeValue = `%${filename}%`;

  if (uploadType === 'avatars') {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM users WHERE avatar LIKE ? LIMIT 1',
      [likeValue]
    );
    return rows.length > 0;
  }

  const [productRows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM products WHERE images LIKE ? LIMIT 1',
    [likeValue]
  );
  if (productRows.length > 0) return true;

  const [messageRows] = await pool.query<RowDataPacket[]>(
    "SELECT 1 FROM messages WHERE type = 'image' AND content LIKE ? LIMIT 1",
    [likeValue]
  );
  return messageRows.length > 0;
};
