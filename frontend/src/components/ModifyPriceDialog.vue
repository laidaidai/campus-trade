<template>
  <div v-if="visible" class="dialog-overlay" @click="handleClose">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>修改订单价格</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>

      <div class="dialog-body">
        <!-- 原价 -->
        <div class="price-item">
          <label class="price-label">商品原价</label>
          <div class="price-value original">¥{{ orderData?.original_price || 0 }}</div>
        </div>

        <!-- 新价格 -->
        <div class="form-section">
          <label class="form-label">修改后价格 *</label>
          <div class="price-input-wrapper">
            <span class="price-symbol">¥</span>
            <input 
              type="number"
              v-model="newPrice"
              class="price-input"
              placeholder="请输入新价格"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleClose">
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleSubmit"
          :disabled="!isValidPrice || submitting"
        >
          {{ submitting ? '发送中...' : '确认修改' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  orderData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'submit'])

const newPrice = ref('')
const submitting = ref(false)

// 验证价格
const isValidPrice = computed(() => {
  const price = parseFloat(newPrice.value)
  return !isNaN(price) && price > 0
})

// 提交
const handleSubmit = () => {
  if (!isValidPrice.value) {
    return
  }

  submitting.value = true
  
  emit('submit', {
    new_price: parseFloat(newPrice.value)
  })

  // 重置会在关闭时处理
}

// 关闭
const handleClose = () => {
  emit('close')
  setTimeout(() => {
    newPrice.value = ''
    submitting.value = false
  }, 300)
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.orderData) {
    // 默认使用当前价格
    newPrice.value = props.orderData.final_price || props.orderData.original_price || ''
  }
})
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--panel-deep) 62%, transparent);
}

.dialog-content {
  width: 100%;
  max-width: 440px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
  animation: dialogIn 0.26s var(--fish-ease) both;
}

@keyframes dialogIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--line);
}

.dialog-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 19px;
  font-weight: 700;
}

.close-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--on-panel);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 22px;
}

/* 原价 */
.price-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 18px;
}

.price-label {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.price-value {
  color: var(--ink);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.price-value.original {
  color: var(--text-2);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.price-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.price-input-wrapper:focus-within {
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.price-symbol {
  color: var(--text-3);
  font-size: 18px;
  font-weight: 700;
}

.price-input {
  flex: 1;
  width: 100%;
  min-height: 44px;
  padding: 10px 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ink);
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  font-family: inherit;
}

.price-input::placeholder {
  color: var(--text-4);
  font-size: 14px;
  font-weight: 500;
}

.price-input::-webkit-outer-spin-button,
.price-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  padding: 16px 22px;
  border-top: 1px solid var(--line);
}

.btn {
  flex: 1;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-secondary {
  background: var(--card);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
}

.btn-secondary:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-primary {
  background: var(--primary);
  border: 1px solid var(--line);
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.btn-primary:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .close-btn { width: 44px; height: 44px; }
  .dialog-overlay { padding: 0; align-items: flex-end; }
  .dialog-content {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    border-bottom: none;
    box-shadow: 0 -10px 28px rgba(63,61,86,.10);
  }
  .dialog-header { padding: 16px 18px; }
  .dialog-body { padding: 16px 18px; }
  .dialog-footer { flex-direction: column; gap: 9px; padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px)); }
}
</style>
