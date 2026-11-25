<template>
  <div class="page">
    <main class="main-content">
      <div class="favorites-container">
        <header class="page-head">
          <div>
            <header class="page-head">
          <div>
            <h1 class="page-title">我的收藏</h1>
          </div>
          <div class="head-count">
            <span class="count-value">{{ favorites.length }}</span>
            <span class="count-label">件</span>
          </div>
        </header>
          </div>
          <div class="head-count">
            <span class="count-value">{{ favorites.length }}</span>
            <span class="count-label">件</span>
          </div>
        </header>
        
        <!-- 加载中 -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && favorites.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <h3 class="empty-title">还没有收藏</h3>
          <button class="btn btn-primary" @click="$router.push('/')">去逛逛</button>
        </div>

        <!-- 收藏列表 - 网格布局 -->
        <div v-else-if="!loading && favorites.length > 0" class="favorites-grid">
          <XHSProductCard 
            v-for="item in favorites"
            :key="item.id"
            :product="item" 
            :show-delete-icon="true"
            :force-show-delete="true"
            @delete="handleDeleteFavorite"
          />
        </div>
      </div>
    </main>
    
    <!-- 撤回提示 -->
    <UndoToast 
      ref="undoToastRef" 
      :message="undoMessage"
      @undo="handleUndo"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUserFavorites, removeFavorite, addFavorite } from '@/api/favorite'
import { getImageUrl } from '@/config'
import { resolveAvatar } from '@/utils/avatar'
import XHSProductCard from '@/components/XHSProductCard.vue'
import UndoToast from '@/components/UndoToast.vue'
import toast from '@/utils/toast'

defineOptions({
  name: 'Favorites'
})

const router = useRouter()
const loading = ref(true)
const favorites = ref([])
const undoToastRef = ref(null)
const undoMessage = ref('')
const deletedItem = ref(null)

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

// 获取收藏列表
const fetchFavorites = async () => {
  try {
    loading.value = true
    const response = await getUserFavorites()
    
    
    
    // 后端返回的是 { success: true, data: [...] }
    const favoritesList = response.data || response.favorites || []
    
    favorites.value = favoritesList.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.images && item.images.length > 0 
        ? getImageUrl(item.images[0])
        : 'https://picsum.photos/400/400?random=' + item.id,
      location: '校园',
      views: 0,
      favoriteCount: item.favorite_count ?? item.favoriteCount ?? 0, // 收藏人数
      sellerAvatar: resolveAvatar(item.seller_avatar, item.seller_name || '用户'),
      sellerName: item.seller_name || '匿名用户',
      publishTime: formatTime(item.created_at),
      status: item.status
    }))
    
    
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    toast.error('获取收藏列表失败: ' + (error.response?.data?.error || error.message))
  } finally {
    loading.value = false
  }
}

// 跳转到商品详情
const goToDetail = (id) => {
  router.push(`/product/${id}`)
}

// 删除收藏
const handleDeleteFavorite = async (productId) => {
  try {
    // 找到要删除的项
    const itemToDelete = favorites.value.find(item => item.id === productId)
    if (!itemToDelete) return
    
    // 保存删除的项
    deletedItem.value = itemToDelete
    
    // 先从UI中移除
    favorites.value = favorites.value.filter(item => item.id !== productId)
    
    // 调用API删除
    await removeFavorite(productId)
    
    // 显示撤回提示
    undoMessage.value = '已取消收藏'
    undoToastRef.value?.show()
    
    // 4秒后清除deletedItem（过期后不能撤回）
    setTimeout(() => {
      if (deletedItem.value?.id === productId) {
        deletedItem.value = null
      }
    }, 4000)
  } catch (error) {
    console.error('取消收藏失败:', error)
    // 如果删除失败，恢复UI
    if (deletedItem.value) {
      favorites.value.push(deletedItem.value)
      favorites.value.sort((a, b) => b.id - a.id)
      deletedItem.value = null
    }
    toast.error('取消收藏失败: ' + (error.response?.data?.error || error.message))
  }
}

// 撤回删除
const handleUndo = async () => {
  if (!deletedItem.value) return
  
  try {
    // 恢复到列表
    favorites.value.push(deletedItem.value)
    favorites.value.sort((a, b) => b.id - a.id)
    
    // 调用API重新收藏
    await addFavorite(deletedItem.value.id)
    
    deletedItem.value = null
  } catch (error) {
    console.error('撤回失败:', error)
    // 如果撤回失败，再次从列表移除
    favorites.value = favorites.value.filter(item => item.id !== deletedItem.value?.id)
    deletedItem.value = null
    toast.error('撤回失败')
  }
}

// 简单的消息提示函数
const showMessage = (message, type = 'info') => {
  const messageEl = document.createElement('div')
  messageEl.className = `custom-message custom-message-${type}`
  messageEl.textContent = message
  document.body.appendChild(messageEl)
  
  setTimeout(() => {
    messageEl.classList.add('show')
  }, 10)
  
  setTimeout(() => {
    messageEl.classList.remove('show')
    setTimeout(() => {
      document.body.removeChild(messageEl)
    }, 300)
  }, 2000)
}

onMounted(() => {
  fetchFavorites()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 32px 72px;
}

.favorites-container {
  width: 100%;
}

/* 页头：一个标题 + 一个数字 */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 22px;
}

.page-title {
  margin: 4px 0 0;
  color: var(--ink);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.head-count {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.count-value {
  color: var(--primary-2);
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.count-label {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
}

/* 加载：实线转环 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 20px;
  color: var(--text-3);
  font-size: 14px;
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空态：实线圆 + 唯一主操作 */
.empty-state {
  gap: 16px;
  min-height: 320px;
  max-height: none;
  padding: 56px 24px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 24px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--primary-2);
}

.empty-icon svg {
  width: 42px;
  height: 42px;
}

.empty-title {
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
}

/* 收藏网格：与首页同一套纸卡 */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

@media (max-width: 1023px) {
  .main-content { padding: 20px 24px 64px; }
  .favorites-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .page-title { font-size: 28px; }
}

@media (max-width: 767px) {
  .main-content { padding: 16px 12px calc(88px + env(safe-area-inset-bottom, 0px)); }
  .page-head { padding-bottom: 16px; }
  .page-title { font-size: 24px; }
  .count-value { font-size: 22px; }
  .favorites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .empty-icon { width: 80px; height: 80px; }
  .empty-icon svg { width: 34px; height: 34px; }
}
</style>

<style>
/* 全局消息提示：纸卡墨线 */
.custom-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%) translateY(-120px);
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border: 2px solid var(--edge);
  border-radius: 999px;
  background: var(--card);
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  box-shadow: 4px 5px 0 var(--shadow);
  z-index: 9999;
  opacity: 0;
  transition: transform 0.26s var(--fish-ease), opacity 0.26s var(--fish-ease);
}

.custom-message.show {
  transform: translateX(-50%) translateY(0);
  opacity: 1;
}

.custom-message-success { border-color: var(--success); color: var(--success); }
.custom-message-error { border-color: var(--danger); color: var(--danger); }
.custom-message-info { border-color: var(--edge); color: var(--ink); }
</style>