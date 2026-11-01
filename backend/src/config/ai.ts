/**
 * AI 服务配置
 *
 * 本模块对接任意「OpenAI 兼容」的 Chat Completions 接口，
 * 因此 DeepSeek / 通义千问 / Moonshot(Kimi) / OpenAI / 智谱 等都可以直接用。
 *
 * 只需在 .env 中配置三项：
 *   AI_API_KEY=sk-xxxx
 *   AI_BASE_URL=https://api.deepseek.com/v1
 *   AI_MODEL=deepseek-chat
 *
 * 常用服务商参数：
 * ┌────────────┬──────────────────────────────────┬──────────────────────┐
 * │ 服务商      │ AI_BASE_URL                      │ AI_MODEL             │
 * ├────────────┼──────────────────────────────────┼──────────────────────┤
 * │ DeepSeek   │ https://api.deepseek.com/v1      │ deepseek-chat        │
 * │ 通义千问    │ https://dashscope.aliyuncs.com/compatible-mode/v1 │ qwen-plus │
 * │ Kimi       │ https://api.moonshot.cn/v1       │ moonshot-v1-8k       │
 * │ 智谱 GLM   │ https://open.bigmodel.cn/api/paas/v4 │ glm-4-flash       │
 * │ OpenAI     │ https://api.openai.com/v1        │ gpt-4o-mini          │
 * └────────────┴──────────────────────────────────┴──────────────────────┘
 *
 * 未配置 AI_API_KEY 时，整个 AI 模块自动「静默关闭」：
 *   前端 /api/ai/status 返回 enabled=false，不渲染入口，不影响其他功能。
 */

export interface AiConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** 单次回复最大 token */
  maxTokens: number;
  /** 工具调用循环的最大轮数，防止死循环烧钱 */
  maxToolRounds: number;
  /** 单次请求超时（毫秒） */
  timeoutMs: number;
  /** 每次会话保留的历史消息条数上限 */
  maxHistoryMessages: number;
}

const num = (v: string | undefined, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const apiKey = (process.env.AI_API_KEY ?? '').trim();

export const getAiConfig = (): AiConfig => ({
  enabled: apiKey.length > 0,
  apiKey,
  // 默认 DeepSeek，便宜且中文效果好
  baseUrl: (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, ''),
  model: process.env.AI_MODEL || 'deepseek-chat',
  maxTokens: num(process.env.AI_MAX_TOKENS, 1024),
  maxToolRounds: num(process.env.AI_MAX_TOOL_ROUNDS, 4),
  timeoutMs: num(process.env.AI_TIMEOUT_MS, 60_000),
  maxHistoryMessages: num(process.env.AI_MAX_HISTORY, 20),
});

export const isAiEnabled = (): boolean => getAiConfig().enabled;

/** 供前端展示的公开配置（不含密钥） */
export const getAiPublicInfo = () => {
  const cfg = getAiConfig();
  return {
    enabled: cfg.enabled,
    model: cfg.enabled ? cfg.model : null,
  };
};
