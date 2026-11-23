<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-icon">
        <Icon :name="iconName" />
      </div>
      <h1 class="error-title">{{ title }}</h1>
      <p class="error-message">{{ message }}</p>
      <div class="error-actions">
        <button 
          v-if="showRetry" 
          @click="handleRetry" 
          class="btn-retry"
        >
          重试
        </button>
        <button 
          @click="handleGoHome" 
          class="btn-home"
        >
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const props = defineProps({
  type: {
    type: String,
    default: 'token-expired', // token-expired, network-error, server-error, not-found
    validator: (value) => ['token-expired', 'network-error', 'server-error', 'not-found'].includes(value)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  showRetry: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['retry'])

const router = useRouter()

const errorConfig = {
  'token-expired': {
    icon: 'alert-triangle',
    title: '登录已过期',
    message: '您的登录状态已过期，请重新登录'
  },
  'network-error': {
    icon: 'wifi-off',
    title: '网络连接失败',
    message: '请检查网络连接后重试'
  },
  'server-error': {
    icon: 'server',
    title: '服务器错误',
    message: '服务器暂时无法响应，请稍后重试'
  },
  'not-found': {
    icon: 'search',
    title: '页面不存在',
    message: '您访问的页面不存在或已被删除'
  }
}

const config = computed(() => errorConfig[props.type])

const iconName = computed(() => props.title ? 'alert-triangle' : config.value.icon)
const title = computed(() => props.title || config.value.title)
const message = computed(() => props.message || config.value.message)

const handleRetry = () => {
  emit('retry')
}

const handleGoHome = () => {
  if (props.type === 'token-expired') {
    // 清除认证数据
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    router.push('/auth')
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 24px;
  background: var(--bg);
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 520px;
  text-align: center;
}

/* 实线圆 + 墨线图标，不用插画 */
.error-icon {
  width: 104px;
  height: 104px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 5px 6px 0 var(--shadow);
  color: var(--text-2);
}

.error-icon :deep(svg) {
  width: 40px;
  height: 40px;
}

.error-title {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 30px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.error-message {
  margin: 0;
  max-width: 400px;
  color: var(--text-3);
  font-size: 14px;
  line-height: 1.7;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}

.btn-retry,
.btn-home {
  min-height: 46px;
  padding: 10px 28px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-retry {
  background: var(--card);
  border: 2px solid var(--line-strong);
  color: var(--text-2);
}

.btn-retry:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-home {
  background: var(--primary);
  border: 2px solid var(--edge);
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
}

.btn-home:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-home:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

@media (max-width: 767px) {
  .error-icon { width: 88px; height: 88px; }
  .error-icon :deep(svg) { width: 34px; height: 34px; }
  .error-title { font-size: 24px; }
  .error-actions { flex-direction: column; width: 100%; max-width: 280px; }
  .btn-retry, .btn-home { width: 100%; }
}
</style>
