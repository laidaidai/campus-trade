/**
 * AI Agent 核心 —— 手写 tool-calling 循环
 *
 * 为什么不用 LangChain：
 *   本项目只需要「多轮工具调用 + 流式输出」，逻辑不到 200 行。
 *   引入框架会带来版本升级、抽象泄漏、调试困难等成本，收益不成正比。
 *
 * 流程：
 *   用户消息 → LLM 判断是否调用工具 → 执行工具 → 结果回灌 → LLM 基于真实数据回答
 *   最多 maxToolRounds 轮，防止模型反复调用工具烧钱。
 */

import { getAiConfig } from '../../config/ai';
import { toolDefinitions, executeTool, ProductCard } from './tools';

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** Agent 对外抛出的事件，controller 负责转成 SSE */
export type AgentEvent =
  | { type: 'delta'; content: string }
  | { type: 'tool_start'; name: string }
  | { type: 'cards'; cards: ProductCard[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

const buildSystemPrompt = (username: string): string => `你是「校园交易」平台的 AI 助手，名字叫「小易」。你服务的是在校大学生，帮他们淘二手、卖闲置、解答平台使用问题。

## 你的能力
你可以调用工具查询**真实**平台数据：
- search_products：搜索在售商品
- get_product_detail：查看商品详情
- get_my_orders：查询当前用户的订单
- get_categories：获取分类列表

## 铁律（非常重要）
1. **绝不编造商品**。没有调用 search_products 就不知道平台上有什么，必须先查再说。
2. **绝不编造价格、卖家、订单状态**。工具没返回的信息就说"我查不到"。
3. 搜索无结果时，如实告知，并建议换关键词、放宽价格或分类，不要假装有货。
4. 你**不能**替用户下单、付款、改价、删除商品。这些必须引导用户点商品卡片自己操作。
5. 不要承诺退款、赔偿、发货时间等平台政策以外的内容。

## 平台规则（回答咨询时依据这些）
- 发布：登录后点「发布闲置」，填标题、描述、价格、成色，最多传 9 张图（单张 ≤10MB）
- 交易流程：买家下单 → 卖家确认 → 线下当面交易 → 确认收货，订单完成
- 联系卖家：在商品页点「联系卖家」进入站内私信
- 收藏：商品可收藏，在「我的收藏」查看
- 修改/下架商品：在「我的发布」里操作
- 订单状态：待付款 / 已付款 / 已发货 / 已完成 / 已取消
- 建议线下交易选在校园内公共场所（图书馆、食堂门口），当面验货

## 风格
- 简体中文，口语化，像学长学姐帮学弟学妹参谋
- 简洁！一般 2-4 句话，不要长篇大论和过度分点
- 推荐商品时用「标题 + 价格」的形式点名，商品卡片会自动展示在你回复下方，不要重复罗列编号列表
- 不要用 emoji 堆砌，最多偶尔一个
- 不确定的事就问一句，不要瞎猜

当前用户：${username}`;

interface CompletionResult {
  content: string;
  toolCalls: ToolCall[];
}

/**
 * 调用一次 Chat Completions。
 * stream=false 用于工具决策轮（需要拿到完整 tool_calls），
 * stream=true 用于最终回答（边生成边推给前端）。
 */
async function callLLM(
  messages: ChatMessage[],
  stream: boolean,
  onDelta?: (text: string) => void
): Promise<CompletionResult> {
  const cfg = getAiConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        max_tokens: cfg.maxTokens,
        temperature: 0.7,
        stream: stream || undefined,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI 接口返回 ${res.status}: ${text.slice(0, 300)}`);
    }

    if (!stream) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
      };
      const msg = json.choices?.[0]?.message;
      return {
        content: msg?.content ?? '',
        toolCalls: msg?.tool_calls ?? [],
      };
    }

    // ---- 解析 SSE 流 ----
    if (!res.body) throw new Error('AI 接口未返回流式响应');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    const toolCallMap = new Map<number, { id: string; name: string; args: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      // 最后一行可能不完整，留到下一轮
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let chunk: any;
        try {
          chunk = JSON.parse(payload);
        } catch {
          continue; // 忽略无法解析的片段
        }

        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === 'string' && delta.content) {
          content += delta.content;
          onDelta?.(delta.content);
        }

        // 流式模式下 tool_calls 是分片到达的，需要按 index 拼接
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = typeof tc.index === 'number' ? tc.index : 0;
            const entry = toolCallMap.get(idx) ?? { id: '', name: '', args: '' };
            if (tc.id) entry.id = tc.id;
            if (tc.function?.name) entry.name += tc.function.name;
            if (tc.function?.arguments) entry.args += tc.function.arguments;
            toolCallMap.set(idx, entry);
          }
        }
      }
    }

    const toolCalls: ToolCall[] = [...toolCallMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .filter(([, v]) => v.name)
      .map(([idx, v]) => ({
        id: v.id || `call_${idx}`,
        type: 'function' as const,
        function: { name: v.name, arguments: v.args || '{}' },
      }));

    return { content, toolCalls };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 运行 Agent，以异步生成器逐步产出事件。
 * controller 直接把事件翻译成 SSE 帧即可。
 *
 * 每一轮都走「流式」：模型正常回答时边生成边推送（打字机效果）；
 * 需要调工具时，模型通常不会输出正文，只返回 tool_calls，
 * 于是这一轮没有 delta，接着执行工具并进入下一轮。
 */
export async function* runAgent(params: {
  userId: number;
  username: string;
  history: ChatMessage[];
  userMessage: string;
}): AsyncGenerator<AgentEvent> {
  const cfg = getAiConfig();
  if (!cfg.enabled) {
    yield { type: 'error', message: 'AI 助手未启用，请联系管理员配置 AI_API_KEY' };
    return;
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(params.username) },
    ...params.history.slice(-cfg.maxHistoryMessages),
    { role: 'user', content: params.userMessage },
  ];

  try {
    for (let round = 0; round < cfg.maxToolRounds; round++) {
      const pending: AgentEvent[] = [];

      const result = await callLLM(messages, true, (text) => {
        pending.push({ type: 'delta', content: text });
      });

      // 没有工具调用 → 就是最终回答
      if (result.toolCalls.length === 0) {
        if (!result.content && pending.length === 0) {
          yield { type: 'delta', content: '抱歉，我没太理解，可以再说具体一点吗？' };
        }
        for (const ev of pending) yield ev;
        yield { type: 'done' };
        return;
      }

      // 有工具调用：把本轮正文推出去（通常是空的），然后执行工具
      for (const ev of pending) yield ev;

      messages.push({
        role: 'assistant',
        content: result.content || null,
        tool_calls: result.toolCalls,
      });

      const cards: ProductCard[] = [];
      for (const tc of result.toolCalls) {
        yield { type: 'tool_start', name: tc.function.name };
        const toolResult = await executeTool(
          tc.function.name,
          tc.function.arguments,
          params.userId
        );
        if (toolResult.cards?.length) cards.push(...toolResult.cards);
        messages.push({ role: 'tool', tool_call_id: tc.id, content: toolResult.content });
      }

      if (cards.length) {
        // 去重，避免同一商品因多次搜索重复展示
        const seen = new Set<number>();
        yield { type: 'cards', cards: cards.filter((c) => !seen.has(c.id) && seen.add(c.id)) };
      }
    }

    // 达到轮数上限，让模型基于已获取的信息直接总结
    const final = await callLLM(messages, true, () => {});
    yield {
      type: 'delta',
      content: final.content || '这个问题有点复杂，你可以补充一些条件再问我一次。',
    };
    yield { type: 'done' };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AI] runAgent 失败:', message);
    if (message.includes('aborted')) {
      yield { type: 'error', message: 'AI 响应超时，请稍后重试' };
    } else {
      yield { type: 'error', message: 'AI 助手暂时不可用，请稍后重试' };
    }
  }
}
