<template>
  <div class="page">
    <div class="user-homepage">
      <!-- 用户信息卡片 -->
      <div v-if="userInfo" class="user-card">
        <!-- 返回按钮 -->
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        
        <img :src="getUserAvatar" :alt="userInfo.username" class="user-avatar" />
        <div class="user-info">
          <h1 class="username">{{ userInfo.username }}</h1>
          <p class="user-meta">
            <span>加入于 {{ formatDate(userInfo.created_at) }}</span>
          </p>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="products-section">
        <h2 class="section-title">TA的商品 <span class="title-count">{{ products.length }}</span></h2>
        
        <!-- 加载中 -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>加载中...</p>
        </div>

        <!-- 空状态 -->
        <div v-else-if="products.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <p class="empty-title">暂无发布</p>
        </div>

        <!-- 商品网格 -->
        <div v-else class="products-grid">
          <div 
            v-for="product in products" 
            :key="product.id"
            class="product-item"
            @click="goToProduct(product.id)"
          >
            <div class="product-image">
              <img :src="getImageUrl(product.images[0])" :alt="product.title" />
              <!-- 已售出水印 -->
              <div v-if="product.status === 'sold'" class="sold-watermark">
                已售出
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-title">{{ product.title }}</h3>
              <p class="product-price">¥{{ product.price }}</p>
              <p class="product-time">{{ formatTime(product.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUserById } from '@/api/user'
import { getProducts } from '@/api/product'
import { getImageUrl } from '@/config'
import { resolveAvatar } from '@/utils/avatar'
import toast from '@/utils/toast'

const route = useRoute()
const router = useRouter()

const userId = computed(() => route.params.id)
const userInfo = ref(null)
const products = ref([])
const loading = ref(false)

// 获取用户头像
const getUserAvatar = computed(() => {
  return resolveAvatar(userInfo.value?.avatar, userInfo.value?.username)
})

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    const response = await getUserById(userId.value)
    if (response.success) {
      userInfo.value = response.data
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    toast.error('获取用户信息失败')
  }
}

// 获取用户的商品
const fetchUserProducts = async () => {
  loading.value = true
  try {
    const params = {
      user_id: userId.value,
      status: '', // 空字符串表示获取所有状态的商品
      limit: 100,
      offset: 0
    }
    
    const response = await getProducts(params)
    
    if (response.success) {
      products.value = response.data || []
      
      // 检查已售出商品
      const soldProducts = products.value.filter(p => p.status === 'sold')
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
    toast.error('获取商品列表失败')
  } finally {
    loading.value = false
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 跳转到商品详情
const goToProduct = (productId) => {
  router.push(`/product/${productId}`)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / 86400000)
  
  if (days < 1) return '今天'
  if (days < 7) return `${days}天前`
  if (days < 30) return `${Math.floor(days / 7)}周前`
  return formatDate(dateString)
}

onMounted(() => {
  fetchUserInfo()
  fetchUserProducts()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.user-homepage {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 32px 72px;
}

/* 卖家身份：深色 Hero */
.user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 26px 24px;
  background: var(--panel);
  color: var(--on-panel);
  border: 2px solid var(--edge);
  border-radius: 24px;
  box-shadow: 5px 6px 0 var(--shadow);
}

.back-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 2px 3px 0 var(--shadow);
  color: var(--ink);
  cursor: pointer;
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.user-avatar {
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--panel-deep);
  border: 3px solid var(--primary);
  border-radius: 999px;
}

.user-info {
  flex: 1;
  min-width: 0;
  padding-right: 44px;
}

.username {
  margin: 0 0 6px;
  color: var(--on-panel);
  font-size: 28px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  color: var(--on-panel-warm);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.products-section {
  margin-top: 26px;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--line-2);
  color: var(--ink);
  font-size: 19px;
  font-weight: 900;
}

.title-count {
  color: var(--primary-2);
  font-size: 22px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

/* 商品纸卡 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}

.product-item {
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 18px;
  cursor: pointer;
  transition: transform 0.34s var(--fish-ease),
              box-shadow 0.34s var(--fish-ease),
              background-color 0.34s var(--fish-ease);
}

.product-item:hover {
  transform: translateY(-3px);
  box-shadow: 5px 6px 0 var(--shadow);
  background: var(--cream-1);
}

.product-image {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 2px solid var(--edge);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sold-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-1);
  opacity: 0.94;
}

.sold-watermark::before {
  content: '已售出';
  padding: 5px 14px;
  color: var(--danger);
  background: var(--card);
  border: 3px solid var(--danger);
  border-radius: 12px;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.06em;
  transform: rotate(-10deg);
  white-space: nowrap;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 13px;
}

.product-title {
  margin: 0;
  min-height: 42px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.45;
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
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.product-time {
  margin: 0;
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

/* 加载 / 空态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 20px;
  color: var(--text-3);
  font-size: 13px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  gap: 14px;
  min-height: 280px;
  padding: 48px 20px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 20px;
}

.empty-icon {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--text-2);
}

.empty-icon svg {
  width: 36px;
  height: 36px;
}

.empty-title {
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

/* 平板 */
@media (max-width: 1023px) {
  .user-homepage { padding: 20px 24px 64px; }
  .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .username { font-size: 24px; }
  .user-avatar { width: 76px; height: 76px; }
}

/* 手机 */
@media (max-width: 767px) {
  .user-homepage { padding: 12px 12px 40px; }
  .user-card { padding: 18px 16px; gap: 14px; border-radius: 20px; }
  .user-avatar { width: 64px; height: 64px; }
  .username { font-size: 21px; }
  .user-info { padding-right: 40px; }
  .back-btn { top: 10px; right: 10px; width: 36px; height: 36px; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .product-info { padding: 10px; gap: 5px; }
  .product-title { font-size: 13px; min-height: 38px; }
  .product-price { font-size: 17px; }
}
</style>
