import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { calculateFileHash, findExistingFile } from '../middleware/upload';
import * as UploadModel from '../models/uploadModel';

const normalizeUploadType = (raw: unknown): 'products' | 'avatars' | null => {
  const value = String(raw || 'products');
  if (value === 'products') return 'products';
  if (value === 'avatar' || value === 'avatars') return 'avatars';
  return null;
};

/**
 * 单张图片上传(支持去重)
 */
export const uploadSingleImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
      return;
    }

    const uploadType = normalizeUploadType(req.body.uploadType);
    if (!uploadType) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ success: false, message: '不支持的上传类型' });
      return;
    }
    const userId = (req as any).user?.userId;
    const uploadedFilePath = req.file.path;
    
    console.log('📤 上传文件信息:', {
      uploadType,
      originalPath: uploadedFilePath,
      filename: req.file.filename,
      destination: req.file.destination
    });
    
    // 计算文件哈希值
    const fileHash = await calculateFileHash(uploadedFilePath);
    
    // 检查是否已存在相同文件
    const existingFile = findExistingFile(fileHash, uploadType);
    
    let finalFilename = req.file.filename;
    let imageUrl = `/uploads/${uploadType}/${finalFilename}`;
    let isDuplicate = false;

    if (existingFile) {
      // 文件已存在,删除新上传的文件,使用已存在的文件
      fs.unlinkSync(uploadedFilePath);
      finalFilename = existingFile;
      imageUrl = `/uploads/${uploadType}/${existingFile}`;
      isDuplicate = true;
    } else {
      // 重命名文件,将哈希值加入文件名
      const ext = path.extname(req.file.filename);
      const newFilename = `${fileHash}${ext}`;
      const newPath = path.join(path.dirname(uploadedFilePath), newFilename);
      
      fs.renameSync(uploadedFilePath, newPath);
      finalFilename = newFilename;
      imageUrl = `/uploads/${uploadType}/${newFilename}`;
    }

    if (Number.isInteger(Number(userId)) && Number(userId) > 0) {
      await UploadModel.recordUploadedFile(finalFilename, uploadType, Number(userId));
    }

    res.json({
      success: true,
      data: {
        filename: finalFilename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: imageUrl,
        hash: fileHash,
        isDuplicate
      },
      message: isDuplicate ? '检测到重复文件,已使用已存在的文件' : '上传成功'
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
};

/**
 * 多张图片上传(支持去重)
 */
export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        message: '没有上传文件'
      });
      return;
    }

    const uploadType = normalizeUploadType(req.body.uploadType);
    if (!uploadType) {
      for (const file of req.files) fs.unlinkSync(file.path);
      res.status(400).json({ success: false, message: '不支持的上传类型' });
      return;
    }
    const userId = Number((req as any).user?.userId);
    const imageUrls = [];
    let duplicateCount = 0;

    // 处理每个文件
    for (const file of req.files) {
      const uploadedFilePath = file.path;
      
      // 计算文件哈希值
      const fileHash = await calculateFileHash(uploadedFilePath);
      
      // 检查是否已存在相同文件
      const existingFile = findExistingFile(fileHash, uploadType);
      
      let finalFilename = file.filename;
      let imageUrl = `/uploads/${uploadType}/${finalFilename}`;
      let isDuplicate = false;

      if (existingFile) {
        // 文件已存在,删除新上传的文件
        fs.unlinkSync(uploadedFilePath);
        finalFilename = existingFile;
        imageUrl = `/uploads/${uploadType}/${existingFile}`;
        isDuplicate = true;
        duplicateCount++;
      } else {
        // 重命名文件,将哈希值加入文件名
        const ext = path.extname(file.filename);
        const newFilename = `${fileHash}${ext}`;
        const newPath = path.join(path.dirname(uploadedFilePath), newFilename);
        
        fs.renameSync(uploadedFilePath, newPath);
        finalFilename = newFilename;
        imageUrl = `/uploads/${uploadType}/${newFilename}`;
      }

      imageUrls.push({
        filename: finalFilename,
        originalname: file.originalname,
        size: file.size,
        url: imageUrl,
        hash: fileHash,
        isDuplicate
      });

      if (Number.isInteger(userId) && userId > 0) {
        await UploadModel.recordUploadedFile(finalFilename, uploadType, userId);
      }
    }

    const message = duplicateCount > 0 
      ? `成功上传 ${imageUrls.length} 张图片 (${duplicateCount} 张为重复文件)`
      : `成功上传 ${imageUrls.length} 张图片`;

    res.json({
      success: true,
      data: imageUrls,
      message
    });
  } catch (error) {
    console.error('上传图片失败:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
    });
  }
};

/**
 * 删除图片
 *
 * 仅允许上传者本人删除，且文件没有被商品、头像或聊天图片引用。
 */
export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.body;
    const userId = Number((req as any).user?.userId);

    if (!filename) {
      res.status(400).json({
        success: false,
        message: '缺少文件名参数'
      });
      return;
    }

    const type = normalizeUploadType(req.body.uploadType);
    if (!type) {
      res.status(400).json({ success: false, message: '不支持的上传类型' });
      return;
    }

    // 仅保留文件名部分，防止路径穿越攻击（如 ../../.env）
    const safeFilename = path.basename(String(filename));
    if (!safeFilename || safeFilename !== String(filename)) {
      res.status(400).json({ success: false, message: '非法的文件名' });
      return;
    }

    const uploadsDir = path.resolve(__dirname, '../../uploads');
    const filePath = path.resolve(uploadsDir, type, safeFilename);

    // 双重校验：确保最终路径仍在上传目录内
    if (!filePath.startsWith(path.resolve(uploadsDir, type) + path.sep)) {
      res.status(400).json({ success: false, message: '非法的文件名' });
      return;
    }

    const ownerId = await UploadModel.getUploadOwner(safeFilename, type);
    if (ownerId === null || ownerId !== userId) {
      res.status(403).json({ success: false, message: '无权删除该文件' });
      return;
    }

    if (await UploadModel.isUploadReferenced(safeFilename, type)) {
      res.status(409).json({
        success: false,
        message: '该图片仍被商品或头像使用，不能删除'
      });
      return;
    }

    if (!fs.existsSync(filePath)) {
      await UploadModel.deleteUploadRecord(safeFilename, type);
      res.status(404).json({ success: false, message: '文件不存在' });
      return;
    }

    fs.unlinkSync(filePath);
    await UploadModel.deleteUploadRecord(safeFilename, type);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败'
    });
  }
};
