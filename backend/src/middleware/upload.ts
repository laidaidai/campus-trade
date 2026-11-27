import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
const productImagesDir = path.join(uploadDir, 'products');
const avatarDir = path.join(uploadDir, 'avatars');

// 单张图片上限 10MB，与前端预检保持一致
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 创建目录
[uploadDir, productImagesDir, avatarDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据上传类型决定存储位置
    const uploadType = req.body.uploadType || 'products';
    const destPath = (uploadType === 'avatar' || uploadType === 'avatars') ? avatarDir : productImagesDir;
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名: 时间戳-随机数.扩展名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 允许的MIME类型
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  // 允许的文件扩展名
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // 获取文件扩展名（转为小写）
  const ext = path.extname(file.originalname).toLowerCase();

  // 同时验证MIME类型和文件扩展名
  if (allowedMimes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    // 带自定义标记，handleUploadError 会转成 400 可读文案
    const error: any = new Error('只支持上传图片文件 (jpg, jpeg, png, gif, webp)');
    error.isUploadTypeError = true;
    cb(error);
  }
};

// 创建 multer 实例
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE, // 限制10MB
  }
});

// 计算文件MD5哈希值
export const calculateFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// 根据哈希值查找已存在的文件
export const findExistingFile = (hash: string, uploadType: string = 'products'): string | null => {
  const targetDir = (uploadType === 'avatar' || uploadType === 'avatars') ? avatarDir : productImagesDir;
  
  if (!fs.existsSync(targetDir)) {
    return null;
  }
  
  const files = fs.readdirSync(targetDir);
  
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    
    // 检查文件名中是否包含哈希值(我们将采用新的命名规则)
    if (file.includes(hash)) {
      return file;
    }
  }
  
  return null;
};

// 单文件上传中间件
export const uploadSingle = upload.single('image');

// 多文件上传中间件 (最多9张)
export const uploadMultiple = upload.array('images', 9);

/**
 * 把 multer / 文件过滤的错误翻译成可读的 400 响应，
 * 避免任何上传失败都变成 500 + stack 泄漏。
 */
export const handleUploadError = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!error) {
    next();
    return;
  }

  // 只处理上传相关错误，其余交给全局处理器
  const uploadErrorCode = error?.code;
  const isUploadError =
    error instanceof multer.MulterError ||
    error?.name === 'MulterError' ||
    uploadErrorCode === 'LIMIT_FILE_SIZE' ||
    uploadErrorCode === 'LIMIT_UNEXPECTED_FILE' ||
    uploadErrorCode === 'LIMIT_FILE_COUNT' ||
    // 自定义的格式错误标记
    error?.isUploadTypeError === true;

  if (!isUploadError) {
    next(error);
    return;
  }

  let message = '上传失败，请重试';
  let status = 400;

  if (uploadErrorCode === 'LIMIT_FILE_SIZE') {
    message = `单张图片不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    status = 413;
  } else if (uploadErrorCode === 'LIMIT_UNEXPECTED_FILE' || error?.isUploadTypeError) {
    message = '只支持上传 jpg / jpeg / png / gif / webp 格式的图片';
  } else if (uploadErrorCode === 'LIMIT_FILE_COUNT') {
    message = '一次最多上传 9 张图片';
  }

  // 清理可能已经落盘的文件
  const uploaded = (req as any).files;
  const cleanup = Array.isArray(uploaded)
    ? uploaded
    : uploaded && typeof uploaded === 'object'
      ? Object.values(uploaded).flat() as any[]
      : [];
  cleanup.forEach((file: any) => {
    if (file?.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* 清理失败忽略 */
      }
    }
  });

  res.status(status).json({ success: false, message });
};
