import { Request, Response } from 'express';
import { UserModel, User } from '../models/userModel';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';

export class UserController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

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
      if (!emailRegex.test(email)) {
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

      // 生成默认头像URL (使用UI Avatars API)
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=200`;

      // 创建用户
      const userId = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        avatar: defaultAvatar
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
      } else if (error.message) {
        // 如果错误有消息，显示具体信息
        errorMessage = `数据库错误: ${error.message}`;
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

      // 用户不存在
      if (!user) {
        res.status(401).json({ error: '用户不存在，请检查用户名或邮箱' });
        return;
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: '密码错误，请重试' });
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
      const { username, email, phone, avatar } = req.body;

      const updates: any = {};
      if (username) updates.username = username;
      if (email) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (avatar !== undefined) updates.avatar = avatar;

      // 检查用户名和邮箱是否已被其他用户使用
      if (username) {
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          res.status(400).json({ error: 'Username already exists' });
          return;
        }
      }

      if (email) {
        const existingUser = await UserModel.findByEmail(email);
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
      const { password, ...userWithoutPassword } = user!;
      
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
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
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

      // 不返回密码等敏感信息
      const { password, ...userWithoutPassword } = user;
      
      res.json({ 
        success: true,
        data: userWithoutPassword 
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