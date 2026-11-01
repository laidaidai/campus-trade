/**
 * AI Agent 可调用的工具（Function Calling）
 *
 * 设计原则：
 *   1. 只读 —— 所有工具都不写数据库，AI 无法直接改价、下单、删商品
 *      （下单/发布这类不可逆操作必须由用户在前端确认后走原接口）
 *   2. 复用现有 model 层 —— 不重复写 SQL，保证数据口径一致
 *   3. 输出精简 —— 只回传模型需要的字段，避免 token 浪费
 *   4. 入参全部校验 —— 模型可能给出越界/非法值，一律兜底
 */

import * as ProductModel from '../../models/productModel';
import * as OrderModel from '../../models/orderModel';
import * as CategoryModel from '../../models/categoryModel';

// ---------------------------------------------------------------- 工具定义

export const toolDefinitions = [
  {
    type: 'function' as const,
    function: {
      name: 'search_products',
      description:
        '在校园二手市场搜索在售商品。当用户想找东西、问「有没有XX」「XX多少钱」、需要推荐时调用。' +
        '返回商品的 id、标题、价格、成色、分类和图片，可直接据此回答并推荐。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词，如「自行车」「高等数学 教材」「iPhone」。留空则按分类/价格筛选',
          },
          category: {
            type: 'string',
            description: '分类名，如「教材书籍」「数码电子」「生活用品」「运动户外」「服饰鞋包」「其他」',
          },
          min_price: { type: 'number', description: '最低价格（元）' },
          max_price: { type: 'number', description: '最高价格（元）' },
          condition: {
            type: 'string',
            enum: ['new', 'like-new', 'good', 'fair', 'poor'],
            description: '成色：new=全新, like-new=几乎全新, good=成色良好, fair=一般, poor=有使用痕迹',
          },
          limit: { type: 'number', description: '返回数量，默认 8，最多 15' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_product_detail',
      description: '获取某个商品的完整详情（描述、卖家、成色、状态、图片）。用户问某个具体商品的细节时调用。',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'number', description: '商品 ID' },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_my_orders',
      description:
        '查询当前登录用户自己的订单。用户问「我的订单」「我买的东西到哪了」「有没有人买我的东西」时调用。',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['buyer', 'seller'],
            description: 'buyer=我买到的（默认），seller=我卖出的',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_categories',
      description: '获取平台全部商品分类列表。需要确认有哪些分类时调用。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
] as const;

// ---------------------------------------------------------------- 辅助

const CONDITION_TEXT: Record<string, string> = {
  new: '全新',
  'like-new': '几乎全新',
  good: '成色良好',
  fair: '一般',
  poor: '有使用痕迹',
};

const STATUS_TEXT: Record<string, string> = {
  available: '在售',
  sold: '已售出',
  reserved: '已预订',
};

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const optNum = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const str = (v: unknown, maxLen = 60): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t.slice(0, maxLen) : undefined;
};

/** 前端可直接使用的商品卡片数据 */
export interface ProductCard {
  id: number;
  title: string;
  price: number;
  condition: string;
  category: string;
  image: string | null;
  seller: string;
  status: string;
}

// ---------------------------------------------------------------- 执行器

export interface ToolResult {
  /** 回传给模型的内容（JSON 字符串） */
  content: string;
  /** 若产生商品卡片，前端会渲染成可点击的卡片 */
  cards?: ProductCard[];
}

export const executeTool = async (
  name: string,
  rawArgs: string,
  userId: number
): Promise<ToolResult> => {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { content: JSON.stringify({ error: '参数解析失败，请检查 JSON 格式' }) };
  }

  switch (name) {
    case 'search_products': {
      const query = str(args.query);
      const category = str(args.category);
      const condition = str(args.condition, 20);
      const limit = clampInt(args.limit, 1, 15, 8);
      const minPrice = optNum(args.min_price);
      const maxPrice = optNum(args.max_price);

      // 先按现有 model 拉一批，再在内存里做价格/成色过滤
      // （model 层暂不支持这两个维度，避免为了 AI 改动公共查询）
      const rows = await ProductModel.getAllProducts(
        category,
        'available',
        Math.min(60, limit * 6),
        0,
        query
      );

      const filtered = rows.filter((p) => {
        const price = Number(p.price);
        if (minPrice !== undefined && price < minPrice) return false;
        if (maxPrice !== undefined && price > maxPrice) return false;
        if (condition && p.condition !== condition) return false;
        return true;
      });

      const picked = filtered.slice(0, limit);

      if (picked.length === 0) {
        return {
          content: JSON.stringify({
            total: 0,
            message: '没有找到符合条件的在售商品。可以建议用户换个关键词、放宽价格或分类。',
          }),
        };
      }

      const cards: ProductCard[] = picked.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        condition: CONDITION_TEXT[p.condition] ?? p.condition,
        category: p.category,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        seller: p.seller_name ?? '',
        status: STATUS_TEXT[p.status] ?? p.status,
      }));

      return {
        content: JSON.stringify({
          total: filtered.length,
          returned: picked.length,
          products: cards.map((c) => ({
            id: c.id,
            title: c.title,
            price: c.price,
            condition: c.condition,
            category: c.category,
            seller: c.seller,
          })),
        }),
        cards,
      };
    }

    case 'get_product_detail': {
      const id = clampInt(args.product_id, 1, Number.MAX_SAFE_INTEGER, 0);
      if (!id) return { content: JSON.stringify({ error: 'product_id 无效' }) };

      const p = await ProductModel.getProductById(id);
      if (!p) return { content: JSON.stringify({ error: '商品不存在或已被删除' }) };

      const card: ProductCard = {
        id: p.id,
        title: p.title,
        price: Number(p.price),
        condition: CONDITION_TEXT[p.condition] ?? p.condition,
        category: p.category,
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        seller: p.seller_name ?? '',
        status: STATUS_TEXT[p.status] ?? p.status,
      };

      return {
        content: JSON.stringify({
          id: p.id,
          title: p.title,
          price: Number(p.price),
          condition: card.condition,
          category: p.category,
          status: card.status,
          seller: p.seller_name,
          // 描述可能很长，截断以控制 token
          description: (p.description ?? '').slice(0, 400),
          imageCount: Array.isArray(p.images) ? p.images.length : 0,
        }),
        cards: [card],
      };
    }

    case 'get_my_orders': {
      const role = args.role === 'seller' ? 'seller' : 'buyer';
      const orders = await OrderModel.getUserOrders(userId, role);

      if (orders.length === 0) {
        return {
          content: JSON.stringify({
            total: 0,
            role,
            message: role === 'buyer' ? '该用户还没有买过东西' : '该用户还没有卖出过东西',
          }),
        };
      }

      return {
        content: JSON.stringify({
          total: orders.length,
          role,
          orders: orders.slice(0, 10).map((o) => ({
            orderId: o.id,
            product: o.product_title,
            price: Number(o.price),
            status: ORDER_STATUS_TEXT[o.status] ?? o.status,
            createdAt: o.created_at,
            counterparty: role === 'buyer' ? o.seller_name : o.buyer_name,
          })),
        }),
      };
    }

    case 'get_categories': {
      const cats = await CategoryModel.getAllCategories();
      return {
        content: JSON.stringify({
          categories: cats.map((c) => c.name),
        }),
      };
    }

    default:
      return { content: JSON.stringify({ error: `未知工具: ${name}` }) };
  }
};
