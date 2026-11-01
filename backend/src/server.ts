// 首先加载环境变量（必须在所有其他导入之前）
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量文件
dotenv.config();

// 检查必要的环境变量
if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  console.error('错误: 缺少必要的环境变量配置');
  console.error('请创建 .env 文件并配置以下变量:');
  console.error('  DB_HOST=数据库主机地址');
  console.error('  DB_PORT=数据库端口');
  console.error('  DB_USER=数据库用户名');
  console.error('  DB_PASSWORD=数据库密码');
  console.error('  DB_NAME=数据库名称');
  console.error('  JWT_SECRET=JWT密钥');
  console.error('  SMTP_HOST=邮件服务器地址');
  console.error('  SMTP_USER=邮件用户名');
  console.error('  SMTP_PASS=邮件密码');
  process.exit(1);
}


import app from './app';
import { connectDatabase } from './config/database';
import { createServer } from 'http';
import { initializeSocket } from './config/socket';
import { ensureVerificationTable } from './utils/verificationCode';

const PORT = process.env.PORT || 3000;

// 优雅关闭处理
const gracefulShutdown = () => {
  console.log('Received shutdown signal, closing server gracefully...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase();

    // 确保验证码存储表存在（幂等）
    await ensureVerificationTable();

    // 创建 HTTP 服务器
    const httpServer = createServer(app);
    
    // 初始化 WebSocket
    initializeSocket(httpServer);
    
    httpServer.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // 服务器错误处理
    httpServer.on('error', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();