<template>
  <div class="xhs-card" @click="goToDetail">
    <!-- 商品图片 -->
    <div class="card-image">
      <OptimizedImage
        :src="product.image"
        :alt="product.title"
        :lazy="false"
        :quality="80"
        :max-width="300"
        aspect-ratio="1/1"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <!-- 已售出水印 -->
      <div v-if="product.status === 'sold'" class="sold-overlay">
        <div class="sold-watermark">已售出</div>
      </div>
      
      <!-- 删除图标 (在收藏页面显示，无论是否售出) -->
      <div 
        v-if="showDeleteIcon" 
        class="delete-icon" 
        :class="{ 'force-show': forceShowDelete }"
        @click.stop="handleDelete"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="card-content">
      <h3 class="card-title">{{ product.title }}</h3>
      
      <div class="card-footer">
        <div class="price-info">
          <span class="price">¥{{ product.price }}</span>
          <span v-if="product.originalPrice" class="original-price">¥{{ product.originalPrice }}</span>
        </div>
        
        <div class="seller-info">
          <img :src="getImageUrl(product.sellerAvatar)" :alt="product.sellerName" class="avatar" />
          <span class="seller-name">{{ product.sellerName }}</span>
        </div>
      </div>

      <!-- 点赞和浏览 -->
      <div class="meta-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <span>{{ product.favoriteCount ?? product.favorite_count ?? 0 }} 人收藏</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getImageUrl } from '@/config'
import OptimizedImage from './OptimizedImage.vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  showDeleteIcon: {
    type: Boolean,
    default: false
  },
  forceShowDelete: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['delete'])

const router = useRouter()
const isFavorite = ref(false)
const isLiked = ref(false)
const likes = ref(Math.floor(Math.random() * 500))

function handleImageLoad() {
  // 图片加载成功处理
}

function handleImageError() {
  // 图片加载失败处理
}

function goToDetail() {
  router.push(`/product/${props.product.id}`)
}

function toggleFavorite() {
  isFavorite.value = !isFavorite.value
}

function toggleLike() {
  isLiked.value = !isLiked.value
  likes.value += isLiked.value ? 1 : -1
}

function contactSeller() {
  // 跳转到商品详情页或消息页面
  router.push(`/product/${props.product.id}`)
}

function handleDelete() {
  emit('delete', props.product.id)
}

function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num
}
</script>

<style scoped>
/* Fish UI 纸卡：墨线 + 大圆角，硬影只给悬停 */
.xhs-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 18px;
  cursor: pointer;
  transition: transform 0.34s var(--fish-ease),
              box-shadow 0.34s var(--fish-ease),
              background-color 0.34s var(--fish-ease);
  animation: cardIn 0.34s var(--fish-ease) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.xhs-card:hover {
  transform: translateY(-3px);
  box-shadow: 5px 6px 0 var(--shadow);
  background: var(--cream-1);
}

.xhs-card:active {
  transform: translateY(1px);
  box-shadow: 2px 3px 0 var(--shadow);
}

/* 图片：正方形，切口圆角 */
.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 2px solid var(--edge);
}

.card-image :deep(img) {
  transition: transform 0.34s var(--fish-ease);
}

.xhs-card:hover .card-image :deep(img) {
  transform: scale(1.03);
}

/* 已售出：图章，不是水印 */
.sold-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-1);
  opacity: 0.94;
  pointer-events: none;
  z-index: 2;
}

.sold-watermark {
  padding: 6px 16px;
  color: var(--danger);
  background: var(--card);
  border: 3px solid var(--danger);
  border-radius: 14px;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 0.08em;
  white-space: nowrap;
  transform: rotate(-12deg);
  user-select: none;
}

/* 删除：圆钮，危险色只在悬停 */
.delete-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 2px 3px 0 var(--shadow);
  cursor: pointer;
  z-index: 3;
  transition: background-color 0.26s var(--fish-ease),
              transform 0.26s var(--fish-ease);
}

.delete-icon.force-show { opacity: 1 !important; }

.delete-icon svg {
  width: 18px;
  height: 18px;
  color: var(--text-2);
  transition: color 0.26s var(--fish-ease);
}

.delete-icon:hover {
  background: var(--danger);
  transform: translateY(-1px);
}

.delete-icon:hover svg {
  color: var(--on-primary);
}

/* 信息区 */
.card-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 12px;
}

.card-title {
  margin: 0;
  min-height: 44px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
}

.price-info {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.price {
  color: var(--primary-2);
  font-size: 22px;
  font-weight: 900;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.original-price {
  color: var(--text-4);
  font-size: 12px;
  text-decoration: line-through;
  font-variant-numeric: tabular-nums;
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.avatar {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
}

.seller-name {
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-3);
  font-size: 11px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 9px;
  border-top: 1.5px solid var(--line);
  color: var(--text-3);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.meta-item svg {
  width: 13px;
  height: 13px;
  color: var(--text-3);
}

/* 响应式：窄屏不缩字号，只收紧间距 */
@media (max-width: 768px) {
  .card-content {
    gap: 8px;
    padding: 10px 10px 9px;
  }

  .card-title {
    min-height: 40px;
    font-size: 14px;
  }

  .price {
    font-size: 18px;
  }

  .seller-name {
    max-width: 62px;
    font-size: 10px;
  }

  .delete-icon {
    width: 32px;
    height: 32px;
    top: 6px;
    right: 6px;
  }

  .delete-icon svg {
    width: 15px;
    height: 15px;
  }

  .sold-watermark {
    padding: 4px 10px;
    border-width: 2px;
    font-size: 15px;
  }
}
</style>
