import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// 路由导入
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import uploadRoutes from './routes/uploadRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import viewHistoryRoutes from './routes/viewHistoryRoutes';
import addressRoutes from './routes/addressRoutes';
import messageRoutes from './routes/messageRoutes';
import orderRoutes from './routes/orderRoutes';
import aiRoutes from './routes/aiRoutes';
import { scheduleCleanupJob } from './utils/cleanup';
import { globalLimiter } from './middleware/rateLimit';

// 环境变量配置
dotenv.config();

const app = express();

// 部署在 Nginx / 反向代理后面时，需要信任代理才能拿到真实客户端 IP
// 否则限流会全部按代理 IP 计数，导致误伤
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// 中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // 允许跨域访问静态资源
}));
// CORS配置 - 通过环境变量控制
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:3000'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供上传文件的访问
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 全局兑底限流（静态资源与健康检查排除在外）
app.use('/api', globalLimiter);

// 路由
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/view-history', viewHistoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);
// 启动定时清理任务（每日凌晨3点）
scheduleCleanupJob();

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 处理
app.all('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// 全局错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Global Error Handler:');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  console.error('Request:', {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
  });
});

export default app;