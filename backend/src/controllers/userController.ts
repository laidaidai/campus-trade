import { Request, Response } from 'express';
import { UserModel, User } from '../models/userModel';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { verifyCode } from '../utils/verificationCode';
import * as ReviewModel from '../models/reviewModel';

/**
 * 是否要求注册时验证邮箱
 * 默认：配置了 SMTP 即开启（未配置邮件服务时自动厤免，方便本地/测试部署）
 * 可通过 REQUIRE_EMAIL_VERIFICATION=true/false 强制覆盖
 */
export const isEmailVerificationRequired = (): boolean => {
  const flag = process.env.REQUIRE_EMAIL_VERIFICATION;
  if (flag !== undefined) {
    return flag === 'true';
  }
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
};

export class UserController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username: rawUsername, email: rawEmail, password, code } = req.body;
      const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';
      const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';

      // 验证必填字段
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email and password are required' });
        return;
      }

      // 验证用户名格式
      if (username.length < 3 || username.length > 20) {
        res.status(400).json({ error: '用户名长度必须在3-20个字符之间' });
        return;
      }

      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
        res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
        return;
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 254) {
        res.status(400).json({ error: '邮箱格式不正确' });
        return;
      }

      // 验证密码强度
      if (password.length < 6) {
        res.status(400).json({ error: '密码长度至少为6位' });
        return;
      }

      if (password.length > 50) {
        res.status(400).json({ error: '密码长度不能超过50位' });
        return;
      }

      // 并行检查用户名、邮箱是否存在，同时开始密码加密
      const [existingUsername, existingEmail, hashedPassword] = await Promise.all([
        UserModel.findByUsername(username),
        UserModel.findByEmail(email),
        bcrypt.hash(password, 10)  // 并行加密密码
      ]);

      if (existingUsername) {
        res.status(400).json({ error: '用户名已被使用，请换一个' });
        return;
      }

      if (existingEmail) {
        res.status(400).json({ error: '该邮箱已被注册' });
        return;
      }

      // 邮箱验证码校验（开启时强制）
      // 放在重复校验之后，避免白白消耗一次验证码
      if (isEmailVerificationRequired()) {
        if (!code) {
          res.status(400).json({ error: '请先获取邮箱验证码' });
          return;
        }

        const codeValid = await verifyCode(email, String(code), 'register');
        if (!codeValid) {
          res.status(400).json({ error: '邮箱验证码错误或已过期' });
          return;
        }
      }

      // 默认头像交给前端本地生成器（avatar 为空时按用户名生成），不再写死外部图片服务
      const userId = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        avatar: null
      });

      // 生成 JWT token
      const token = generateToken(userId);

      res.status(201).json({
        message: 'User created successfully',
        user: { id: userId, username, email },
        token
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // 根据错误类型提供具体的错误信息
      let errorMessage = 'Internal server error';
      let statusCode = 500;
      
      if (error.code === 'ER_DUP_ENTRY') {
        // MySQL 重复键错误
        if (error.message.includes('username')) {
          errorMessage = '用户名已被使用，请换一个';
          statusCode = 400;
        } else if (error.message.includes('email')) {
          errorMessage = '该邮箱已被注册';
          statusCode = 400;
        } else {
          errorMessage = '数据重复，请检查输入信息';
          statusCode = 400;
        }
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        errorMessage = '数据库引用错误';
      } else if (error.code === 'ER_BAD_FIELD_ERROR') {
        errorMessage = '数据库字段错误';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = '数据库访问被拒绝，请检查数据库配置';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = '无法连接到数据库，请检查数据库服务状态';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '数据库连接超时';
      } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        errorMessage = '数据库连接丢失';
      } else if (error.code === 'ER_CON_COUNT_ERROR') {
        errorMessage = '数据库连接数过多';
      } else if (error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
        errorMessage = '数据库用户连接数超限';
      } else if (error.code === 'ER_DBACCESS_DENIED_ERROR') {
        errorMessage = '数据库访问权限不足';
      } else if (error.code === 'ER_BAD_DB_ERROR') {
        errorMessage = '数据库不存在';
      } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
        errorMessage = '数据库用户名或密码错误';
      } else if (error.code === 'ER_HOST_NOT_PRIVILEGED') {
        errorMessage = '数据库主机访问权限不足';
      } else if (error.code === 'ER_CANNOT_CONNECT') {
        errorMessage = '无法连接到数据库服务器';
      } else if (error.code === 'ER_HANDSHAKE_ERROR') {
        errorMessage = '数据库握手失败';
      } else if (error.code === 'ER_UNKNOWN_ERROR') {
        errorMessage = '未知数据库错误';
      } else if (error.code) {
        // 其他数据库错误不暴露细节，避免泄露敏感信息
        errorMessage = '服务器错误，请稍后重试';
        statusCode = 500;
      } else {
        errorMessage = '服务器错误，请稍后重试';
      }
      
      console.error('具体错误信息:', {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        message: error.message,
        sql: error.sql
      });
      
      res.status(statusCode).json({ 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState,
          message: error.message
        } : undefined
      });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { loginId, password } = req.body;

      // 验证必填字段
      if (!loginId || !password) {
        res.status(400).json({ error: 'Login ID and password are required' });
        return;
      }

      // 验证输入格式
      if (!loginId.trim()) {
        res.status(400).json({ error: '请输入用户名或邮箱' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: '密码长度至少为6位' });
        return;
      }

      // 查找用户 (支持邮箱或用户名登录)
      let user = await UserModel.findByEmail(loginId);
      if (!user) {
        user = await UserModel.findByUsername(loginId);
      }

      // 统一提示，避免暴露用户是否存在
      if (!user) {
        res.status(401).json({ error: '用户名/邮箱或密码错误' });
        return;
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: '用户名/邮箱或密码错误' });
        return;
      }

      // 生成 JWT token
      const token = generateToken(user.id!);

      res.json({
        message: 'Login successful',
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          avatar: user.avatar,
          phone: user.phone
        },
        token
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const user = await UserModel.findById(userId);
      
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // 不返回密码
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error: any) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { username, email, phone, avatar, code } = req.body;
      const currentUser = await UserModel.findById(userId);

      if (!currentUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updates: any = {};

      if (username !== undefined) {
        const name = String(username).trim();
        if (name.length < 3 || name.length > 20) {
          res.status(400).json({ error: '用户名长度必须在3-20个字符之间' });
          return;
        }
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(name)) {
          res.status(400).json({ error: '用户名只能包含字母、数字、下划线和中文' });
          return;
        }
        updates.username = name;
      }

      if (email !== undefined) {
        const nextEmail = String(email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nextEmail) || nextEmail.length > 254) {
          res.status(400).json({ error: '邮箱格式不正确' });
          return;
        }

        // 邮箱变更必须重新验证新邮箱，不能借资料更新绕过验证码
        if (nextEmail !== String(currentUser.email || '').toLowerCase() && isEmailVerificationRequired()) {
          if (!code) {
            res.status(400).json({ error: '修改邮箱需要先获取新邮箱验证码' });
            return;
          }
          const valid = await verifyCode(nextEmail, String(code), 'register');
          if (!valid) {
            res.status(400).json({ error: '邮箱验证码错误或已过期' });
            return;
          }
        }
        updates.email = nextEmail;
      }

      if (phone !== undefined) {
        const nextPhone = phone === null ? '' : String(phone).trim();
        if (nextPhone && !/^[0-9+\-\s]{6,20}$/.test(nextPhone)) {
          res.status(400).json({ error: '手机号格式不正确' });
          return;
        }
        updates.phone = nextPhone || null;
      }

      if (avatar !== undefined) {
        if (avatar === null || avatar === '') {
          updates.avatar = null;
        } else {
          const avatarPath = String(avatar).trim();
          if (!/^\/uploads\/avatars\/[A-Za-z0-9._-]+$/.test(avatarPath)) {
            res.status(400).json({ error: '头像地址不合法' });
            return;
          }
          updates.avatar = avatarPath;
        }
      }

      // 检查用户名和邮箱是否已被其他用户使用
      if (updates.username) {
        const existingUser = await UserModel.findByUsername(updates.username);
        if (existingUser && existingUser.id !== userId) {
          res.status(400).json({ error: 'Username already exists' });
          return;
        }
      }

      if (updates.email) {
        const existingUser = await UserModel.findByEmail(updates.email);
        if (existingUser && existingUser.id !== userId) {
          res.status(400).json({ error: 'Email already exists' });
          return;
        }
      }

      const updated = await UserModel.updateProfile(userId, updates);

      if (!updated) {
        res.status(400).json({ error: 'No changes made' });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const { password, ...userWithoutPassword } = user;

      res.json({
        message: 'Profile updated successfully',
        user: userWithoutPassword
      });
    } catch (error: any) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await UserModel.findAll();
      res.json({ users });
    } catch (error: any) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const userId = Number(req.params.id);
      
      if (!Number.isInteger(userId) || userId <= 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid user ID' 
        });
        return;
      }

      const user = await UserModel.findById(userId);
      
      if (!user) {
        res.status(404).json({ 
          success: false, 
          error: 'User not found' 
        });
        return;
      }

      // 公开接口只返回安全字段，不暴露邮箱和手机号
      const { password, email, phone, ...publicInfo } = user;
      const rating = await ReviewModel.getUserRating(userId);
      
      res.json({ 
        success: true,
        data: { ...publicInfo, ...rating }
      });
    } catch (error: any) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      const { current_password, new_password } = req.body as { current_password?: string; new_password?: string };

      if (!current_password || !new_password) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }
      if (new_password.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // 需要包含密码，使用单独查询
      const fullUser = await UserModel.findByUsername(user.username);
      if (!fullUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const ok = await bcrypt.compare(current_password, fullUser.password);
      if (!ok) {
        res.status(400).json({ error: 'Current password is incorrect' });
        return;
      }

      const hashed = await bcrypt.hash(new_password, 12);
      const updated = await UserModel.updatePassword(userId, hashed);
      if (!updated) {
        res.status(500).json({ error: 'Failed to update password' });
        return;
      }
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Update password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}