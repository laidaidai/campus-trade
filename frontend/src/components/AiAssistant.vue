<template>
  <!-- 悬浮球 -->
  <div class="ai-fab" @click.stop="toggleOpen" :class="{ active: isOpen }" title="AI 助手">
    <svg v-if="!isOpen" class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 1.64 1.64 0 0 1-1.5-1v-1.84c0-.89-.62-1.63-1.5-1.76a1.75 1.75 0 0 0-1.9 1.75v1a9 9 0 0 1-9-9Z" transform="translate(0 1)"/>
      <path d="M9 11.5v.01M12 9.5v.01M15 11.5v.01M12 16.5v.01"/>
    </svg>
    <svg v-else class="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  </div>

  <!-- 聊天面板 -->
  <div v-if="isOpen" class="ai-panel" @click.stop>
    <!-- 头部 -->
    <div class="ai-panel-header">
      <div class="header-left">
        <div class="avatar-sm">🤖</div>
        <div>
          <div class="header-title">小易</div>
          <div class="header-sub" :class="{ online: aiEnabled }">
            {{ aiEnabled ? '校园 AI 助手' : '未启用' }}
          </div>
        </div>
      </div>
      <button class="clear-btn" title="清空对话" @click="clearHistory" :disabled="messages.length === 0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
        </svg>
      </button>
    </div>

    <!-- 消息区 -->
    <div ref="scrollRef" class="ai-panel-body">
      <!-- 未启用 -->
      <div v-if="!aiEnabled" class="empty-state">
        <div class="empty-icon">😴</div>
        <p>AI 助手还没启用</p>
        <span class="empty-hint">联系管理员在服务器 .env 中配置 AI_API_KEY 即可开启</span>
      </div>

      <!-- 未登录 -->
      <div v-else-if="!isLoggedIn" class="empty-state">
        <div class="empty-icon">🔐</div>
        <p>登录后可使用 AI 助手</p>
        <button class="login-btn" @click="$router.push('/auth')">去登录</button>
      </div>

      <!-- 欢迎语 -->
      <div v-else-if="messages.length === 0" class="welcome">
        <p class="welcome-text">你好呀同学！我是小易 🎓</p>
        <div class="suggestion-list">
          <button v-for="s in suggestions" :key="s" class="suggestion-chip" @click="sendQuick(s)">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 对话 -->
      <template v-else>
        <div v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="msg-avatar">🤖</div>
          <div class="msg-bubble-wrap">
            <div class="msg-bubble">{{ msg.content || (msg.pending ? '思考中…' : '') }}</div>
            <!-- 商品卡片 -->
            <div v-if="msg.cards && msg.cards.length" class="cards-grid">
              <div
                v-for="card in msg.cards"
                :key="card.id"
                class="product-card"
                @click="goProduct(card)"
              >
                <div class="card-img-wrap">
                  <img v-if="card.image" :src="getImageUrl(card.image)" :alt="card.title" loading="lazy" @error="onImgError" />
                  <div v-else class="card-img-fallback">📦</div>
                </div>
                <div class="card-body">
                  <div class="card-title">{{ card.title }}</div>
                  <div class="card-meta">
                    <span class="card-price">¥{{ card.price }}</span>
                    <span class="card-cond">{{ card.condition }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 正在查询提示 -->
        <div v-if="toolStatus" class="tool-status">
          <span class="spinner"></span> {{ toolStatus }}
        </div>
      </template>
    </div>

    <!-- 输入区 -->
    <div class="ai-panel-footer">
      <textarea
        v-model="inputText"
        class="ai-input"
        rows="1"
        placeholder="问我点什么吧，比如「有没有便宜点的自行车」"
        :disabled="!aiEnabled || !isLoggedIn"
        @keydown.enter.exact.prevent="handleEnter"
        @input="autoResize"
      ></textarea>
      <button
        class="send-btn"
        :disabled="!canSend"
        @click="sendMessage"
      >
        <svg v-if="!sending" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
        </svg>
        <span v-else class="spinner"></span>
      </button>
    </div>
    <div class="ai-panel-tip">内容由 AI 生成，购买前请仔细核对商品信息</div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { getAiStatus, chatStream } from '@/api/ai'
import { getImageUrl } from '@/config'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const isOpen = ref(false)
const aiEnabled = ref(false)
const inputText = ref('')
const sending = ref(false)
const toolStatus = ref('')
const messages = ref([]) // [{role, content, cards?, pending?}]
const scrollRef = ref(null)
const inputRef = ref(null)

const isLoggedIn = computed(() => userStore.isLoggedIn)

const suggestions = [
  '有什么自行车卖？',
  '帮我找找 100 块以内的教材',
  '我最近买的订单到哪了？',
  '怎么发布闲置？',
]

const canSend = computed(() =>
  aiEnabled.value &&
  isLoggedIn.value &&
  !sending.value &&
  inputText.value.trim().length > 0
)

const toolStatusText = {
  search_products: '正在搜索商品…',
  get_product_detail: '正在查看商品详情…',
  get_my_orders: '正在查询你的订单…',
  get_categories: '正在加载分类…',
}

onMounted(async () => {
  try {
    const res = await getAiStatus()
    aiEnabled.value = res.data?.enabled ?? false
  } catch {
    aiEnabled.value = false
  }
})

const toggleOpen = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) nextTick(autoResize)
}

