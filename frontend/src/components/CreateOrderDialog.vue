<template>
  <div v-if="visible" class="dialog-overlay" @click="handleClose">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>发起订单</h3>
        <button class="close-btn" @click="handleClose">×</button>
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

        <!-- 地址选择 -->
        <div class="form-section">
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
            placeholder="选填,可以说明购买意向或其他要求"
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
          :disabled="!selectedAddressId || submitting"
        >
          {{ submitting ? '发送中...' : '发送订单' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
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
const remark = ref('')
const submitting = ref(false)

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
  if (!selectedAddressId.value) {
    toast.warning('请选择收货地址')
    return
  }

  submitting.value = true

  emit('submit', {
    address_id: selectedAddressId.value,
    address_detail: selectedAddress.value,
    remark: remark.value
  })

  // 重置状态会在父组件关闭对话框时自动执行
}

// 关闭对话框
const handleClose = () => {
  emit('close')
  // 重置表单
  setTimeout(() => {
    selectedAddressId.value = null
    selectedAddress.value = null
    remark.value = ''
    submitting.value = false
  }, 300)
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
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
  border: 2px solid var(--edge);
  border-radius: 22px;
  box-shadow: 7px 8px 0 var(--shadow);
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
  border-bottom: 2px solid var(--line-2);
}

.dialog-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 900;
}

.close-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
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
  border: 2px solid var(--line-strong);
  border-radius: 14px;
}

.product-image {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  object-fit: cover;
  border: 2px solid var(--edge);
  border-radius: 10px;
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
  font-weight: 900;
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

.btn-add-address {
  min-height: 32px;
  padding: 5px 13px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.btn-add-address:hover {
  border-color: var(--edge);
  color: var(--ink);
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 11px 12px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.form-select {
  min-height: 44px;
  cursor: pointer;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: 3px 4px 0 var(--shadow);
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
  border: 2px solid var(--line);
  border-radius: 12px;
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
  border: 2px solid var(--line);
  border-radius: 12px;
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
  border: 2px solid var(--edge);
  border-radius: 999px;
  color: var(--primary-2);
  font-size: 12px;
  font-weight: 900;
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
  border-top: 2px solid var(--line-2);
}

.btn {
  flex: 1;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--card);
  border: 2px solid var(--line-strong);
  color: var(--text-2);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-primary {
  background: var(--primary);
  border: 2px solid var(--edge);
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

@media (max-width: 768px) {
  .dialog-overlay { padding: 0; align-items: flex-end; }
  .dialog-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 20px 20px 0 0;
    border-bottom: none;
    box-shadow: 0 -4px 0 var(--shadow);
  }
  .dialog-header { padding: 16px 18px; }
  .dialog-body { padding: 16px 18px; }
  .dialog-footer { padding: 14px 18px; }
}
</style>
