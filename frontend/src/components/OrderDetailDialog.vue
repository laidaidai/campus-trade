<template>
  <teleport to="body">
    <transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click="handleClose">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>订单详情</h3>
            <button class="close-btn" @click="handleClose">×</button>
          </div>

          <div class="dialog-body">
            <!-- 商品信息 -->
            <div class="section">
              <h4 class="section-title">商品信息</h4>
              <div class="product-info">
                <img 
                  :src="getImageUrl(order.product_image)" 
                  :alt="order.product_title"
                  class="product-image"
                />
                <div class="product-details">
                  <h5>{{ order.product_title }}</h5>
                  <p class="price">¥{{ formatPrice(order.price) }}</p>
                </div>
              </div>
            </div>

            <!-- 收货地址 -->
            <div v-if="order.address_full || order.address_detail || order.address_name" class="section">
              <h4 class="section-title">收货地址</h4>
              <div class="address-info">
                <p v-if="order.address_name || order.address_phone"><strong>收货人：</strong>{{ order.address_name }} <span v-if="order.address_phone">{{ order.address_phone }}</span></p>
                <p v-if="order.address_full"><strong>地址：</strong>{{ order.address_full }}</p>
                <p v-else-if="order.address_detail"><strong>地址：</strong>{{ order.address_detail }}</p>
              </div>
            </div>

            <!-- 备注信息 -->
            <div v-if="order.remark" class="section">
              <h4 class="section-title">买家留言</h4>
              <p class="remark">{{ order.remark }}</p>
            </div>

            <!-- 订单状态 -->
            <div class="section">
              <h4 class="section-title">订单状态</h4>
              <span class="status-badge" :class="`status-${order.status}`">
                {{ getStatusText(order.status) }}
              </span>
            </div>

            <!-- 时间信息 -->
            <div class="section">
              <h4 class="section-title">时间信息</h4>
              <div class="time-info">
                <p><strong>创建时间：</strong>{{ formatTime(order.created_at) }}</p>
                <p v-if="order.paid_at"><strong>付款时间：</strong>{{ formatTime(order.paid_at) }}</p>
                <p v-if="order.shipped_at"><strong>发货时间：</strong>{{ formatTime(order.shipped_at) }}</p>
                <p v-if="order.completed_at"><strong>完成时间：</strong>{{ formatTime(order.completed_at) }}</p>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click="handleClose">关闭</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { getImageUrl } from '@/config'
import { formatPrice } from '@/utils/price'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const handleClose = () => {
  emit('close')
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待付款',
    'paid': '已付款',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

const formatTime = (time) => {
  if (!time) return '-'
  const date = new Date(time)
  return date.toLocaleString('zh-CN', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
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
  max-width: 520px;
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
}

.close-btn:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--on-panel);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 22px 18px;
}

.section {
  padding: 16px 0;
  border-bottom: 2px solid var(--line);
}

.section:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}

.section-title {
  margin: 0 0 10px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.product-info {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 14px;
}

.product-image {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  object-fit: cover;
  border: 2px solid var(--edge);
  border-radius: 10px;
}

.product-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.product-details h5 {
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

.price {
  margin: 0;
  color: var(--primary-2);
  font-size: 20px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.address-info,
.time-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-info p,
.time-info p {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-word;
}

.address-info strong,
.time-info strong {
  color: var(--text-3);
  font-weight: 700;
}

.time-info p {
  font-variant-numeric: tabular-nums;
}

.remark {
  margin: 0;
  padding: 12px 14px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 状态：实线徽章 */
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 4px 14px;
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.status-pending {
  background: var(--warn-bg);
  border-color: var(--warn-text);
  color: var(--warn-text);
}

.status-paid,
.status-shipped {
  background: var(--primary-3);
  border-color: var(--primary-2);
  color: var(--primary-2);
}

.status-completed {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
}

.status-cancelled {
  background: var(--cream-2);
  border-color: var(--line-strong);
  color: var(--text-3);
}

.dialog-footer {
  padding: 14px 22px;
  border-top: 2px solid var(--line-2);
}

.btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}

.btn-secondary {
  background: var(--card);
  border: 2px solid var(--line-strong);
  color: var(--text-2);
}

.btn-secondary:hover {
  background: var(--cream-2);
  color: var(--ink);
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
  .dialog-body { padding: 4px 18px 14px; }
  .dialog-footer { padding: 12px 18px; }
}
</style>
