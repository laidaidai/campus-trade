<template>
  <div v-if="visible" class="dialog-overlay" @click="handleClose">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>发起交易</h3>
        <button class="close-btn" @click="handleClose" aria-label="关闭">×</button>
      </div>

      <div class="dialog-body">
        <!-- 商品信息 -->
        <div class="product-section">
          <img 
            :src="getImageUrl(product.image)" 
            :alt="product.title" 
            class="product-image"
          />
          <div class="product-info">
            <h4 class="product-title">{{ product.title }}</h4>
            <p class="product-price">¥{{ formatPrice(product.price) }}</p>
          </div>
        </div>

        <!-- 交易方式 -->
        <div class="form-section">
          <label class="form-label">交易方式</label>
          <div class="mode-switch" role="group" aria-label="交易方式">
            <button
              type="button"
              :class="['mode-btn', { active: deliveryMode === 'meetup' }]"
              @click="deliveryMode = 'meetup'"
            >
              面交
            </button>
            <button
              type="button"
              :class="['mode-btn', { active: deliveryMode === 'shipping' }]"
              @click="deliveryMode = 'shipping'"
            >
              邮寄
            </button>
          </div>
        </div>

        <!-- 面交信息 -->
        <div v-if="deliveryMode === 'meetup'" class="form-section">
          <label class="form-label" for="meetup-place">面交地点 *</label>
          <input
            id="meetup-place"
            v-model="meetupPlace"
            type="text"
            class="form-input"
            placeholder="如：图书馆南门"
            maxlength="200"
          />
          <label class="form-label" for="meetup-time">面交时间</label>
          <input
            id="meetup-time"
            v-model="meetupTime"
            type="text"
            class="form-input"
            placeholder="如：周五 18:30"
            maxlength="100"
          />
        </div>

        <!-- 地址选择 -->
        <div v-if="deliveryMode === 'shipping'" class="form-section">
          <div class="form-label-row">
            <label class="form-label">收货地址 *</label>
            <button 
              type="button" 
              class="btn-add-address" 
              @click="goToAddressManagement"
            >
              + 新增地址
            </button>
          </div>
          <select 
            v-model="selectedAddressId" 
            class="form-select"
            @change="handleAddressChange"
          >
            <option :value="null">请选择收货地址</option>
            <option 
              v-for="addr in addresses" 
              :key="addr.id" 
              :value="addr.id"
            >
              {{ formatAddressShort(addr) }}
            </option>
          </select>

          <!-- 显示选中地址的完整信息 -->
          <div v-if="selectedAddress" class="selected-address-detail">
            <div class="address-detail-row">
              <span class="label">收货人：</span>
              <span class="value">{{ selectedAddress.name }} {{ selectedAddress.phone }}</span>
            </div>
            <div class="address-detail-row">
              <span class="label">地址：</span>
              <span class="value">{{ selectedAddress.province }} {{ selectedAddress.city }} {{ selectedAddress.district }} {{ selectedAddress.detail }}</span>
            </div>
          </div>

          <div v-if="addresses.length === 0" class="empty-address">
            <p>还没有收货地址</p>
            <button class="btn-link" @click="goToAddressManagement">
              立即添加
            </button>
          </div>
        </div>

        <!-- 买家留言 -->
        <div class="form-section">
          <label class="form-label">买家留言</label>
          <textarea 
            v-model="remark"
            class="form-textarea"
            placeholder="选填，可以说明购买意向或其他要求"
            rows="3"
            maxlength="200"
          ></textarea>
          <div class="char-count">{{ remark.length }}/200</div>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleClose">
          取消
        </button>
        <button 
          class="btn btn-primary" 
          @click="handleSubmit"
          :disabled="!canSubmit || submitting"
        >
          {{ submitting ? '发送中...' : '发送交易请求' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { getImageUrl } from '@/config'
import { getMyAddresses } from '@/api/address'
import toast from '@/utils/toast'
import { useRouter } from 'vue-router'
import { formatPrice } from '@/utils/price'

const router = useRouter()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  product: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'submit'])

const addresses = ref([])
const selectedAddressId = ref(null)
const selectedAddress = ref(null)
const deliveryMode = ref('meetup')
const meetupPlace = ref('')
const meetupTime = ref('')
const remark = ref('')
const submitting = ref(false)

const canSubmit = computed(() => {
  if (deliveryMode.value === 'meetup') {
    return Boolean(meetupPlace.value.trim())
  }
  return Boolean(selectedAddressId.value)
})

// 获取地址列表
const fetchAddresses = async () => {
  try {
    const response = await getMyAddresses()
    if (response.success) {
      addresses.value = response.data
      
      // 默认选择默认地址
      const defaultAddr = addresses.value.find(addr => addr.is_default)
      if (defaultAddr) {
        selectedAddressId.value = defaultAddr.id
        selectedAddress.value = defaultAddr
      }
    }
  } catch (error) {
    console.error('获取地址列表失败:', error)
  }
}

