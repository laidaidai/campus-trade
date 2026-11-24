import { findCompletedOrdersBefore, hardDeleteOrders } from '../models/orderModel';

/**
 * 每日定时清理：删除已完成超过60天的订单记录。
 *
 * 注意：这里只删除订单记录，不再删除商品图片。
 * 订单和商品共用图片文件，清理订单时删图会让仍然存在的商品出现裂图。
 */
export const scheduleCleanupJob = () => {
  // 简易计划：每24小时执行一次（服务启动后约1小时首次执行）
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const run = async () => {
    try {
      const orders = await findCompletedOrdersBefore(60);
      if (!orders.length) return;
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
