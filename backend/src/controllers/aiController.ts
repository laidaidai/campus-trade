import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { isAiEnabled, getAiPublicInfo, getAiConfig } from '../config/ai';
import { runAgent, ChatMessage } from '../services/ai/agent';
import { UserModel } from '../models/userModel';

/** GET /api/ai/status —— 前端据此决定是否渲染 AI 入口 */
export const getStatus = (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ success: true, data: getAiPublicInfo() });
};

const MAX_MESSAGE_LEN = 500;

/** 校验并清洗前端传来的历史消息 */
const sanitizeHistory = (raw: unknown): ChatMessage[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === 'object' &&
        (m as any).role !== undefined &&
        typeof (m as any).content === 'string'
    )
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: String(m.content).slice(0, 2000),
    }));
};

/**
 * POST /api/ai/chat —— SSE 流式对话
 *
 * 事件格式：
 *   data: {"type":"delta","content":"..."}      文本增量
 *   data: {"type":"tool_start","name":"..."}    正在查询（前端显示"正在搜索商品…"）
 *   data: {"type":"cards","cards":[...]}         商品卡片
 *   data: {"type":"done"}                        结束
 *   data: {"type":"error","message":"..."}       错误
 */
export const chat = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: '请先登录' });
    return;
  }

  if (!isAiEnabled()) {
    res.status(503).json({ success: false, message: 'AI 助手未启用' });
    return;
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) {
    res.status(400).json({ success: false, message: '消息不能为空' });
    return;
  }
  if (message.length > MAX_MESSAGE_LEN) {
    res.status(400).json({ success: false, message: `消息过长（最多 ${MAX_MESSAGE_LEN} 字）` });
    return;
  }

  // ---- SSE 响应头 ----
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // 关闭 Nginx 缓冲，保证逐字推送
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const send = (payload: unknown): void => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // 客户端断开时终止生成，避免继续消耗 token
  const controller = new AbortController();
  let aborted = false;
  req.on('close', () => {
    aborted = true;
    controller.abort();
  });

  // 心跳，防止代理层 60s 空闲断开
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) res.write(': ping\n\n');
  }, 15_000);

  try {
    const user = await UserModel.findById(userId);
    const username = user?.username ?? '同学';
    const history = sanitizeHistory(req.body?.history);

    for await (const event of runAgent({ userId, username, history, userMessage: message })) {
      if (aborted) break;
      send(event);
    }
  } catch (error) {
    console.error('[AI] chat 失败:', error);
    send({ type: 'error', message: 'AI 助手暂时不可用，请稍后重试' });
  } finally {
    clearInterval(heartbeat);
    if (!res.writableEnded) res.end();
  }
};

/**
 * POST /api/ai/describe —— 根据商品信息生成发布文案
 *
 * 非流式（发布页需要一次性拿到结果填进表单）。
 * 同样走 OpenAI 兼容接口，但不挂工具，纯文本生成。
 */
export const generateDescription = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const cfg = getAiConfig();
  if (!cfg.enabled) {
    res.status(503).json({ success: false, message: 'AI 助手未启用' });
    return;
  }

  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 80) : '';
  const category = typeof req.body?.category === 'string' ? req.body.category.slice(0, 30) : '';
  const condition = typeof req.body?.condition === 'string' ? req.body.condition.slice(0, 20) : '';
  const keywords =
    typeof req.body?.keywords === 'string' ? req.body.keywords.trim().slice(0, 200) : '';

  if (!title) {
    res.status(400).json({ success: false, message: '请先填写商品标题' });
    return;
  }

  const conditionText: Record<string, string> = {
    new: '全新未拆封',
    'like-new': '几乎全新',
    good: '成色良好',
    fair: '有正常使用痕迹',
    poor: '使用痕迹明显',
  };

  const prompt = `请为校园二手交易平台写一段商品描述。

商品标题：${title}
分类：${category || '未指定'}
成色：${conditionText[condition] ?? '未指定'}
${keywords ? `卖家补充的关键信息：${keywords}` : ''}

要求：
1. 100-180 字，中文，语气真诚自然，像学生之间说话
2. 说清楚：物品状况、为什么出、适合谁
3. 如果是教材，提到适用课程/专业；如果是电子产品，提到配件和电池情况
4. 不要写「欢迎咨询」「超值」这类空话，也不要编造未提供的信息
5. 不要加标题，不要用 markdown，直接输出正文段落`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: '你是校园二手交易平台的文案助手，写作简洁真诚，不夸大其词。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[AI] describe 接口错误:', response.status, text.slice(0, 200));
      res.status(502).json({ success: false, message: 'AI 生成失败，请稍后重试' });
      return;
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const description = json.choices?.[0]?.message?.content?.trim() ?? '';

    if (!description) {
      res.status(502).json({ success: false, message: 'AI 没有返回内容' });
      return;
    }

    res.json({ success: true, data: { description } });
  } catch (error) {
    console.error('[AI] describe 失败:', error);
    res.status(502).json({ success: false, message: 'AI 生成失败，请稍后重试' });
  } finally {
    clearTimeout(timer);
  }
};
