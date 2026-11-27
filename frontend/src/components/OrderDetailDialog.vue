<template>
  <teleport to="body">
    <transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click="handleClose">
        <div class="dialog-content" @click.stop>
          <div class="dialog-header">
            <h3>订单详情</h3>
            <button class="close-btn" @click="handleClose" aria-label="关闭">×</button>
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

            <!-- 交易方式 -->
            <div class="section">
              <h4 class="section-title">交易方式</h4>
              <p class="mode-value">{{ isMeetup ? '校园面交' : '邮寄' }}</p>
            </div>

            <!-- 面交信息 -->
            <div v-if="isMeetup" class="section">
              <h4 class="section-title">面交信息</h4>
              <div class="address-info">
                <p><strong>地点：</strong>{{ order.meetup_place || '-' }}</p>
                <p v-if="order.meetup_time"><strong>时间：</strong>{{ order.meetup_time }}</p>
              </div>
            </div>

            <!-- 收货地址 -->
            <div v-else class="section">
              <h4 class="section-title">收货地址</h4>
              <div class="address-info">
                <p v-if="order.address_name || order.address_phone">
                  <strong>收货人：</strong>{{ order.address_name }}
                  <span v-if="order.address_phone">{{ order.address_phone }}</span>
                </p>
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
                <p v-if="order.confirmed_at"><strong>确认时间：</strong>{{ formatTime(order.confirmed_at) }}</p>
                <p v-if="order.shipped_at"><strong>发货时间：</strong>{{ formatTime(order.shipped_at) }}</p>
                <p v-if="order.completed_at"><strong>完成时间：</strong>{{ formatTime(order.completed_at) }}</p>
                <p v-if="order.cancelled_at"><strong>取消时间：</strong>{{ formatTime(order.cancelled_at) }}</p>
              </div>
            </div>

            <!-- 完成后互评 -->
            <div v-if="order.status === 'completed'" class="section">
              <div class="section-head">
                <h4 class="section-title">交易评价</h4>
                <span v-if="myReview" class="review-state">已评价</span>
              </div>

              <div v-if="otherReview" class="review-block">
                <div class="review-meta">
                  <span>对方评价</span>
                  <span class="review-stars" :aria-label="`${otherReview.rating} 星`">
                    {{ ratingStars(otherReview.rating) }}
                  </span>
                </div>
                <p v-if="otherReview.content" class="review-content">{{ otherReview.content }}</p>
              </div>

              <div v-if="myReview" class="review-block">
                <div class="review-meta">
                  <span>我的评价</span>
                  <span class="review-stars" :aria-label="`${myReview.rating} 星`">
                    {{ ratingStars(myReview.rating) }}
                  </span>
                </div>
                <p v-if="myReview.content" class="review-content">{{ myReview.content }}</p>
              </div>

              <div v-if="!myReview" class="review-form">
                <p class="review-label">评价这次交易</p>
                <div class="rating-row" role="radiogroup" aria-label="评分">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="rating-btn"
                    :class="{ active: star <= reviewRating }"
                    :aria-label="`${star} 星`"
                    :aria-checked="reviewRating === star"
                    role="radio"
                    @click="reviewRating = star"
                  >
                    {{ star <= reviewRating ? '★' : '☆' }}
                  </button>
                </div>
                <textarea
                  v-model="reviewContent"
                  class="review-input"
                  rows="3"
                  maxlength="200"
                  placeholder="选填，说说这次交易"
                ></textarea>
                <button
                  type="button"
                  class="btn btn-primary review-submit"
                  :disabled="reviewRating === 0 || reviewSubmitting"
                  @click="submitReview"
                >
                  {{ reviewSubmitting ? '提交中...' : '提交评价' }}
                </button>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <div v-if="confirmingAction" class="confirm-panel">
              <p>{{ confirmCopy.text }}</p>
              <div class="action-row">
                <button class="btn btn-secondary" @click="confirmingAction = null">返回</button>
                <button
                  class="btn btn-primary"
                  :disabled="actionLoading"
                  @click="performAction()"
                >
                  {{ actionLoading ? '处理中...' : confirmCopy.label }}
                </button>
              </div>
            </div>
            <div v-else class="action-row">
              <button v-if="canCancel" class="btn btn-secondary" @click="requestAction('cancelled')">
                取消订单
              </button>
              <button v-if="canConfirm" class="btn btn-primary" @click="requestAction('confirmed')">
                确认订单
              </button>
              <button v-if="canShip" class="btn btn-primary" @click="requestAction('shipped')">
                标记发货
              </button>
              <button v-if="canComplete" class="btn btn-primary" @click="requestAction('completed')">
                {{ isMeetup ? '确认已面交' : '确认收货' }}
              </button>
              <button
                v-if="!canCancel && !canConfirm && !canShip && !canComplete"
                class="btn btn-secondary"
                @click="handleClose"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getImageUrl } from '@/config'
