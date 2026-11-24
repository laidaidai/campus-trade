import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserAddress {
  id?: number;
  user_id: number;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// 获取用户所有地址
export const getUserAddresses = async (userId: number): Promise<UserAddress[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [userId]
  );
  return rows as UserAddress[];
};

// 获取单个地址
export const getAddressById = async (addressId: number, userId: number): Promise<UserAddress | null> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM user_addresses WHERE id = ? AND user_id = ?',
    [addressId, userId]
  );
  return rows.length > 0 ? (rows[0] as UserAddress) : null;
};

// 创建地址
export const createAddress = async (address: Omit<UserAddress, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 如果设置为默认地址,先取消其他默认地址
    if (address.is_default) {
      await connection.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
        [address.user_id]
      );
    }
    
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO user_addresses 
      (user_id, name, phone, province, city, district, detail, is_default) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        address.user_id,
        address.name,
        address.phone,
        address.province,
        address.city,
        address.district,
        address.detail,
        address.is_default
      ]
    );
    
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 更新地址
export const updateAddress = async (
  addressId: number,
  userId: number,
  updates: Partial<UserAddress>
): Promise<boolean> => {
  const allowedFields = ['name', 'phone', 'province', 'city', 'district', 'detail', 'is_default'] as const;
  const fields = allowedFields.filter(key => (updates as any)[key] !== undefined);

  if (fields.length === 0) {
    return false;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 如果设置为默认地址,先取消其他默认地址
    if (updates.is_default === true) {
      await connection.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ? AND id != ?',
        [userId, addressId]
      );
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE user_addresses SET ${setClause} WHERE id = ? AND user_id = ?`,
      [...values, addressId, userId]
    );

    if (result.affectedRows === 0) {
      // 更新成与原值相同也会是 0，不能据此判定地址不存在
      const [exists] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1',
        [addressId, userId]
      );
      if (exists.length === 0) {
        await connection.rollback();
        return false;
      }
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 删除地址
export const deleteAddress = async (addressId: number, userId: number): Promise<boolean> => {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM user_addresses WHERE id = ? AND user_id = ?',
    [addressId, userId]
  );
  return result.affectedRows > 0;
};

// 设置默认地址
export const setDefaultAddress = async (addressId: number, userId: number): Promise<boolean> => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 地址不存在时绝不能先把用户已有的默认地址清空
    const [existing] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1',
      [addressId, userId]
    );
    if (existing.length === 0) {
      await connection.rollback();
      return false;
    }

    await connection.query(
      'UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?',
      [userId]
    );

    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?',
      [addressId, userId]
    );

    await connection.commit();
    return result.affectedRows > 0 || existing.length > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
