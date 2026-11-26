<template>
  <div class="page">
    <main class="main-content">
      <!-- 返回按钮 -->
      <div class="back-btn" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回
      </div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="error" class="error-box">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <p>{{ error }}</p>
        <button @click="goBack" class="btn-back">返回首页</button>
      </div>

      <!-- 商品详情 -->
      <div v-else-if="product" class="detail-container">
        <!-- 已售出水印 -->
        <div v-if="product.status === 'sold'" class="sold-watermark">
          已售出
        </div>

        <div class="product-layout">
          <!-- 左侧:图片轮播 -->
          <div class="product-gallery">
            <div class="main-image" @click="openImagePreview">
              <img :src="currentImage" :alt="product.title" />
              
              <!-- 图片计数 -->
              <div class="preview-hint">
                <span class="num">{{ currentImageIndex + 1 }} / {{ product.images.length }}</span>
              </div>
              
              <!-- 图片导航 -->
              <div class="image-nav">
                <button 
                  v-if="product.images.length > 1" 
                  class="nav-btn prev" 
                  @click="prevImage"
                  :disabled="currentImageIndex === 0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
                <button 
                  v-if="product.images.length > 1" 
                  class="nav-btn next" 
                  @click="nextImage"
                  :disabled="currentImageIndex === product.images.length - 1"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>

            </div>
            <!-- 缩略图列表 -->
            <div v-if="product.images && product.images.length > 1" class="thumbnails">
              <div 
                v-for="(image, index) in product.images" 
                :key="index"
                :class="['thumbnail', { active: currentImageIndex === index }]"
                @click="currentImageIndex = index"
                :title="`查看图片 ${index + 1}`"
              >
                <img 
                  :src="getImageUrl(image)" 
                  :alt="`${product.title} - 图${index + 1}`"
                  @error="(e) => e.target.src = 'https://via.placeholder.com/80x80?text=Image'"
                />
              </div>
            </div>

          </div>

          <!-- 右侧:商品信息 -->
          <div class="product-info">
            <h1 class="product-title">{{ product.title }}</h1>
            
            <div class="price-section">
              <span class="price">¥{{ formatPrice(product.price) }}</span>
              <span class="condition-tag">{{ getConditionText(product.condition) }}</span>
            </div>

            <div class="meta-info">
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>{{ favoriteCount }} 人收藏</span>
              </div>
              <div class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{{ formatDate(product.created_at) }}</span>
              </div>
            </div>

            <!-- 规格：放在价格之后，移动端先看到商品本身而不是参数表 -->
            <div class="detail-list">
              <div class="detail-item">
                <span class="label">分类</span>
                <span class="value">{{ getCategoryText(product.category) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">成色</span>
                <span class="value">{{ getConditionText(product.condition) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">状态</span>
                <span :class="['value', `status-${product.status}`]">
                  {{ getStatusText(product.status) }}
                </span>
              </div>
            </div>

            <!-- 主操作：一个实心按钮 + 一个次级 -->
            <div v-if="isOwnProduct && product.status === 'available'" class="seller-actions">
              <button class="btn btn-primary" @click="markAsSold">标记为已售出</button>
            </div>
            <div v-else class="action-row">
              <button
                class="btn btn-primary cta"
                :disabled="product.status === 'sold'"
                @click="contactSeller"
              >
                {{ product.status === 'sold' ? '已售出' : '我想要' }}
              </button>
              <button
                class="btn btn-outline cta-fav"
                :class="{ active: isFavorited }"
                @click="toggleFavorite"
              >
                {{ isFavorited ? '已收藏' : '收藏' }}
              </button>
            </div>

            <!-- 商品描述 -->
            <div class="description-section">
              <h3>商品介绍</h3>
              <div 
                class="description-text" 
                :class="{ collapsed: isDescriptionCollapsed && product.description.length > 150 }"
                v-html="formattedDescription"
              ></div>
              <button 
                v-if="product.description.length > 150" 
                class="btn-toggle-description"
                @click="isDescriptionCollapsed = !isDescriptionCollapsed"
              >
                {{ isDescriptionCollapsed ? '展开全部' : '收起' }}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline :points="isDescriptionCollapsed ? '6 9 12 15 18 9' : '18 15 12 9 6 15'"></polyline>
                </svg>
              </button>
            </div>

             <!-- 卖家信息 -->
             <div class="seller-section">
               <h3>卖家信息</h3>
               <div class="seller-card clickable" @click="goToUserPage">
                 <img :src="sellerAvatar" :alt="product.seller_name" class="seller-avatar" />
                 <div class="seller-details">
                   <div class="seller-name">
                     {{ product.seller_name || '匿名用户' }}
                   </div>
                   <div class="seller-meta">发布于 {{ formatDate(product.created_at) }}</div>
                 </div>
                 <svg class="goto-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M9 18l6-6-6-6"/>
                 </svg>
               </div>
             </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 移动端：价格与主操作在首屏常驻，不必滚到图片下面 -->
    <div v-if="product" class="mobile-buybar">
      <div class="buybar-summary">
        <span class="buybar-price">¥{{ formatPrice(product.price) }}</span>
        <span class="buybar-title">{{ product.title }}</span>
      </div>
      <div class="buybar-actions">
        <template v-if="isOwnProduct">
          <button
            v-if="product.status === 'available'"
            class="btn btn-primary buybar-main"
            @click="markAsSold"
          >
            标记已售出
          </button>
          <span v-else class="buybar-state">已售出</span>
        </template>
        <template v-else>
          <button
            class="btn btn-primary buybar-main"
            :disabled="product.status === 'sold'"
            @click="contactSeller"
          >
            {{ product.status === 'sold' ? '已售出' : '我想要' }}
          </button>
          <button
            class="btn btn-outline buybar-fav"
            :class="{ active: isFavorited }"
            @click="toggleFavorite"
          >
            {{ isFavorited ? '已收藏' : '收藏' }}
          </button>
        </template>
      </div>
    </div>

    <!-- 图片预览模态框 -->
    <Teleport to="body">
      <div v-if="showImagePreview" class="image-preview-modal" @click="closeImagePreview">
        <div class="preview-header">
          <span class="preview-counter">{{ previewImageIndex + 1 }} / {{ product.images.length }}</span>
          <button class="btn-close" @click="closeImagePreview">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="preview-content" @click.stop>
          <img :src="getImageUrl(product.images[previewImageIndex])" :alt="product.title" />
          
          <!-- 预览导航按钮 -->
          <button 
            v-if="product.images.length > 1" 
            class="preview-nav-btn prev"
            @click.stop="prevPreviewImage"
            :disabled="previewImageIndex === 0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button 
            v-if="product.images.length > 1" 
            class="preview-nav-btn next"
            @click.stop="nextPreviewImage"
            :disabled="previewImageIndex === product.images.length - 1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        
        <!-- 缩略图导航 -->
        <div v-if="product.images.length > 1" class="preview-thumbnails">
          <div 
            v-for="(image, index) in product.images" 
            :key="index"
            :class="['preview-thumb', { active: previewImageIndex === index }]"
            @click.stop="previewImageIndex = index"
          >
            <img :src="getImageUrl(image)" :alt="`图片 ${index + 1}`" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getProductById, updateProductStatus } from '@/api/product'
import { addFavorite, removeFavorite, checkFavorite, getFavoriteCount } from '@/api/favorite'
import { getOrCreateConversation } from '@/api/message'
import { addViewHistory } from '@/api/viewHistory'
import { getImageUrl } from '@/config'
import { resolveAvatar } from '@/utils/avatar'
import { formatPrice } from '@/utils/price'
import toast from '@/utils/toast'
import { showConfirm } from '@/utils/dialog'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const productId = route.params.id
const product = ref(null)
const loading = ref(true)
const error = ref('')

const currentImageIndex = ref(0)
const isFavorited = ref(false)
const favoriteCount = ref(0)
const isDescriptionCollapsed = ref(true)

// 图片预览相关
const showImagePreview = ref(false)
const previewImageIndex = ref(0)

// 打开图片预览
const openImagePreview = () => {
  previewImageIndex.value = currentImageIndex.value
  showImagePreview.value = true
  document.body.style.overflow = 'hidden' // 禁止背景滚动
}

// 关闭图片预览
const closeImagePreview = () => {
  showImagePreview.value = false
  document.body.style.overflow = '' // 恢复滚动
}

// 预览上一张
const prevPreviewImage = () => {
  if (previewImageIndex.value > 0) {
    previewImageIndex.value--
  }
}

// 预览下一张
const nextPreviewImage = () => {
  if (previewImageIndex.value < product.value.images.length - 1) {
    previewImageIndex.value++
  }
}

// 格式化描述 - 支持简单的 Markdown
const formattedDescription = computed(() => {
  if (!product.value) return ''
  let text = product.value.description
  
  // 转义 HTML 标签
  text = text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
  
  // Markdown 格式化
  // 标题
  text = text.replace(/^### (.*$)/gim, '<h4>$1</h4>')
  text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>')
  text = text.replace(/^# (.*$)/gim, '<h2>$1</h2>')
  
  // 粗体
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // 斜体
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // 换行
  text = text.replace(/\n/g, '<br>')
  
  // 列表
  text = text.replace(/^\- (.*$)/gim, '<li>$1</li>')
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  
  return text
})

// 当前显示的图片
const currentImage = computed(() => {
  if (!product.value || !product.value.images.length) return ''
  return getImageUrl(product.value.images[currentImageIndex.value])
})

// 是否是自己的商品
const isOwnProduct = computed(() => {
  const currentUserId = Number(userStore.userInfo?.id)
  const sellerId = Number(product.value?.seller_id)
  return userStore.isLoggedIn && Number.isInteger(currentUserId) && sellerId === currentUserId
})

// 卖家头像 (添加默认头像)
const sellerAvatar = computed(() => {
  if (!product.value) return ''
  return resolveAvatar(product.value.seller_avatar, product.value.seller_name)
})

// 获取商品详情
const fetchProduct = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await getProductById(productId)
    product.value = response.data
    
    // 获取收藏状态
    if (userStore.isLoggedIn) {
      const favoriteResponse = await checkFavorite(productId)
      isFavorited.value = favoriteResponse.isFavorited
    }
    
    // 获取收藏数
    const countResponse = await getFavoriteCount(productId)
    favoriteCount.value = countResponse.count
    
    // 添加浏览历史 (仅登录用户且不是自己的商品)
    if (userStore.isLoggedIn && product.value.seller_id !== userStore.userInfo?.id) {
      try {
        await addViewHistory(productId)
      } catch (historyError) {
        // 浏览历史失败不影响页面显示
        console.warn('记录浏览历史失败:', historyError)
      }
    }
  } catch (err) {
    console.error('获取商品详情失败:', err)
    error.value = err.response?.data?.error || '商品不存在或已被删除'
  } finally {
    loading.value = false
  }
}

// 切换收藏
const toggleFavorite = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/auth')
    return
  }

  try {
    if (isFavorited.value) {
      await removeFavorite(productId)
      isFavorited.value = false
      favoriteCount.value--
    } else {
      await addFavorite(productId)
      isFavorited.value = true
      favoriteCount.value++
    }
  } catch (err) {
    console.error('收藏操作失败:', err)
    toast.error(err.response?.data?.error || '操作失败,请稍后重试')
  }
}

// 联系卖家
const contactSeller = async () => {
  if (!userStore.isLoggedIn) {
    router.push('/auth')
    return
  }

  // 自己发布的商品不允许再创建买家会话
  if (isOwnProduct.value) {
    toast.error('这是你自己发布的商品，不能联系自己')
    return
  }

  try {
    // 创建或获取会话
    const res = await getOrCreateConversation(productId, product.value.seller_id)
    // request.js 已经返回了 response.data,所以直接访问 conversation
    const conversationId = res.conversation.id

    // 跳转到聊天页面
    router.push({
      name: 'Messages',
      query: { 
        conversationId: conversationId
      }
    })
  } catch (error) {
    console.error('Failed to create conversation:', error)
    toast.error(error.response?.data?.error || '无法联系卖家,请稍后再试')
  }
}

// 标记为已售出
const markAsSold = async () => {
  const confirmed = await showConfirm({
    title: '标记为已售出',
    message: '确定要将商品标记为已售出吗？',
    type: 'warning',
    confirmText: '标记',
    cancelText: '取消'
  })
  
  if (!confirmed) {
    return
  }

  try {
    await updateProductStatus(productId, 'sold')
    product.value.status = 'sold'
    toast.success('商品已标记为已售出')
  } catch (err) {
    console.error('更新状态失败:', err)
    toast.error(err.response?.data?.error || '操作失败,请稍后重试')
  }
}

// 图片导航
const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

const nextImage = () => {
  if (currentImageIndex.value < product.value.images.length - 1) {
    currentImageIndex.value++
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 跳转到用户主页
const goToUserPage = () => {
  if (product.value?.seller_id) {
    router.push(`/user/${product.value.seller_id}`)
  } else {
    toast.error('无法获取卖家信息')
  }
}

// 辅助函数
const getCategoryText = (category) => {
  const categoryMap = {
    'electronics': '电子产品',
    'books': '图书教材',
    'clothes': '服装鞋帽',
    'daily': '生活用品',
    'sports': '运动器材',
    'beauty': '美妆护肤',
    'digital': '数码配件',
    'stationery': '文具用品',
    'food': '食品饮料',
    'other': '其他'
  }
  return categoryMap[category] || category
}

const getConditionText = (condition) => {
  const conditionMap = {
    'new': '全新',
    'like-new': '几乎全新',
    'good': '轻微使用痕迹',
    'fair': '明显使用痕迹',
    'poor': '重度使用'
  }
  return conditionMap[condition] || condition
}

const getStatusText = (status) => {
  const statusMap = {
    'available': '在售',
    'sold': '已售出',
    'reserved': '已预订'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchProduct()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 22px 36px 80px;
}

/* 移动端首屏操作条：桌面端不出现 */
.mobile-buybar {
  display: none;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 10px 8px 4px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  border-radius: 14px;
  transition: color 0.26s var(--fish-ease), background-color 0.26s var(--fish-ease);
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.back-btn:hover {
  color: var(--ink);
  background: var(--cream-2);
}

/* 加载 / 错误 */
.loading,
.error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 360px;
  margin-top: 12px;
  padding: 48px 24px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 24px;
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

.error-icon {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1px solid var(--danger);
  border-radius: 999px;
  color: var(--danger);
}

.error-icon svg {
  width: 36px;
  height: 36px;
}

.btn-back {
  min-height: 44px;
  padding: 10px 26px;
  background: var(--primary);
  border: none;
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(184, 68, 97, 0.24);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

/* 主体 */
.detail-container {
  position: relative;
  margin-top: 8px;
}

/* 已售出：图章 */
.sold-watermark {
  position: absolute;
  top: -6px;
  left: 20px;
  z-index: 5;
  padding: 6px 18px;
  background: var(--primary-3);
  border: none;
  border-radius: 999px;
  color: var(--primary-2);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  transform: rotate(-4deg);
  pointer-events: none;
}

.product-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 32px;
  align-items: start;
}

/* 左：图册 */
.product-gallery {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.main-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  box-shadow: 4px 6px 0 rgba(63, 61, 86, 0.055);
  cursor: zoom-in;
}

.main-image > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.34s var(--fish-ease);
}

.main-image:hover > img {
  transform: scale(1.02);
}

/* 图片计数：字段型标签 */
.preview-hint {
  position: absolute;
  left: 12px;
  bottom: 12px;
  min-height: 28px;
  padding: 4px 11px;
  display: inline-flex;
  align-items: center;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  z-index: 2;
  pointer-events: none;
}

.image-nav {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  pointer-events: none;
}

.nav-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--ink);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s var(--fish-ease);
}

.nav-btn svg {
  width: 18px;
  height: 18px;
}

.nav-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.nav-btn:disabled {
  opacity: 0.32;
  cursor: default;
  box-shadow: none;
}

/* 缩略图：纸片，选中项抬一层 */
.thumbnails {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 2px 6px;
}

.thumbnail {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  overflow: hidden;
  background: var(--cream-2);
  border: 1px solid var(--line-strong);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color 0.2s var(--fish-ease), box-shadow 0.2s var(--fish-ease);
}

.thumbnail.active {
  border-color: var(--primary-2);
  box-shadow: var(--shadow-soft);
}

.thumbnail:hover {
  border-color: var(--edge);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 规格：实线列表 */
.detail-list {
  margin-top: 2px;
  padding: 2px 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 46px;
  border-bottom: 1px dashed var(--line-strong);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.detail-item .value {
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.status-available { color: var(--success) !important; }
.status-sold { color: var(--danger) !important; }
.status-reserved { color: var(--warn-text) !important; }

/* 右：信息卡（第二张硬影卡） */
.product-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  box-shadow: 4px 6px 0 rgba(63, 61, 86, 0.055);
}

.product-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 600;
  line-height: 1.36;
  letter-spacing: 0.01em;
}

.price-section {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.price {
  color: var(--primary-2);
  font-family: var(--font-display);
  font-size: 42px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
}

.condition-tag {
  padding: 3px 9px;
  background: var(--butter-soft);
  border: 1px solid var(--butter);
  border-radius: 2px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 18px;
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.meta-item svg {
  width: 14px;
  height: 14px;
  color: var(--text-3);
}

/* 操作：一个实心主按钮 + 一个次级胶囊 */
.action-row {
  display: flex;
  gap: 10px;
  margin: 4px 0 2px;
}

.cta {
  flex: 1;
  min-height: 48px;
  font-size: 15px;
}

.cta:disabled,
.buybar-main:disabled {
  background: var(--cream-3);
  border-color: var(--line-strong);
  color: var(--primary-2);
  box-shadow: none;
  opacity: 1;
}

.cta-fav {
  min-width: 128px;
  min-height: 48px;
}

.cta-fav.active {
  background: var(--primary-3);
  border-color: var(--primary-2);
}

.seller-actions {
  margin: 4px 0 2px;
}

/* 描述 */
.description-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.description-section h3,
.seller-section h3 {
  margin: 0;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.description-text {
  color: var(--text-2);
  font-size: 15px;
  line-height: 1.85;
  word-break: break-word;
}

.description-text.collapsed {
  max-height: 320px;
  overflow: hidden;
}

.description-text :deep(h2),
.description-text :deep(h3),
.description-text :deep(h4) {
  margin: 14px 0 6px;
  color: var(--ink);
  font-weight: 800;
  line-height: 1.4;
}

.description-text :deep(h2) { font-size: 18px; }
.description-text :deep(h3) { font-size: 16px; }
.description-text :deep(h4) { font-size: 15px; }

.description-text :deep(strong) {
  color: var(--ink);
  font-weight: 800;
}

.description-text :deep(em) {
  color: var(--text-warm);
  font-style: normal;
  border-bottom: 2px solid var(--line-strong);
}

.description-text :deep(ul) {
  margin: 8px 0;
  padding-left: 20px;
}

.description-text :deep(li) {
  margin: 4px 0;
  list-style: disc;
}

.btn-toggle-description {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.btn-toggle-description svg {
  width: 16px;
  height: 16px;
}

.btn-toggle-description:hover {
  color: var(--primary-2);
}

/* 卖家 */
.seller-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.seller-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
}

.seller-card.clickable {
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease), border-color 0.26s var(--fish-ease);
}

.seller-card.clickable:hover {
  background: var(--cream-2);
  border-color: var(--edge);
}

.seller-avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--cream-2);
}

.seller-details {
  flex: 1;
  min-width: 0;
}

.seller-name {
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.seller-meta {
  color: var(--text-3);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.goto-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--text-3);
}

/* 图片预览：深色台面 */
.image-preview-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 72px 40px 32px;
  background: var(--panel-deep);
  animation: fadeIn 0.26s var(--fish-ease) both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-header {
  position: absolute;
  top: 18px;
  left: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-counter {
  padding: 5px 14px;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--on-panel);
  font-size: 13px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.btn-close {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--ink);
  cursor: pointer;
}

.btn-close svg {
  width: 20px;
  height: 20px;
}

.btn-close:hover {
  background: var(--cream-2);
}

.preview-content {
  position: relative;
  max-width: min(1000px, 88vw);
  max-height: 72vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border: 1px solid var(--line-strong);
  border-radius: 18px;
  background: var(--panel);
}

.preview-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--ink);
  cursor: pointer;
}

.preview-nav-btn svg {
  width: 22px;
  height: 22px;
}

.preview-nav-btn.prev { left: -64px; }
.preview-nav-btn.next { right: -64px; }

.preview-nav-btn:hover:not(:disabled) {
  background: var(--cream-2);
}

.preview-nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
  box-shadow: none;
}