import { formatPrice } from '@/utils/price'
import { useUserStore } from '@/stores/user'
import { getOrderById, updateOrderStatus, cancelOrder, createReview } from '@/api/order'
import toast from '@/utils/toast'

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

const emit = defineEmits(['close', 'updated'])

const userStore = useUserStore()
const currentOrder = ref(null)
const reviewRating = ref(0)
const reviewContent = ref('')
const reviewSubmitting = ref(false)
const actionLoading = ref(false)
const confirmingAction = ref(null)

watch(
  () => props.order,
  (value) => {
    currentOrder.value = value ? { ...value, reviews: value.reviews || [] } : null
    reviewRating.value = 0
    reviewContent.value = ''
    confirmingAction.value = null
  },
  { immediate: true, deep: true }
)

const order = computed(() => currentOrder.value || {})
const currentUserId = computed(() => Number(userStore.userInfo?.id))
const isBuyer = computed(() => Number(order.value.buyer_id) === currentUserId.value)
const isSeller = computed(() => Number(order.value.seller_id) === currentUserId.value)
const isMeetup = computed(() => order.value.delivery_mode === 'meetup')

const canCancel = computed(() =>
  (isBuyer.value || isSeller.value) && ['pending', 'confirmed'].includes(order.value.status)
)
const canConfirm = computed(() => isSeller.value && order.value.status === 'pending')
const canShip = computed(() =>
  isSeller.value && order.value.status === 'confirmed' && !isMeetup.value
)
const canComplete = computed(() =>
  isBuyer.value && (
    (isMeetup.value && order.value.status === 'confirmed') ||
    (!isMeetup.value && order.value.status === 'shipped')
  )
)

const myReview = computed(() =>
  order.value.reviews?.find(review => Number(review.reviewer_id) === currentUserId.value) || null
)
const otherReview = computed(() =>
  order.value.reviews?.find(review => Number(review.reviewer_id) !== currentUserId.value) || null
)

const confirmCopy = computed(() => {
  if (confirmingAction.value === 'cancelled') {
    return { text: '取消后商品会重新上架，确定取消这笔订单？', label: '确认取消' }
  }
  return {
    text: isMeetup.value ? '确认已经完成面交？订单将标记为已完成。' : '确认已经收到商品？订单将标记为已完成。',
    label: '确认完成'
  }
})

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待卖家确认',
    'confirmed': isMeetup.value ? '待面交' : '待发货',
    'paid': '已确认',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

const ratingStars = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating) || 0))
  return '★'.repeat(value) + '☆'.repeat(5 - value)
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

const handleClose = () => {
  emit('close')
}

const refreshOrder = async () => {
  const response = await getOrderById(order.value.id)
  if (response?.success && response.data) {
    currentOrder.value = { ...response.data, reviews: response.data.reviews || [] }
  }
}

