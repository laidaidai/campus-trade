<template>
  <div class="order-message" :class="[`status-${orderData.status}`, { 'is-mine': isMine }]">
    <div class="order-header">
      <span class="order-title">订单信息</span>
      <span class="order-status-badge" :class="`status-${orderData.status}`">
        {{ getStatusText(orderData.status) }}
      </span>
    </div>

    <div class="order-content">
      <!-- 商品信息 -->
      <div class="product-info">
        <img 
          :src="getImageUrl(orderData.product_image)" 
          :alt="orderData.product_title" 
          class="product-image"
        />
        <div class="product-details">
          <h4 class="product-title">{{ orderData.product_title }}</h4>
          <div class="price-info">
            <span 
              v-if="orderData.final_price !== orderData.original_price" 
              class="original-price"
            >
              ¥{{ formatPrice(orderData.original_price) }}
            </span>
            <span class="final-price">¥{{ formatPrice(orderData.final_price) }}</span>
          </div>
        </div>
      </div>

      <!-- 地址信息 -->
      <div v-if="orderData.address_detail" class="address-info">
        <div class="info-label">收货地址</div>
        <div class="info-content">
          {{ formatAddress(orderData.address_detail) }}
        </div>
      </div>

      <!-- 备注信息 -->
      <div v-if="orderData.remark" class="remark-info">
        <div class="info-label">买家留言</div>
        <div class="info-content">{{ orderData.remark }}</div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="order-actions">
      <!-- 非最新订单，显示已过期提示 -->
      <template v-if="!isLatestOrder && orderData.status !== 'confirmed' && orderData.status !== 'rejected'">
        <span class="expired-text">订单已更新</span>
      </template>

      <!-- 卖家视图 -->
      <template v-else-if="isSeller && orderData.status === 'pending' && isLatestOrder">
        <button class="btn btn-secondary" @click="handleModifyPrice">
          修改价格
        </button>
        <button class="btn btn-primary" @click="handleConfirm">
          确认订单
        </button>
      </template>

      <!-- 买家视图 -->
      <template v-else-if="!isSeller && isLatestOrder">
        <!-- 待确认状态 -->
        <template v-if="orderData.status === 'pending' || orderData.status === 'modified'">
          <button class="btn btn-secondary" @click="handleCancel">
            取消
          </button>
          <button class="btn btn-primary" @click="handleBuyerConfirm">
            确认下单
          </button>
        </template>

        <!-- 已确认状态 -->
        <template v-else-if="orderData.status === 'confirmed' && orderData.order_id">
          <button class="btn btn-outline" @click="viewOrderDetail">
            查看订单
          </button>
        </template>
      </template>

      <!-- 已拒绝状态 -->
      <template v-if="orderData.status === 'rejected'">
        <span class="rejected-text">订单已取消</span>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getImageUrl } from '@/config'
import { formatPrice } from '@/utils/price'

const props = defineProps({
  orderData: {
    type: Object,
    required: true
  },
  isMine: {
    type: Boolean,
    default: false
  },
  isSeller: {
    type: Boolean,
    default: false
  },
  isLatestOrder: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['modify-price', 'confirm', 'cancel', 'buyer-confirm', 'view-order'])

// 状态文本映射
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待确认',
    'modified': '价格已修改',
    'confirmed': '已确认',
    'rejected': '已取消'
  }
  return statusMap[status] || status
}

// 格式化地址
const formatAddress = (address) => {
  if (typeof address === 'string') {
    return address
  }
  return `${address.province} ${address.city} ${address.district} ${address.detail} (${address.name} ${address.phone})`
}

// 事件处理
const handleModifyPrice = () => {
  emit('modify-price', props.orderData)
}

const handleConfirm = () => {
  emit('confirm', props.orderData)
}

const handleCancel = () => {
  emit('cancel', props.orderData)
}

const handleBuyerConfirm = () => {
  emit('buyer-confirm', props.orderData)
}

const viewOrderDetail = () => {
  emit('view-order', props.orderData.order_id)
}
</script>

<style scoped>
/* 聊天流里的订单卡：纸卡 + 墨线，状态用实线徽章 */
.order-message {
  width: 100%;
  max-width: 340px;
  padding: 12px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 3px 4px 0 var(--shadow-soft);
}

.order-message.is-mine {
  background: var(--cream-1);
}

.order-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line);
}

.order-title {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.order-status-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.status-pending,
.status-modified {
  background: var(--warn-bg);
  border-color: var(--warn-text);
  color: var(--warn-text);
}

.status-confirmed {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
}

.status-rejected {
  background: var(--cream-2);
  border-color: var(--line-strong);
  color: var(--text-3);
}

.order-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-info {
  display: flex;
  gap: 10px;
}

.product-image {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--cream-2);
}

.product-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.product-title {
  margin: 0;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.original-price {
  color: var(--text-4);
  font-size: 11px;
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.final-price {
  color: var(--primary-2);
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.address-info,
.remark-info {
  padding: 9px 10px;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 14px;
}

.info-label {
  margin-bottom: 3px;
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.info-content {
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.btn {
  flex: 1;
  min-width: 96px;
  min-height: 38px;
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 12px;
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

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.btn-outline {
  background: var(--card);
  border: 2px solid var(--primary-2);
  color: var(--primary-2);
}

.btn-outline:hover {
  background: var(--primary);
  border-color: var(--edge);
  color: var(--on-primary);
}

.expired-text,
.rejected-text {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
}

@media (max-width: 767px) {
  .order-message {
    max-width: 100%;
    padding: 10px;
  }
  .product-image { width: 48px; height: 48px; }
  .btn { min-width: 0; min-height: 36px; }
}
</style>
