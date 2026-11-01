import request from './request'

/**
 * 获取 AI 助手状态（未配置 AI_API_KEY 时 enabled=false，前端不渲染入口）
 */
export const getAiStatus = () => request.get('/ai/status')

/**
 * 流式对话
 *
 * 注意：不能用 axios —— 浏览器端 axios 不支持读取流式响应体。
 * 这里用 fetch + ReadableStream 逐块解析 SSE。
 *
 * @param {Object}   params
 * @param {string}   params.message  用户消息
 * @param {Array}    params.history  历史消息 [{role, content}]
 * @param {Function} params.onEvent  每收到一个事件回调
 * @param {AbortSignal} params.signal 中断信号
 */
export const chatStream = async ({
  message,
  history = [],
  onEvent,
  signal,
}) => {
  const token = localStorage.getItem('token')

  const response = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history }),
    signal,
  })

  // 非 200：后端返回的是 JSON 错误（如 429 限流、401 未登录）
  if (!response.ok) {
    let msg = 'AI 助手暂时不可用'
    try {
      const data = await response.json()
      msg = data.message || data.error || msg
    } catch {
      /* 忽略解析失败 */
    }
    throw new Error(msg)
  }

  if (!response.body) {
    throw new Error('当前浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE 以空行分隔事件
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      for (const block of blocks) {
        for (const line of block.split('\n')) {
          const trimmed = line.trim()
          // 跳过心跳注释行 ": ping"
          if (!trimmed.startsWith('data:')) continue

          const payload = trimmed.slice(5).trim()
          if (!payload) continue

          try {
            onEvent(JSON.parse(payload))
          } catch {
            /* 忽略坏帧 */
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }
}

/**
 * 根据商品信息生成文案（发布页用，非流式）
 */
export const generateDescription = (data) => request.post('/ai/describe', data)
