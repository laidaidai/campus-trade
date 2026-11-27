<template>
  <div class="page">
    <div class="user-homepage">
      <button class="back-link" type="button" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回
      </button>

      <!-- 用户信息卡片 -->
      <div v-if="userInfo" class="user-card">
        
        <img :src="getUserAvatar" :alt="userInfo.username" class="user-avatar" />
        <div class="user-info">
          <h1 class="username">{{ userInfo.username }}</h1>
          <p class="user-meta">
            <span>加入于 {{ formatDate(userInfo.created_at) }}</span>
            <span v-if="userInfo.rating_count">
              评分 {{ userInfo.rating_avg }}（{{ userInfo.rating_count }} 条）
            </span>
          </p>
        </div>
        <div class="seller-stats" aria-label="卖家商品状态">
          <div><strong>{{ availableCount }}</strong><span>在售</span></div>
          <div><strong>{{ soldCount }}</strong><span>已售</span></div>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="products-section">
        <h2 class="section-title">TA的商品 <span class="title-count">{{ String(products.length).padStart(2, '0') }} 件</span></h2>
        
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
          <p class="empty-desc">TA 还没有发布商品。</p>
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
              <!-- 状态水印 -->
              <div
                v-if="product.status !== 'available'"
                class="sold-watermark"
                :class="{ reserved: product.status === 'reserved' }"
              >
                {{ product.status === 'sold' ? '已售出' : '已预订' }}
              </div>
            </div>
            <div class="product-info">
              <h3 class="product-title">{{ product.title }}</h3>
              <p class="product-price">¥{{ formatPrice(product.price) }}</p>
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
import { formatPrice } from '@/utils/price'

const route = useRoute()
const router = useRouter()

const userId = computed(() => route.params.id)
const userInfo = ref(null)
const products = ref([])
const loading = ref(false)

const availableCount = computed(() => products.value.filter(p => p.status === 'available').length)
const soldCount = computed(() => products.value.filter(p => p.status === 'sold').length)

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
      status: 'all', // 获取所有状态的商品
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
  background: var(--bg);
}

.user-homepage {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 32px 80px;
}

/* 卖家身份：深色 Hero */
.user-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 24px;
  background: var(--card);
  color: var(--ink);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: none;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 40px;
  margin: 0 0 10px -6px;
  padding: 6px 8px;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: var(--text-3);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s var(--fish-ease);
}

.back-link:hover { color: var(--ink); }

.back-link svg { width: 16px; height: 16px; }

.user-avatar {
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  box-shadow: none;
}

.user-info {
  flex: 1;
  min-width: 0;
  padding-right: 44px;
}

.username {
  margin: 0 0 6px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 29px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: normal;
}

.user-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 11px;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.seller-stats {
  display: flex;
  gap: 28px;
  margin-left: auto;
  padding-left: 24px;
}

.seller-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.seller-stats strong {
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.seller-stats span {
  color: var(--text-4);
  font-family: var(--font-body);
  font-size: 11px;
  letter-spacing: 0.02em;
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
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
}

.title-count {
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

/* 商品纸卡 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
}

.product-item {
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.18s var(--fish-ease);
}

.product-item:hover {
  border-color: var(--primary);
}

.product-image {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 1px solid var(--line);
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sold-watermark {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 7px;
  color: var(--primary-2);
  background: color-mix(in srgb, var(--card) 92%, transparent);
  border: 1px solid var(--primary);
  border-radius: 3px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  pointer-events: none;
}

.sold-watermark.reserved {
  color: var(--warn-text);
  border-color: var(--warn-text);
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
  font-weight: 600;
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
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

.product-time {
  margin: 0;
  color: var(--text-4);
  font-family: var(--font-body);
  font-size: 11px;
  letter-spacing: 0;
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
  gap: 10px;
  min-height: 240px;
  padding: 40px 20px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 6px;
}

.empty-icon {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--text-2);
}

.empty-icon svg {
  width: 26px;
  height: 26px;
}

.empty-title {
  margin: 0;
  color: var(--ink);
  font-size: 16px;
  font-weight: 800;
}

.empty-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
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
  .user-homepage { padding: 12px 14px 40px; }
  .user-card { padding: 18px 16px; gap: 14px; border-radius: 6px; }
  .user-avatar { width: 64px; height: 64px; }
  .username { font-size: 21px; }
  .user-info { padding-right: 0; }
  .back-link { min-height: 44px; margin-bottom: 6px; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .product-info { padding: 10px; gap: 5px; }
  .product-title { font-size: 13px; min-height: 38px; }
  .product-price { font-size: 17px; }
}
</style>