// 格式化地址显示（完整）
const formatAddress = (addr) => {
  return `${addr.province} ${addr.city} ${addr.district} ${addr.detail} (${addr.name} ${addr.phone})`
}

// 格式化地址显示（简短，用于下拉框）
const formatAddressShort = (addr) => {
  return `${addr.name} - ${addr.province}${addr.city}${addr.district}`
}

// 地址变更
const handleAddressChange = () => {
  selectedAddress.value = addresses.value.find(addr => addr.id === selectedAddressId.value)
}

// 跳转到地址管理
const goToAddressManagement = () => {
  handleClose()
  router.push('/profile?tab=addresses')
}

// 提交订单
const handleSubmit = () => {
  if (deliveryMode.value === 'meetup' && !meetupPlace.value.trim()) {
    toast.warning('请填写面交地点')
    return
  }
  if (deliveryMode.value === 'shipping' && !selectedAddressId.value) {
    toast.warning('请选择收货地址')
    return
  }

  submitting.value = true

  emit('submit', {
    delivery_mode: deliveryMode.value,
    meetup_place: deliveryMode.value === 'meetup' ? meetupPlace.value.trim() : null,
    meetup_time: deliveryMode.value === 'meetup' ? meetupTime.value.trim() : null,
    address_id: deliveryMode.value === 'shipping' ? selectedAddressId.value : null,
    address_detail: deliveryMode.value === 'shipping' ? selectedAddress.value : null,
    remark: remark.value
  })

  // 重置状态会在父组件关闭对话框时自动执行
}

// 关闭对话框
const handleClose = () => {
  emit('close')
  // 重置表单
  setTimeout(() => {
    deliveryMode.value = 'meetup'
    selectedAddressId.value = null
    selectedAddress.value = null
    meetupPlace.value = ''
    meetupTime.value = ''
    remark.value = ''
    submitting.value = false
  }, 300)
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    deliveryMode.value = 'meetup'
    submitting.value = false
    fetchAddresses()
  }
})

onMounted(() => {
  if (props.visible) {
    fetchAddresses()
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
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 48px);
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: var(--shadow-soft);
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
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.close-btn:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--on-panel);
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* 商品摘要 */
.product-section {
  display: flex;
  gap: 14px;
  padding: 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
}

.product-image {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 3px;
}

.product-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.product-title {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  margin: 0;
  color: var(--primary-2);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.form-label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 4px;
}

.mode-btn {
  min-height: 42px;
  padding: 8px 14px;
  background: var(--cream-1);
  border: 0;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.mode-btn + .mode-btn {
  border-left: 1px solid var(--line-strong);
}

.mode-btn.active {
  background: var(--primary);
  color: var(--on-primary);
}

.mode-btn:not(.active):hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-add-address {
  min-height: 32px;
  padding: 5px 13px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.btn-add-address:hover {
  border-color: var(--edge);
  color: var(--ink);
}

.form-select,
.form-input,
.form-textarea {
  width: 100%;
  padding: 11px 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.form-select,
.form-input {
  min-height: 44px;
}

.form-select {
  cursor: pointer;
}

.form-select:focus,
.form-input:focus,
.form-textarea:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.form-textarea {
  min-height: 84px;
  resize: vertical;
  line-height: 1.6;
}

.char-count {
  align-self: flex-end;
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.selected-address-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.address-detail-row {
  display: flex;
  gap: 4px;
  font-size: 12px;
  line-height: 1.6;
}

.address-detail-row .label {
  flex-shrink: 0;
  color: var(--text-3);
  font-weight: 700;
}

.address-detail-row .value {
  color: var(--text-2);
  word-break: break-word;
}

.empty-address {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.empty-address p {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
}

.btn-link {
  flex-shrink: 0;
  min-height: 34px;
  padding: 6px 14px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--primary-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-link:hover {
  background: var(--primary);
  color: var(--on-primary);
  border-color: var(--edge);
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
  border-radius: 3px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), border-color 0.2s var(--fish-ease);
}

.btn:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--card);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  box-shadow: none;
  color: var(--on-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-2);
  border-color: var(--primary-2);
  transform: none;
}

.btn-primary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: var(--shadow-soft);
}

@media (max-width: 767px) {
  .close-btn { width: 44px; height: 44px; }
  .btn-add-address { min-height: 44px; }
  .dialog-overlay { padding: 0; align-items: flex-end; }
  .dialog-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 6px 20px 0 0;
    border-bottom: none;
    box-shadow: 0 -10px 28px rgba(42,29,20,.10);
  }
  .dialog-header { padding: 16px 18px; }
  .dialog-body { padding: 16px 18px; }
  .dialog-footer { flex-direction: column; gap: 9px; padding: 14px 18px calc(14px + env(safe-area-inset-bottom, 0px)); }
}
</style>
