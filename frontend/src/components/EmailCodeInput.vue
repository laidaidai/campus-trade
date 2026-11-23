<template>
  <div class="email-code-input">
    <div class="input-wrapper">
      <input
        v-model="localCode"
        type="text"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="6"
        @input="handleInput"
        class="code-input"
      />
      <button
        class="send-code-btn"
        :class="{ disabled: !canSend }"
        :disabled="!canSend"
        @click="handleSend"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  email: { type: String, required: true },
  type: { type: String, default: 'register' }, // 'register' | 'reset-password'
  placeholder: { type: String, default: '请输入验证码' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'send'])

const localCode = ref(props.modelValue)
const countdown = ref(0)
const sending = ref(false)

const canSend = computed(() => {
  return props.email && countdown.value === 0 && !sending.value && !props.disabled
})

const buttonText = computed(() => {
  if (sending.value) return '发送中...'
  if (countdown.value > 0) return `${countdown.value}秒`
  return '获取验证码'
})

const handleInput = () => {
  emit('update:modelValue', localCode.value)
}

const handleSend = async () => {
  if (!canSend.value) return
  
  sending.value = true
  
  try {
    await emit('send', props.email, props.type)
    
    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (error) {
    console.error('发送验证码失败:', error)
  } finally {
    sending.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  localCode.value = newVal
})
</script>

<style scoped>
.email-code-input {
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.code-input {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 11px 14px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  font-variant-numeric: tabular-nums;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.code-input::placeholder {
  color: var(--text-4);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.code-input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: 3px 4px 0 var(--shadow);
}

.code-input:disabled {
  background: var(--cream-2);
  color: var(--text-3);
  cursor: not-allowed;
}

.send-code-btn {
  flex-shrink: 0;
  min-width: 108px;
  min-height: 46px;
  padding: 9px 16px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 12px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.send-code-btn:hover:not(.disabled) {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.send-code-btn:active:not(.disabled) {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

.send-code-btn.disabled {
  background: var(--cream-2);
  border-color: var(--line-strong);
  box-shadow: none;
  color: var(--text-4);
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .input-wrapper { gap: 6px; }
  .code-input { min-height: 44px; padding: 10px 12px; font-size: 14px; }
  .send-code-btn { min-width: 92px; min-height: 44px; padding: 8px 10px; font-size: 11px; }
}
</style>
