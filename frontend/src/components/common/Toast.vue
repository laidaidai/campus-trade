<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" class="toast-container" :class="`toast-${type}`">
        <div class="toast-content">
          <div class="toast-icon">
            <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div class="toast-message">{{ message }}</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)
let timer = null

const show = () => {
  visible.value = true
  if (timer) clearTimeout(timer)
  
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
    }, props.duration)
  }
}

const close = () => {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 300)
}

// 自动显示
watch(() => props.message, () => {
  if (props.message) {
    show()
  }
}, { immediate: true })

defineExpose({ show, close })
</script>

<style scoped>
/* 纸卡提示条：墨线 + 左侧语义实线 */
.toast-container {
  position: fixed;
  top: 88px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 280px;
  max-width: min(520px, calc(100vw - 32px));
  padding: 12px 16px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  box-shadow: none;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
}

.toast-icon svg {
  width: 100%;
  height: 100%;
}

.toast-message {
  flex: 1;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  word-break: break-word;
}

.toast-success { border-color: var(--success); }
.toast-success .toast-icon { color: var(--success); }

.toast-error { border-color: var(--danger); }
.toast-error .toast-icon { color: var(--danger); }

.toast-warning { border-color: var(--warn-text); }
.toast-warning .toast-icon { color: var(--warn-text); }

.toast-info { border-color: var(--primary); }
.toast-info .toast-icon { color: var(--primary); }

/* 过渡 */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.26s var(--fish-ease), transform 0.26s var(--fish-ease);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-14px) scale(0.97);
}

@media (max-width: 767px) {
  .toast-container {
    top: 16px;
    left: 12px;
    right: 12px;
    min-width: 0;
    max-width: none;
    transform: none;
  }
  .toast-enter-from,
  .toast-leave-to { transform: translateY(-14px) scale(0.97); }
}
</style>
