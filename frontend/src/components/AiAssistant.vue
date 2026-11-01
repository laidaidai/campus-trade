<template>
  <div class="ai-floating" :class="{ open: isOpen }" @click="toggle">
    <div class="ai-ball">
      <span>🤖</span>
      <div class="bubble" v-if="isOpen">
        <div class="header">
          <h4>小易 AI</h4>
          <span v-if="isAiEnabled" class="badge">已启用</span>
          <span v-else class="badge warning">未配置</span>
        </div>
        <div v-if="isAiEnabled" class="content">
          <div v-if="isLoading" class="loading">正在思考...</div>
          <div v-else-if="error" class="error">{{ error }}</div>
          <div v-else-if="messages.length === 0" class="placeholder">
            你想买什么二手商品？<br />
            我可以帮你搜索、在售商品、分析价格、帮你写文案。
          </div>
          <div v-else class="chat-history">
            <div
              v-for="(msg, i) in messages"
              :key="i"
              class="message"
              :class="msg.role"
            >
              <span v-if="msg.role === 'assistant'" class="avatar">🤖</span>
              <span v-else class="avatar">👤</span>
              <span class="text">{{ msg.content }}</span>
            </div>
            <div v-if="isTyping" class="typing">小易正在输入...</div>
          </div>
        </div>
        <div v-else class="content">
          <p class="tip">AI 助手未启用</p>
          <el-button @click="configure">配置 API Key</el-button>
        </div>

        <div v-if="isOpen" class="footer">
          <el-input
            v-model="inputMessage"
            placeholder="输入你的问题..."
            @keydown.enter="sendMessage"
            @blur="autoResize"
            :disabled="isLoading"
          />
          <el-button @click="sendMessage" :disabled="isLoading || !inputMessage.trim()">
            发送
          </el-button>
          <el-button @click="clearHistory" type="text" size="small">清空对话</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getAiStatus } from '@/api/ai'
import { chatStream } from '@/api/ai'

const router = useRouter()

// 状态
const isOpen = ref(false)
const isLoading = ref(false)
const isTyping = ref(false)
const error = ref('')
const messages = ref([])
const inputMessage = ref('')
const isAiEnabled = ref(false)

// 自动调整输入框高度
const autoResize = () => {
  const el = document.querySelector('.ai-floating textarea')
  if (el) el.style.height = 'auto'
}

// 获取状态
const fetchStatus = async () => {
  try {
    const { data } = await getAiStatus()
    isAiEnabled.value = data.enabled
  } catch (e) {
    console.error('获取 AI 状态失败:', e)
  }
}

fetchStatus()

// 切换开关
const toggle = () => {
  if (!isAiEnabled.value) {
    error.value = 'AI 助手未启用，请联系管理员配置 API_KEY'
    return
  }
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    document.dispatchEvent(new CustomEvent('ai-closed'))
  }
}

// 关闭浮动时触发
const close = () => {
  isOpen.value = false
  error.value = ''
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const msg = inputMessage.value.trim()
  messages.value.push({ role: 'user', content: msg })
  inputMessage.value = ''

  setTimeout(() => {
    const chat = document.querySelector('.chat-history')
    if (chat) chat.scrollTop = chat.scrollHeight
  }, 10)

  isLoading.value = true
  error.value = ''
  const signal = AbortSignal.timeout(60000)

  try {
    await chatStream({
      message: msg,
      history: messages.value,
      onEvent: (event) => {
        if (event.type === 'delta') {
          const last = messages.value[messages.value.length - 1]
          if (last && last.role === 'assistant') {
            last.content += event.content
          } else {
            messages.value.push({ role: 'assistant', content: event.content })
          }
        } else if (event.type === 'cards') {
          document.dispatchEvent(new CustomEvent('ai-cards', { detail: event.cards }))
        } else if (event.type === 'tool_start') {
        } else if (event.type === 'done') {
          isLoading.value = false
        } else if (event.type === 'error') {
          error.value = event.message
          isLoading.value = false
        }
      },
      signal,
    })
  } catch (e) {
    error.value = e.message || '网络错误'
    isLoading.value = false
  }
}

// 清空对话
const clearHistory = () => {
  messages.value = []
  error.value = ''
}

// 配置入口
const configure = () => {
  close()
  router.push('/profile?tab=ai')
}

// 监听全局关闭事件
window.addEventListener('ai-closed', close)
</script>

<style scoped>
.ai-floating {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
}

.ai-ball {
  width: 68px;
  height: 68px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-ball:hover {
  transform: scale(1.08);
}

.ai-ball span {
  font-size: 32px;
  line-height: 1;
}

.bubble {
  position: absolute;
  bottom: 85px;
  right: 0;
  width: 340px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #eee;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating.open .bubble {
  opacity: 1;
  transform: translateY(0);
}

.header {
  padding: 14px 18px;
  background: #ff6b6b;
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(255,255,255,0.25);
}

.badge.warning {
  background: #ff9800;
}

.content {
  padding: 14px;
  max-height: 320px;
  overflow-y: auto;
}

.chat-history {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.message.assistant {
  flex-direction: row;
}

.message.user {
  flex-direction: row-reverse;
  align-items: flex-end;
}

.avatar {
  width: 32px;
  height: 32px;
  background: #f0f0f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.message.assistant .avatar {
  background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
  color: white;
}

.text {
  max-width: 85%;
  padding: 10px 14px;
  background: #f8f8f8;
  border-radius: 18px;
  line-height: 1.5;
  font-size: 15px;
  white-space: pre-wrap;
}

.placeholder {
  text-align: center;
  color: #888;
  font-size: 15px;
  line-height: 1.6;
}

.loading,
.typing {
  font-style: italic;
  color: #999;
  text-align: center;
}

.footer {
  padding: 12px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
}

.footer textarea {
  flex: 1;
  resize: none;
  border: 1px solid #ddd;
  border-radius: 9999px;
  padding: 10px 16px;
  font-size: 15px;
  line-height: 1.4;
  min-height: 42px;
  max-height: 120px;
  outline: none;
}

.footer button {
  flex-shrink: 0;
  padding: 0 18px;
  border-radius: 9999px;
}

.tip {
  color: #999;
  text-align: center;
  margin: 20px 0;
}
</style>
