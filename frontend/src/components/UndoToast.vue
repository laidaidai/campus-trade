<template>
  <Transition name="slide-up">
    <div v-if="visible" class="undo-toast">
      <span class="message">{{ message }}</span>
      <button class="undo-btn" @click="handleUndo">撤回</button>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: '已删除'
  },
  duration: {
    type: Number,
    default: 4000
  }
})

const emit = defineEmits(['undo'])

const visible = ref(false)
let timer = null

const show = () => {
  visible.value = true
  
  // 清除之前的定时器
  if (timer) {
    clearTimeout(timer)
  }
  
  // 设置自动隐藏
  timer = setTimeout(() => {
    hide()
  }, props.duration)
}

const hide = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const handleUndo = () => {
  emit('undo')
  hide()
}

// 暴露方法给父组件
defineExpose({
  show,
  hide
})
</script>

<style scoped>
.undo-toast {
  position: fixed;
  left: 50%;
  bottom: 32px;
  z-index: 9999;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 280px;
  max-width: min(520px, calc(100vw - 32px));
  padding: 12px 14px 12px 18px;
  background: var(--panel);
  color: var(--on-panel);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-soft);
}

.message {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.undo-btn {
  flex-shrink: 0;
  min-height: 36px;
  padding: 6px 16px;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.undo-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.undo-btn:active {
  transform: translateY(2px);
  box-shadow: var(--shadow-soft);
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.26s var(--fish-ease), transform 0.26s var(--fish-ease);
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@media (max-width: 767px) {
  .undo-toast {
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    left: 12px;
    right: 12px;
    min-width: 0;
    max-width: none;
    transform: none;
  }
  .slide-up-enter-from,
  .slide-up-leave-to {
    transform: translateY(16px);
  }
}
</style>
