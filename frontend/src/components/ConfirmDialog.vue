<template>
  <Transition name="modal">
    <div v-if="visible" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <div class="modal-icon" :class="iconType">
            <svg v-if="type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <svg v-else-if="type === 'danger'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg v-else-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <h3 class="modal-title">{{ title }}</h3>
        </div>
        
        <div class="modal-body">
          <p>{{ message }}</p>
        </div>
        
        <div class="modal-footer">
          <button 
            v-if="showCancel" 
            class="btn btn-cancel" 
            @click="handleCancel"
          >
            {{ cancelText }}
          </button>
          <button 
            class="btn btn-confirm" 
            :class="confirmButtonClass"
            @click="handleConfirm"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '提示'
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info', // info, warning, danger, success
    validator: (value) => ['info', 'warning', 'danger', 'success'].includes(value)
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  cancelText: {
    type: String,
    default: '取消'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  closeOnClickOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['confirm', 'cancel', 'close'])

const visible = ref(false)

const iconType = computed(() => {
  return `icon-${props.type}`
})

const confirmButtonClass = computed(() => {
  return `btn-${props.type}`
})

const show = () => {
  visible.value = true
}

const hide = () => {
  visible.value = false
}

const handleConfirm = () => {
  emit('confirm')
  hide()
}

const handleCancel = () => {
  emit('cancel')
  hide()
}

const handleOverlayClick = () => {
  if (props.closeOnClickOverlay) {
    handleCancel()
  }
}

defineExpose({
  show,
  hide
})
</script>

<style scoped>
/* 遮罩：深色纸面，不用模糊 */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--panel-deep) 62%, transparent);
}

/* 弹层：一张纸卡 */
.modal-container {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 22px;
  box-shadow: 7px 8px 0 var(--shadow);
  animation: modalIn 0.26s var(--fish-ease) both;
}

@keyframes modalIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.modal-icon {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  background: var(--cream-1);
}

.modal-icon svg {
  width: 24px;
  height: 24px;
}

.modal-icon.icon-info {
  background: var(--cream-1);
  border-color: var(--line-strong);
  color: var(--text-2);
}

.modal-icon.icon-warning {
  background: var(--warn-bg);
  border-color: var(--warn-text);
  color: var(--warn-text);
}

.modal-icon.icon-danger {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}

.modal-icon.icon-success {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
}

.modal-title {
  margin: 0;
  color: var(--ink);
  font-size: 21px;
  font-weight: 900;
  line-height: 1.25;
}

.modal-body {
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.7;
}

.modal-body p {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 底部：次级 + 主操作 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.btn {
  min-height: 44px;
  padding: 9px 22px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-cancel {
  background: var(--card);
  border: 2px solid var(--line-strong);
  color: var(--text-2);
}

.btn-cancel:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-cancel:active {
  transform: translateY(2px);
}

.btn-confirm {
  border: 2px solid var(--edge);
  box-shadow: 3px 4px 0 var(--shadow);
  background: var(--primary);
  color: var(--on-primary);
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-confirm:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

.btn-confirm.btn-danger {
  background: var(--danger);
  color: var(--on-primary);
}

.btn-confirm.btn-success {
  background: var(--success);
  color: var(--on-primary);
}

.btn-confirm.btn-info,
.btn-confirm.btn-warning {
  background: var(--primary);
  color: var(--on-primary);
}

/* 过渡 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s var(--fish-ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .modal-container {
    max-width: 100%;
    padding: 20px;
    border-radius: 18px;
  }
  .modal-icon { width: 48px; height: 48px; }
  .modal-icon svg { width: 22px; height: 22px; }
  .modal-title { font-size: 19px; }
  .modal-footer { flex-direction: column-reverse; }
  .btn { width: 100%; }
}
</style>
