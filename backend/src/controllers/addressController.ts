import { Request, Response } from 'express';
import * as AddressModel from '../models/addressModel';

const parseAddressId = (raw: string): number | null => {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const validateAddressFields = (body: any): string | null => {
  const name = String(body?.name ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const province = String(body?.province ?? '').trim();
  const city = String(body?.city ?? '').trim();
  const district = String(body?.district ?? '').trim();
  const detail = String(body?.detail ?? '').trim();

  if (!name || !phone || !province || !city || !district || !detail) {
    return '请填写完整的地址信息';
  }
  if (name.length > 50 || phone.length > 20) return '收货人或手机号过长';
  if (province.length > 50 || city.length > 50 || district.length > 50) return '地区信息过长';
  if (detail.length > 200) return '详细地址不能超过200个字符';
  if (!/^[0-9+\-\s]{6,20}$/.test(phone)) return '手机号格式不正确';
  return null;
};

// 获取用户所有地址
export const getAddresses = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const addresses = await AddressModel.getUserAddresses(userId);
    
    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('获取地址列表失败:', error);
    res.status(500).json({ error: '获取地址列表失败' });
  }
};

// 获取单个地址
export const getAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const addressId = parseAddressId(req.params.id);

    if (!addressId) {
      res.status(400).json({ error: '无效的地址ID' });
      return;
    }

    const address = await AddressModel.getAddressById(addressId, userId);
    
    if (!address) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }
    
    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('获取地址详情失败:', error);
    res.status(500).json({ error: '获取地址详情失败' });
  }
};

// 创建地址
export const createAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const { name, phone, province, city, district, detail, is_default } = req.body;

    const validationError = validateAddressFields(req.body);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const addressId = await AddressModel.createAddress({
      user_id: userId,
      name: String(name).trim(),
      phone: String(phone).trim(),
      province: String(province).trim(),
      city: String(city).trim(),
      district: String(district).trim(),
      detail: String(detail).trim(),
      is_default: Boolean(is_default)
    });
    
    res.status(201).json({
      success: true,
      data: { id: addressId },
      message: '地址添加成功'
    });
  } catch (error) {
    console.error('创建地址失败:', error);
    res.status(500).json({ error: '创建地址失败' });
  }
};

// 更新地址
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const addressId = parseAddressId(req.params.id);

    if (!addressId) {
      res.status(400).json({ error: '无效的地址ID' });
      return;
    }

    const existing = await AddressModel.getAddressById(addressId, userId);
    if (!existing) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }

    // 更新时至少传一个允许字段；空请求不能伪装成成功
    const updates: Partial<AddressModel.UserAddress> = {};
    for (const key of ['name', 'phone', 'province', 'city', 'district', 'detail', 'is_default'] as const) {
      if (req.body[key] !== undefined) {
        if (key === 'is_default') {
          updates[key] = Boolean(req.body[key]);
        } else {
          const value = String(req.body[key]).trim();
          if (!value) {
            res.status(400).json({ error: '地址字段不能为空' });
            return;
          }
          (updates as any)[key] = value;
        }
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: '没有需要更新的内容' });
      return;
    }

    const fieldError = validateAddressFields({ ...existing, ...updates });
    if (fieldError) {
      res.status(400).json({ error: fieldError });
      return;
    }

    const updated = await AddressModel.updateAddress(addressId, userId, updates);
    if (!updated) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }

    res.json({
      success: true,
      message: '地址更新成功'
    });
  } catch (error) {
    console.error('更新地址失败:', error);
    res.status(500).json({ error: '更新地址失败' });
  }
};

// 删除地址
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const addressId = parseAddressId(req.params.id);

    if (!addressId) {
      res.status(400).json({ error: '无效的地址ID' });
      return;
    }

    const existing = await AddressModel.getAddressById(addressId, userId);
    if (!existing) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }

    const deleted = await AddressModel.deleteAddress(addressId, userId);
    if (!deleted) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }

    res.json({
      success: true,
      message: '地址删除成功'
    });
  } catch (error) {
    console.error('删除地址失败:', error);
    res.status(500).json({ error: '删除地址失败' });
  }
};

// 设置默认地址
export const setDefaultAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;
    const addressId = parseAddressId(req.params.id);

    if (!addressId) {
      res.status(400).json({ error: '无效的地址ID' });
      return;
    }

    const success = await AddressModel.setDefaultAddress(addressId, userId);
    if (!success) {
      res.status(404).json({ error: '地址不存在' });
      return;
    }

    res.json({
      success: true,
      message: '已设置为默认地址'
    });
  } catch (error) {
    console.error('设置默认地址失败:', error);
    res.status(500).json({ error: '设置默认地址失败' });
  }
};