const performAction = async (status = confirmingAction.value) => {
  if (!status || actionLoading.value) return
  actionLoading.value = true
  try {
    if (status === 'cancelled') {
      await cancelOrder(order.value.id)
      toast.success('订单已取消')
    } else {
      await updateOrderStatus(order.value.id, status)
      const messages = {
        confirmed: '订单已确认',
        shipped: '已标记发货',
        completed: '交易已完成'
      }
      toast.success(messages[status] || '订单状态已更新')
    }
    confirmingAction.value = null
    emit('updated')
    try {
      await refreshOrder()
    } catch (refreshError) {
      console.error('刷新订单详情失败:', refreshError)
      toast.error('操作已完成，请重新打开订单查看最新状态')
      handleClose()
    }
  } catch (error) {
    toast.error(error.response?.data?.message || '操作失败，请稍后重试')
  } finally {
    actionLoading.value = false
  }
}

const requestAction = (status) => {
  if (status === 'cancelled' || status === 'completed') {
    confirmingAction.value = status
    return
  }
  performAction(status)
}

const submitReview = async () => {
  if (reviewRating.value === 0 || reviewSubmitting.value) return
  reviewSubmitting.value = true
  try {
    await createReview(order.value.id, {
      rating: reviewRating.value,
      content: reviewContent.value.trim()
    })
    toast.success('评价已提交')
    reviewRating.value = 0
    reviewContent.value = ''
    await refreshOrder()
    emit('updated')
  } catch (error) {
    toast.error(error.response?.data?.message || '提交评价失败')
  } finally {
    reviewSubmitting.value = false
  }
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
  border-radius: 3px;
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
  min-height: 0;
  overflow-y: auto;
  padding: 6px 22px 18px;
}

.section {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}

.section:last-child {
  border-bottom: none;
  padding-bottom: 4px;
}

.section-title {
  margin: 0 0 10px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.product-info {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
}

.product-image {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 3px;
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
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.address-info,
.time-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mode-value {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
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
  border: 1px solid var(--line-strong);
  border-radius: 4px;
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
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
}

.status-pending {
  background: var(--warn-bg);
  border-color: var(--warn-text);
  color: var(--warn-text);
}

.status-paid,
.status-confirmed,
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

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.section-head .section-title {
  margin: 0;
}

.review-state {
  color: var(--text-4);
  font-size: 11px;
}

.review-block {
  padding: 10px 0;
  border-top: 1px solid var(--line-2);
}

.review-block:last-of-type {
  border-bottom: 1px solid var(--line-2);
}

.review-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.review-stars {
  color: var(--primary-2);
  font-size: 13px;
  letter-spacing: 0.06em;
}

.review-content {
  margin: 6px 0 0;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
}

.review-label {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.rating-row {
  display: flex;
  gap: 4px;
}

.rating-btn {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-3);
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease),
              border-color 0.2s var(--fish-ease),
              color 0.2s var(--fish-ease);
}

.rating-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
}

.review-input {
  width: 100%;
  min-height: 76px;
  padding: 10px 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.review-input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
}

.confirm-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.confirm-panel p {
  margin: 0;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.6;
}

.action-row {
  display: flex;
  gap: 10px;
}

.action-row .btn {
  flex: 1;
  width: auto;
}

.dialog-footer {
  padding: 14px 22px;
  border-top: 1px solid var(--line);
}

.btn {
  width: 100%;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 3px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.55;
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
  color: var(--on-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-2);
  border-color: var(--primary-2);
}

@media (max-width: 767px) {
  .close-btn { width: 44px; height: 44px; }
  .dialog-overlay { padding: 0; align-items: flex-end; }
  .dialog-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 6px 6px 0 0;
    border-bottom: none;
    box-shadow: 0 -10px 28px rgba(42,29,20,.10);
  }
  .dialog-header { padding: 16px 18px; }
  .dialog-body { padding: 4px 18px 14px; }
  .dialog-footer { padding: 12px 18px calc(12px + env(safe-area-inset-bottom, 0px)); }
}
</style>
