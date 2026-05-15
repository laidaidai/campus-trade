import fs from 'fs';
import path from 'path';
import { findCompletedOrdersBefore, hardDeleteOrders } from '../models/orderModel';

// 扫描并删除图片文件
const deleteProductImages = (imagesField: any, uploadsDir: string) => {
  try {
    const images: string[] = Array.isArray(imagesField)
      ? imagesField
      : (typeof imagesField === 'string' ? JSON.parse(imagesField) : []);
    for (const rel of images) {
      if (!rel) continue;
      const abs = path.join(uploadsDir, rel.replace(/^\//, ''));
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    }
  } catch (_) {
    // ignore parse errors
  }
};

// 每日定时清理：删除已完成超过60天的订单及图片
export const scheduleCleanupJob = () => {
  // 简易计划：每24小时执行一次（服务启动后约1小时首次执行，可按需调整为更短）
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const orders = await findCompletedOrdersBefore(60);
      if (!orders.length) return;
      const uploadsDir = path.join(__dirname, '../../uploads');

      for (const o of orders) {
        deleteProductImages((o as any).product_image, uploadsDir);
      }
      await hardDeleteOrders(orders.map(o => o.id));
      // 可在此输出日志：console.log(`Cleanup removed ${orders.length} orders`)
    } catch (e) {
      // console.error('Cleanup error:', e)
    }
  };

  // 首次延迟1小时执行，之后每天执行一次
  setTimeout(() => {
    run();
    setInterval(run, ONE_DAY_MS);
  }, 60 * 60 * 1000);
};


