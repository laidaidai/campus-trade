import mysql from 'mysql2/promise';

// 验证必需的环境变量
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`缺少必需的数据库环境变量: ${missingEnvVars.join(', ')}\n请在 .env 文件中配置这些变量`);
}

const dbConfig = {
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  acquireTimeoutMillis: 60000,
  charset: 'utf8mb4'
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 延迟函数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const connectDatabase = async (maxRetries: number = 10, retryDelay: number = 3000): Promise<void> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const connection = await pool.getConnection();
      console.log('✅ MySQL database connected successfully');
      connection.release();
      return; // 连接成功，退出函数
    } catch (error: any) {
      lastError = error;
      
      // 详细的错误信息
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        message: error.message,
        config: {
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.user,
          database: dbConfig.database
        }
      });
      
      if (attempt < maxRetries) {
        console.log(`⚠️  Retrying in ${retryDelay/1000}s...`);
        await sleep(retryDelay);
      } else {
        console.error(`❌ Database connection failed after ${maxRetries} attempts`);
      }
    }
  }
  
  // 所有重试都失败后才抛出错误
  throw lastError;
};

export default pool;