.preview-thumbnails {
  display: flex;
  gap: 10px;
  max-width: 88vw;
  overflow-x: auto;
  padding: 4px 2px 8px;
}

.preview-thumb {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  cursor: pointer;
  opacity: 0.7;
}

.preview-thumb.active {
  border-color: var(--primary);
  opacity: 1;
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 平板 */
@media (max-width: 1200px) {
  .product-layout { gap: 26px; }
  .product-info { padding: 22px; }
  .price { font-size: 36px; }
  .product-title { font-size: 24px; }
}

/* 窄屏：单列，图在上 */
@media (max-width: 767px) {
  .product-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
  .main-image { aspect-ratio: 4 / 3; }
}

@media (max-width: 767px) {
  .main-content { padding: 12px 12px calc(168px + env(safe-area-inset-bottom, 0px)); }
  .product-info { padding: 18px; border-radius: 24px; }
  .product-title { font-size: 22px; }
  .price { font-size: 34px; }
  .product-info .action-row,
  .product-info .seller-actions { display: none; }
  .thumbnail { width: 56px; height: 56px; }
  .preview-hint { left: 8px; bottom: 8px; }
  .nav-btn { width: 36px; height: 36px; }
  .image-preview-modal { padding: 64px 12px 20px; }
  .preview-nav-btn { position: static; transform: none; margin: 0 6px; }
  .preview-content { flex-direction: column; gap: 10px; max-height: 66vh; }
  .preview-content img { max-height: 60vh; }
  .preview-thumbnails { max-width: 94vw; }

  /* 首屏常驻操作条 */
  .mobile-buybar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: var(--mobile-nav-space);
    z-index: 900;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--card);
    border-top: 1px solid var(--line-strong);
    box-shadow: 0 -6px 18px rgba(63,61,86,.06);
  }

  .buybar-summary {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .buybar-price {
    color: var(--primary-2);
    font-family: var(--font-mono);
    font-size: 19px;
    font-weight: 700;
    line-height: 1.05;
    font-variant-numeric: tabular-nums;
  }

  .buybar-title {
    color: var(--text-3);
    font-size: 11px;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .buybar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .buybar-main {
    min-height: 44px;
    padding: 0 18px;
    font-size: 14px;
  }

  .buybar-fav {
    min-width: 72px;
    min-height: 44px;
    padding: 0 12px;
    font-size: 13px;
  }

  .buybar-fav.active {
    background: var(--primary-3);
    border-color: var(--primary-2);
  }

  .buybar-state {
    color: var(--text-3);
    font-size: 13px;
    font-weight: 800;
  }
}
</style>