const autoResize = () => {
  const el = document.querySelector('.ai-input')
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 100) + 'px'
}

const scrollBottom = () => {
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  })
}

const goProduct = (card) => {
  router.push(`/product/${card.id}`)
  isOpen.value = false
}

const onImgError = (e) => {
  e.target.style.display = 'none'
  const fallback = e.target.parentElement.querySelector('.card-img-fallback')
  if (!fallback) {
    const d = document.createElement('div')
    d.className = 'card-img-fallback'
    d.textContent = '📦'
    e.target.parentElement.appendChild(d)
  }
}

const handleEnter = () => {
  if (canSend.value) sendMessage()
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || !canSend.value) return

  inputText.value = ''
  nextTick(autoResize)

  messages.value.push({ role: 'user', content: text })
  messages.value.push({ role: 'assistant', content: '', pending: true, cards: [] })
  scrollBottom()

  const assistantMsg = messages.value[messages.value.length - 1]
  const controller = new AbortController()

  // 保留最近 20 条历史（不含最后这条空的 assistant 消息）
  const history = messages.value
    .slice(0, -1)
    .filter((m) => !m.pending && m.content)
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }))

  sending.value = true
  try {
    await chatStream({
      message: text,
      history,
      onEvent: (event) => {
        switch (event.type) {
          case 'delta':
            assistantMsg.pending = false
            assistantMsg.content += event.content
            toolStatus.value = ''
            scrollBottom()
            break
          case 'tool_start':
            toolStatus.value = toolStatusText[event.name] || '正在查询…'
            scrollBottom()
            break
          case 'cards':
            assistantMsg.cards.push(...(event.cards || []))
            scrollBottom()
            break
          case 'error':
            assistantMsg.pending = false
            assistantMsg.content = assistantMsg.content || `⚠️ ${event.message}`
            toolStatus.value = ''
            break
          case 'done':
            assistantMsg.pending = false
            toolStatus.value = ''
            break
        }
      },
      signal: controller.signal,
    })
  } catch (e) {
    if (e.name !== 'AbortError') {
      assistantMsg.pending = false
      assistantMsg.content = assistantMsg.content || `⚠️ ${e.message || '网络错误，请稍后重试'}`
    }
  } finally {
    assistantMsg.pending = false
    toolStatus.value = ''
    sending.value = false
    scrollBottom()
  }
}

const sendQuick = (text) => {
  inputText.value = text
  sendMessage()
}

const clearHistory = () => {
  if (sending.value) return
  messages.value = []
}
</script>

<style scoped>
/* ============ 悬浮球 ============ */
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-primary);
  z-index: 1000;
  transition: transform var(--transition-base) var(--ease-in-out), opacity var(--transition-base);
}
.ai-fab:hover {
  transform: scale(1.08);
}
.ai-fab.active {
  transform: rotate(90deg);
}
.fab-icon {
  width: 28px;
  height: 28px;
}

