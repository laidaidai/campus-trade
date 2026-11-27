<template>
  <!-- 聊天面板 -->
  <div v-if="isOpen" class="ai-panel" @click.stop>
    <!-- 头部 -->
    <div class="ai-panel-header">
      <div class="header-left">
        <div class="avatar-sm">易</div>
        <div>
          <div class="header-title">小易</div>
          <div class="header-sub" :class="{ online: aiEnabled }">
            {{ aiEnabled ? '帮你找闲置、查订单' : '暂未启用' }}
          </div>
        </div>
      </div>
      <div class="panel-actions">
        <button class="clear-btn" title="清空对话" aria-label="清空对话" @click="clearHistory" :disabled="messages.length === 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>
        <button class="panel-close" title="关闭助手" aria-label="关闭助手" @click="isOpen = false">×</button>
      </div>
    </div>

    <!-- 消息区 -->
    <div ref="scrollRef" class="ai-panel-body">
      <!-- 未启用 -->
      <div v-if="!aiEnabled" class="empty-state">
        <p class="empty-title">助手暂未启用</p>
      </div>

      <!-- 未登录 -->
      <div v-else-if="!isLoggedIn" class="empty-state">
        <p class="empty-title">登录后可使用</p>
        <button class="login-btn" @click="$router.push('/auth')">去登录</button>
      </div>

      <!-- 欢迎语 -->
      <div v-else-if="messages.length === 0" class="welcome">
        <p class="welcome-text">你好，我是小易</p>
        <div class="suggestion-list">
          <button v-for="s in suggestions" :key="s" class="suggestion-chip" @click="sendQuick(s)">
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 对话 -->
      <template v-else>
        <div v-for="(msg, i) in messages" :key="i" class="msg-row" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="msg-avatar">AI</div>
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
                  <div v-else class="card-img-fallback"></div>
                </div>
                <div class="card-body">
                  <div class="card-title">{{ card.title }}</div>
                  <div class="card-meta">
                    <span class="card-price">¥{{ formatPrice(card.price) }}</span>
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
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAiStatus, chatStream } from '@/api/ai'
import { getImageUrl } from '@/config'
import { useUserStore } from '@/stores/user'
import { formatPrice } from '@/utils/price'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
watch(() => route.path, () => { isOpen.value = false })

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

const openAssistant = () => {
  isOpen.value = true
  nextTick(autoResize)
}

onMounted(async () => {
  window.addEventListener('open-ai-assistant', openAssistant)
  try {
    const res = await getAiStatus()
    aiEnabled.value = res.data?.enabled ?? false
  } catch {
    aiEnabled.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('open-ai-assistant', openAssistant)
})

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
    d.textContent = ''
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
            assistantMsg.content = assistantMsg.content || `${event.message}`
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
      assistantMsg.content = assistantMsg.content || `${e.message || '网络错误，请稍后重试'}`
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
/* 悬浮球：主色圆 + 墨线硬影 */
/* 面板：纸卡 */
.ai-panel {
  position: fixed;
  top: calc(76px + env(safe-area-inset-top, 0px) + 16px);
  right: 28px;
  z-index: 9998;
  display: flex;
  flex-direction: column;
  width: 380px;
  height: min(560px, calc(100vh - 124px - env(safe-area-inset-top, 0px)));
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 16px 40px rgba(42, 29, 20, 0.12);
  animation: panelIn 0.26s var(--fish-ease) both;
}

@keyframes panelIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.avatar-sm {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 3px;
  color: var(--on-panel);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.header-title {
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.header-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  color: var(--text-4);
  font-size: 11px;
  font-weight: 700;
}

.header-sub.online {
  color: var(--success);
}

.header-sub.online::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 999px;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.panel-close {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: 3px;
  color: var(--text-3);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.panel-close:hover { background: var(--cream-1); color: var(--ink); }

.clear-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-3);
  cursor: pointer;
}

.clear-btn:hover:not(:disabled) {
  background: var(--cream-2);
  color: var(--ink);
}

.clear-btn:disabled {
  opacity: 0.45;
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
  gap: 12px;
}

.empty-state,
.welcome {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 12px;
  text-align: center;
}

.empty-title {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 800;
}

.login-btn {
  min-height: 38px;
  padding: 8px 20px;
  background: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 3px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.login-btn:hover {
  transform: translateY(-1px);
}

.welcome-text {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.suggestion-chip {
  min-height: 34px;
  padding: 6px 12px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.suggestion-chip:hover {
  background: var(--primary);
  border-color: var(--edge);
  color: var(--on-primary);
}

/* 对话 */
.msg-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.msg-row.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 3px;
  color: var(--on-panel);
  font-size: 11px;
  font-weight: 700;
}

.msg-bubble-wrap {
  min-width: 0;
  max-width: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg-row.user .msg-bubble-wrap {
  align-items: flex-end;
}

.msg-bubble {
  padding: 9px 13px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.65;
  word-break: break-word;
  white-space: pre-wrap;
}

.msg-row.assistant .msg-bubble {
  border-top-left-radius: 6px;
}

.msg-row.user .msg-bubble {
  background: var(--primary);
  border-color: var(--edge);
  color: var(--on-primary);
  border-top-right-radius: 6px;
}

.msg-bubble:empty { display: none; }

/* 商品卡 */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
}

.product-card {
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s var(--fish-ease), box-shadow 0.2s var(--fish-ease);
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.card-img-wrap {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 1px solid var(--line);
}

.card-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-img-fallback {
  width: 100%;
  height: 100%;
  background: var(--cream-2);
}

.card-body {
  padding: 7px 8px 8px;
}

.card-title {
  margin-bottom: 4px;
  color: var(--ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
}

.card-price {
  color: var(--primary-2);
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.card-cond {
  color: var(--text-4);
  font-size: 11px;
  white-space: nowrap;
}

/* 状态 / 输入 */
.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-3);
  font-size: 12px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 1px solid var(--line);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-panel-footer {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 12px 14px 8px;
  border-top: 1px solid var(--line);
}

.ai-input {
  flex: 1;
  min-height: 42px;
  max-height: 110px;
  padding: 10px 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  transition: border-color 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.ai-input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.ai-input:disabled {
  background: var(--cream-2);
  cursor: not-allowed;
}

.send-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  cursor: pointer;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.send-btn:disabled {
  background: var(--cream-2);
  border-color: var(--line-strong);
  box-shadow: none;
  color: var(--text-4);
  cursor: not-allowed;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.ai-panel-tip {
  padding: 0 14px 10px;
  color: var(--text-4);
  font-size: 11px;
  line-height: 1.4;
}

@media (max-height: 520px) and (orientation: landscape) {
  .ai-panel { display: none; }
}

@media (max-width: 767px) {
  .ai-panel {
    top: calc(62px + env(safe-area-inset-top, 0px) + 8px);
    right: 12px;
    left: 12px;
    width: auto;
    height: calc(100dvh - 62px - env(safe-area-inset-top, 0px) - var(--mobile-nav-space) - 16px);
  }
  .panel-close { width: 44px; height: 44px; }
}
</style>
