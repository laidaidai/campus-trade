<template>
  <div class="page">
    <main class="main-content">
      <div class="favorites-container">
        <header class="page-head">
          <div class="page-heading">
            <h1 class="page-title">我的收藏</h1>
            <p class="page-desc">把心动先放在这里，等准备好了再聊。</p>
          </div>
          <div class="head-count">
            <span class="count-value">{{ favorites.length }}</span>
            <span class="count-label">件好物</span>
          </div>
        </header>

        <!-- 加载中 -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && favorites.length === 0" class="empty-state">
          <span class="empty-tape" aria-hidden="true"></span>
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </div>
          <div class="empty-copy">
            <h3 class="empty-title">还没有收藏</h3>
            <p class="empty-desc">看到喜欢的商品，点一下收藏就会出现在这里。</p>
          </div>
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
  padding: 28px 36px 80px;
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

.page-eyebrow {
  margin: 0 0 4px;
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.page-title {
  margin: 0 0 5px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: 0.015em;
  line-height: 1.2;
}

.page-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.head-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-bottom: 2px;
}

.count-value {
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.count-label {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
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
  position: relative;
  align-items: center;
  width: min(100%, 460px);
  margin: 30px auto 8px;
  gap: 10px;
  min-height: 0;
  max-height: none;
  padding: 44px 40px 34px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  box-shadow: 4px 5px 0 rgba(63, 61, 86, 0.055);
  transform: rotate(-0.7deg);
  text-align: center;
}

.empty-state::after {
  content: '同校';
  position: absolute;
  right: 22px;
  bottom: 16px;
  padding: 2px 7px 3px;
  border: 1.5px solid rgba(184, 68, 97, 0.28);
  border-radius: 3px;
  color: rgba(184, 68, 97, 0.34);
  font-family: var(--font-serif);
  font-size: 15px;
  letter-spacing: 0.14em;
  transform: rotate(-7deg);
}

/* 顶部胶带：像贴在墙上的便签，不像系统空态 */
.empty-tape {
  position: absolute;
  top: -11px;
  left: 50%;
  width: 86px;
  height: 21px;
  background: rgba(229, 189, 114, 0.34);
  border-left: 1px solid rgba(229, 189, 114, 0.5);
  border-right: 1px solid rgba(229, 189, 114, 0.5);
  transform: translateX(-50%) rotate(1.6deg);
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin-bottom: 2px;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  color: var(--primary);
  transform: rotate(-4deg);
}

.empty-icon svg {
  width: 34px;
  height: 34px;
  stroke-width: 1.7;
}

.empty-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-title {
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 600;
}

.empty-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
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
  .count-value { font-size: 18px; }
  .empty-state { width: 100%; margin-top: 18px; padding: 34px 22px 26px; }
  .favorites-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
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
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--card);
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  box-shadow: var(--shadow-soft);
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