import { Request, Response } from 'express';
import { UserModel } from '../models/userModel';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../utils/emailService';
import {
  generateCode,
  saveCode,
  verifyCode,
  getRemainingCooldown
} from '../utils/verificationCode';

export class AuthController {
  /**
   * 发送验证码
   * POST /api/auth/send-code
   */
  static async sendVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const { email, type } = req.body;

      // 验证必填字段
      if (!email || !type) {
        res.status(400).json({ error: 'Email and type are required' });
        return;
      }

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }

      // 验证类型
      if (type !== 'register' && type !== 'reset-password') {
        res.status(400).json({ error: 'Invalid type' });
        return;
      }

      // 检查发送冷却时间
      const cooldown = await getRemainingCooldown(email, type);
      if (cooldown > 0) {
        res.status(429).json({
          error: `Please wait ${cooldown} seconds before resending`,
          cooldown
        });
        return;
      }

      // 如果是注册,检查邮箱是否已存在
      if (type === 'register') {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          res.status(400).json({ error: 'Email already registered' });
          return;
        }
      }

      // 如果是找回密码,检查邮箱是否存在
      if (type === 'reset-password') {
        const user = await UserModel.findByEmail(email);
        if (!user) {
          res.status(404).json({ error: 'Email not found' });
          return;
        }
      }

      // 生成验证码
      const code = generateCode();

      // 保存验证码
      const saved = await saveCode(email, code, type);
      if (!saved) {
        res.status(429).json({ error: 'Please wait before resending' });
        return;
      }

      // 发送邮件
      const sent = await sendVerificationEmail(email, code, type);
      if (!sent) {
        res.status(500).json({ 
          error: 'Failed to send email',
          message: '邮件发送失败，请检查邮箱地址是否正确，或稍后重试。如果问题持续，请联系管理员。'
        });
        return;
      }

      res.json({
        message: 'Verification code sent successfully',
        email,
        expiresIn: 300 // 5分钟
      });
    } catch (error: any) {
      console.error('Send code error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: '服务器错误，请稍后重试'
      });
    }
  }

  /**
   * 验证验证码 (可选的独立验证接口)
   * POST /api/auth/verify-code
   */
  static async verifyVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, type } = req.body;

      if (!email || !code || !type) {
        res.status(400).json({ error: 'Email, code and type are required' });
        return;
      }

      const isValid = await verifyCode(email, code, type);

      if (!isValid) {
        res.status(400).json({ error: 'Invalid or expired verification code' });
        return;
      }

      res.json({ message: 'Verification successful' });
    } catch (error) {
      console.error('Verify code error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * 重置密码
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body;

      // 验证必填字段
      if (!email || !code || !newPassword) {
        res.status(400).json({ error: 'Email, code and new password are required' });
        return;
      }

      // 验证密码长度
      if (newPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // 验证验证码
      const isValid = await verifyCode(email, code, 'reset-password');
      if (!isValid) {
        res.status(400).json({ error: 'Invalid or expired verification code' });
        return;
      }

      // 查找用户
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 更新密码 (需要在 UserModel 中添加这个方法)
      await UserModel.updatePassword(user.id!, hashedPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
