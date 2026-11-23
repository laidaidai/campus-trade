<template>
  <div class="view-history">
    <!-- 顶部操作栏 -->
    <div class="history-header">
      <p class="history-count">共 {{ products.length }} 条浏览记录</p>
      <button 
        v-if="products.length > 0"
        class="btn-clear"
        @click="confirmClear"
      >
        清空历史
      </button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="products.length === 0" class="empty-state">
      <div class="empty-icon icon-eye-large"></div>
      <p>还没有浏览记录</p>
      <button class="btn-browse" @click="$router.push('/')">
        去首页逛逛
      </button>
    </div>

    <!-- 历史列表 -->
    <div v-else class="history-grid">
      <div 
        v-for="item in products" 
        :key="item.id"
        class="history-item"
      >
        <div class="item-image" @click="goToDetail(item.product_id)">
          <img :src="getImageUrl(item.images[0])" :alt="item.title" />
          <div v-if="item.status === 'sold'" class="sold-badge">已售出</div>
        </div>
        <div class="item-info">
          <h4 class="item-title" @click="goToDetail(item.product_id)">
            {{ item.title }}
          </h4>
          <p class="item-price">¥{{ item.price }}</p>
          <p class="item-time">浏览于 {{ formatTime(item.view_time) }}</p>
        </div>
        <button 
          class="btn-delete"
          @click="deleteItem(item.id)"
          title="删除"
        >
          ×
        </button>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more">
      <button class="btn-load-more" @click="loadMore">
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getViewHistory, clearViewHistory, deleteViewHistory } from '@/api/viewHistory'
import { getImageUrl } from '@/config'
import toast from '@/utils/toast'
import { showDeleteConfirm } from '@/utils/dialog'

const router = useRouter()

const loading = ref(false)
const products = ref([])
const hasMore = ref(false)
const offset = ref(0)
const limit = 20

// 获取浏览历史
const fetchHistory = async (reset = true) => {
  try {
    loading.value = true
    if (reset) {
      offset.value = 0
    }

    const params = {
      limit,
      offset: offset.value
    }

    const response = await getViewHistory(params)
    
    if (reset) {
      products.value = response.data || []
    } else {
      products.value = [...products.value, ...(response.data || [])]
    }

    hasMore.value = response.pagination?.hasMore || false
    offset.value += limit
  } catch (error) {
    console.error('获取浏览历史失败:', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  fetchHistory(false)
}

// 清空历史
const confirmClear = async () => {
  const confirmed = await showDeleteConfirm('确定要清空所有浏览历史吗？此操作无法撤销！')
  
  if (!confirmed) return

  try {
    await clearViewHistory()
    products.value = []
    toast.success('已清空浏览历史')
  } catch (error) {
    console.error('清空失败:', error)
    toast.error('操作失败,请稍后重试')
  }
}

// 删除单条记录
const deleteItem = async (historyId) => {
  try {
    await deleteViewHistory(historyId)
    products.value = products.value.filter(item => item.id !== historyId)
    toast.success('已删除')
  } catch (error) {
    console.error('删除失败:', error)
    toast.error('删除失败,请稍后重试')
  }
}

// 跳转到详情页
const goToDetail = (productId) => {
  router.push(`/product/${productId}`)
}

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString()
}

onMounted(() => {
  fetchHistory()
})
</script>

<style scoped>
.view-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--line-2);
}

.history-count {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 700;
}

.btn-clear {
  min-height: 36px;
  padding: 7px 16px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: border-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.btn-clear:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 16px;
  color: var(--text-3);
  font-size: 13px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 20px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 18px;
}

.empty-icon {
  position: relative;
  width: 84px;
  height: 84px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
}

/* CSS 眼睛 */
.icon-eye-large::before {
  content: '';
  position: absolute;
  top: 30px;
  left: 20px;
  width: 40px;
  height: 22px;
  border: 2px solid var(--text-2);
  border-radius: 999px / 60%;
}

.icon-eye-large::after {
  content: '';
  position: absolute;
  top: 39px;
  left: 37px;
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 999px;
}

.empty-state p {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}

.btn-browse {
  min-height: 42px;
  padding: 9px 24px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.btn-browse:hover {
  transform: translateY(-1px);
}

/* 历史卡 */
.history-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.history-item {
  position: relative;
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 16px;
  transition: transform 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.history-item:hover {
  transform: translateY(-2px);
  background: var(--cream-1);
  box-shadow: 4px 5px 0 var(--shadow);
}

.item-image {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 2px solid var(--edge);
  cursor: pointer;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sold-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 9px;
  background: var(--card);
  border: 2px solid var(--danger);
  border-radius: 8px;
  color: var(--danger);
  font-size: 11px;
  font-weight: 900;
  transform: rotate(-6deg);
}

.item-info {
  padding: 10px 12px 12px;
}

.item-title {
  margin: 0 0 6px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.item-price {
  margin: 0 0 4px;
  color: var(--primary-2);
  font-size: 17px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.item-time {
  margin: 0;
  color: var(--text-4);
  font-size: 11px;
}

/* 删除：小圆纸片 */
.btn-delete {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s var(--fish-ease), background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.history-item:hover .btn-delete { opacity: 1; }

.btn-delete:hover {
  background: var(--danger);
  color: var(--on-primary);
  border-color: var(--edge);
}

.load-more {
  display: flex;
  justify-content: center;
  padding-top: 4px;
}

.btn-load-more {
  min-height: 42px;
  padding: 9px 28px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.btn-load-more:hover {
  background: var(--cream-2);
  color: var(--ink);
}

@media (max-width: 1024px) {
  .history-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
}

@media (max-width: 768px) {
  .history-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .item-title { font-size: 12px; }
  .item-price { font-size: 15px; }
  .btn-delete { opacity: 1; width: 26px; height: 26px; }
}
</style>
