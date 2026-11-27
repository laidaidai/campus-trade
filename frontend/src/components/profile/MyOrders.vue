<template>
  <div class="my-orders">
    <div class="tabs">
      <button 
        :class="['tab-btn', { active: activeTab === 'bought' }]"
        @click="activeTab = 'bought'"
      >
        我买到的
      </button>
      <button 
        :class="['tab-btn', { active: activeTab === 'sold' }]"
        @click="activeTab = 'sold'"
      >
        我卖出的
      </button>
    </div>

    <div class="orders-list">
      <div v-if="loading" class="loading">加载中...</div>
      
      <div v-else-if="displayOrders.length === 0" class="empty">
        <div class="empty-copy">
          <p class="empty-title">{{ activeTab === 'bought' ? '还没有购买记录' : '还没有卖出记录' }}</p>
          <span class="empty-desc">{{ activeTab === 'bought' ? '买到的商品会集中显示在这里。' : '卖出后，订单会记录在这里。' }}</span>
        </div>
        <button type="button" class="btn btn-outline empty-action" @click="router.push('/')">去逛逛</button>
      </div>

      <div 
        v-else 
        v-for="order in displayOrders" 
        :key="order.id"
        class="order-card"
        @click="viewOrderDetail(order)"
      >
        <img 
          :src="getImageUrl(order.product_image)" 
          :alt="order.product_title"
          class="order-image"
        />
        <div class="order-info">
          <h4 class="order-title">{{ order.product_title }}</h4>
          <div class="order-meta">
            <span class="order-price">¥{{ formatPrice(order.price) }}</span>
            <span class="order-status" :class="`status-${order.status}`">
              {{ getStatusText(order) }}
            </span>
          </div>
          <div class="order-time">{{ formatTime(order.created_at) }}</div>
        </div>
        <div class="order-arrow">›</div>
      </div>
    </div>

    <!-- 订单详情弹窗 -->
    <OrderDetailDialog
      v-if="selectedOrder"
      :visible="showDetailDialog"
      :order="selectedOrder"
      @close="showDetailDialog = false"
      @updated="loadOrders"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyOrders, getOrderById } from '@/api/order'
import { getImageUrl } from '@/config'
import toast from '@/utils/toast'
import OrderDetailDialog from '@/components/OrderDetailDialog.vue'
import { formatPrice } from '@/utils/price'

const router = useRouter()

const props = defineProps({
  defaultTab: {
    type: String,
    default: 'bought' // bought | sold
  }
})

const activeTab = ref(props.defaultTab === 'sold' ? 'sold' : 'bought')
const orders = ref([])
const loading = ref(false)
const showDetailDialog = ref(false)
const selectedOrder = ref(null)

const displayOrders = computed(() => {
  if (activeTab.value === 'bought') {
    return orders.value.filter(o => o.is_buyer)
  } else {
    return orders.value.filter(o => !o.is_buyer)
  }
})

const getStatusText = (order) => {
  const statusMap = {
    'pending': '待卖家确认',
    'confirmed': order.delivery_mode === 'meetup' ? '待面交' : '待发货',
    'paid': '已确认',
    'shipped': '已发货',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[order.status] || order.status
}

const formatTime = (time) => {
  const date = new Date(time)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await getMyOrders()
    orders.value = res.data || []
  } catch (error) {
    console.error('加载订单失败:', error)
    toast.error('加载订单失败')
  } finally {
    loading.value = false
  }
}

const viewOrderDetail = async (order) => {
  try {
    const res = await getOrderById(order.id)
    if (res && res.success !== false) {
      selectedOrder.value = res.data || res
      showDetailDialog.value = true
    } else {
      throw new Error(res?.message || '获取订单失败')
    }
  } catch (e) {
    console.error('获取订单详情失败:', e)
    toast.error('获取订单详情失败')
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.my-orders {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 分段切换：纸片胶囊 */
.tabs {
  display: flex;
  gap: 22px;
  border-bottom: 1px solid var(--line);
}

.tab-btn {
  min-height: 44px;
  padding: 8px 0;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease),
              color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease);
}

.tab-btn:hover {
  color: var(--ink);
  border-color: var(--edge);
}

.tab-btn.active {
  background: transparent;
  border-bottom-color: var(--primary);
  color: var(--primary-2);
  box-shadow: none;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loading {
  padding: 40px 16px;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

/* 空订单：直接留在工作台里，不套小票卡 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 62px 16px 54px;
  background: transparent;
  border: 0;
  color: var(--text-3);
  text-align: center;
}

.empty-copy { display: flex; flex-direction: column; gap: 4px; }

.empty-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.empty-desc {
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.empty-action { margin-top: 2px; }

/* 订单行：列表横条，不再在内容卡里套卡 */
.order-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line-2);
  border-radius: 0;
  cursor: pointer;
  transition: background-color 0.18s var(--fish-ease);
}

.order-card:last-child { border-bottom: 0; }

.order-card:hover {
  background: var(--cream-1);
}

.order-image {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 3px;
}

.order-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.order-title {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.order-price {
  color: var(--primary-2);
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.order-status {
  padding: 2px 6px;
  border: 1px solid var(--line-strong);
  border-radius: 2px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
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

.order-time {
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.order-arrow {
  flex-shrink: 0;
  color: var(--text-4);
  font-size: 20px;
  line-height: 1;
}

@media (max-width: 640px) {
  .order-card { gap: 10px; padding: 10px; }
  .order-image { width: 60px; height: 60px; }
  .order-title { font-size: 13px; }
  .order-price { font-size: 16px; }
}
</style>