/* 移动端：给底部导航让位 */
@media (max-width: 768px) {
  .ai-fab {
    right: 16px;
    bottom: 84px;
    width: 50px;
    height: 50px;
  }
}

/* ============ 面板 ============ */
.ai-panel {
  position: fixed;
  right: 24px;
  bottom: 92px;
  width: 360px;
  max-width: calc(100vw - 32px);
  height: 520px;
  max-height: calc(100vh - 120px);
  background: var(--bg-white);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 1000;
  animation: panel-in 0.25s var(--ease-out);
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 768px) {
  .ai-panel {
    right: 16px;
    bottom: 84px;
    width: calc(100vw - 32px);
    height: min(520px, calc(100vh - 100px));
  }
}

/* 头部 */
.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--primary-gradient);
  color: #fff;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.header-title {
  font-weight: 600;
  font-size: 15px;
}
.header-sub {
  font-size: 12px;
  opacity: 0.85;
}
.header-sub.online::before {
  content: '●';
  margin-right: 4px;
  color: #6bff9e;
  font-size: 10px;
}
.clear-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-fast);
}
.clear-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.35);
}
.clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.clear-btn svg {
  width: 16px;
  height: 16px;
}

/* 消息区 */
.ai-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: var(--bg-gray);
}

/* 空状态 */
.empty-state,
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  flex: 1;
  padding: 20px;
}
.empty-icon {
  font-size: 40px;
}
.empty-state p {
  margin: 0;
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}
.empty-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  line-height: 1.5;
}
.login-btn {
  margin-top: 8px;
  padding: 8px 28px;
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-full);
  font-size: 14px;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.login-btn:hover {
  opacity: 0.85;
}

.welcome-text {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
  margin-bottom: 4px;
}
.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
.suggestion-chip {
  padding: 7px 14px;
  background: var(--bg-white);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.suggestion-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: #fff5f6;
}

/* 消息 */
.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.msg-row.user {
  justify-content: flex-end;
}
.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--bg-white);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}
.msg-bubble-wrap {
  max-width: 82%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.msg-bubble {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.65;
  word-break: break-word;
  white-space: pre-wrap;
}
.msg-row.assistant .msg-bubble {
  background: var(--bg-white);
  color: var(--text-primary);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
}
.msg-row.user .msg-bubble {
  background: var(--primary-gradient);
  color: #fff;
  border-top-right-radius: 4px;
}
.msg-bubble:empty {
  display: none;
}

/* 商品卡片 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.product-card {
  background: var(--bg-white);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-light);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.card-img-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--bg-dark);
  position: relative;
}
.card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-img-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: var(--bg-dark);
}
.card-body {
  padding: 8px 10px;
}
.card-title {
  font-size: 12.5px;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 35px;
}
.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
}
.card-price {
  color: var(--primary-color);
  font-weight: 700;
  font-size: 14px;
}
.card-cond {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 工具状态 */
.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  padding-left: 38px;
}
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 输入区 */
.ai-panel-footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--border-light);
  background: var(--bg-white);
  flex-shrink: 0;
}
.ai-input {
  flex: 1;
  resize: none;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 9px 12px;
  font-size: 14px;
  line-height: 1.5;
  max-height: 100px;
  outline: none;
  font-family: inherit;
  background: var(--bg-gray);
  transition: border-color var(--transition-fast);
}
.ai-input:focus {
  border-color: var(--primary-color);
  background: var(--bg-white);
}
.ai-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.send-btn {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border: none;
  border-radius: 50%;
  background: var(--primary-gradient);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}
.send-btn:hover:not(:disabled) {
  transform: scale(1.06);
}
.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.send-btn svg {
  width: 18px;
  height: 18px;
}
.ai-panel-tip {
  font-size: 10.5px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 0 12px 8px;
  background: var(--bg-white);
  flex-shrink: 0;
}
</style>
