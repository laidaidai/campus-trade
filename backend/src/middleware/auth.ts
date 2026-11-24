import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel';

// 验证JWT密钥环境变量
if (!process.env.JWT_SECRET) {
  throw new Error('缺少必需的环境变量: JWT_SECRET\n请在 .env 文件中配置 JWT_SECRET');
}

const JWT_SECRET = process.env.JWT_SECRET;

const userStillExists = async (userId: number): Promise<boolean> => {
  const user = await UserModel.findById(userId);
  return Boolean(user);
};

export interface AuthenticatedRequest extends Request {
  user?: { userId: number };
}

export const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    const userId = Number(decoded?.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    void (async () => {
      try {
        if (!(await userStillExists(userId))) {
          res.status(401).json({ error: '账号不存在或已注销，请重新登录' });
          return;
        }
        (req as AuthenticatedRequest).user = { userId };
        next();
      } catch (error) {
        console.error('校验登录用户失败:', error);
        res.status(500).json({ error: '认证服务暂时不可用' });
      }
    })();
  });
};