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
      
      <!-- 手写价签：贴在商品图上的集市标签 -->
      <div class="price-tag">
        <span class="tag-price">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.originalPrice" class="tag-original">¥{{ formatPrice(product.originalPrice) }}</span>
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
        <div class="seller-info">
          <img :src="resolveAvatar(product.sellerAvatar, product.sellerName)" :alt="product.sellerName" class="avatar" />
          <span class="seller-name">{{ product.sellerName }}</span>
        </div>

        <span class="meta-inline">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          {{ product.favoriteCount ?? product.favorite_count ?? 0 }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { resolveAvatar } from '@/utils/avatar'
import { formatPrice } from '@/utils/price'
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
/* 集市纸卡：薄边、硬影、贴在墙上的小海报 */
.xhs-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 3px 4px 0 rgba(63, 61, 86, 0.06);
  transition: transform 0.3s var(--fish-ease), box-shadow 0.3s var(--fish-ease),
    border-color 0.3s var(--fish-ease);
  animation: cardIn 0.34s var(--fish-ease) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.xhs-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary-3);
  box-shadow: 4px 7px 0 rgba(63, 61, 86, 0.09);
}

.xhs-card:active {
  transform: translateY(-1px);
  box-shadow: 3px 4px 0 rgba(63, 61, 86, 0.06);
}

.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
}

.card-image :deep(img) {
  transition: transform 0.42s var(--fish-ease);
}

.xhs-card:hover .card-image :deep(img) {
  transform: scale(1.035);
}

/* 已售出：只盖一枚章，不遮住商品 */
.sold-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  pointer-events: none;
  z-index: 2;
}

.sold-watermark {
  padding: 3px 9px;
  color: var(--primary-2);
  background: rgba(255, 253, 249, 0.94);
  border: 1px solid rgba(184, 68, 97, 0.3);
  border-radius: 3px;
  font-family: var(--font-serif);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  white-space: nowrap;
  transform: rotate(-4deg);
  user-select: none;
}

.delete-icon {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 253, 249, 0.94);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  box-shadow: 2px 2px 0 rgba(63, 61, 86, 0.06);
  cursor: pointer;
  z-index: 3;
  transition: background-color 0.24s var(--fish-ease), transform 0.24s var(--fish-ease);
}

.delete-icon.force-show { opacity: 1 !important; }

.delete-icon svg {
  width: 18px;
  height: 18px;
  color: var(--text-2);
  transition: color 0.24s var(--fish-ease);
}

.delete-icon:hover {
  background: var(--danger-bg);
  transform: scale(1.04);
}

.delete-icon:hover svg {
  color: var(--danger);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 13px 14px 12px;
}

.card-title {
  margin: 0;
  min-height: 44px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.015em;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 9px;
  border-top: 1px dashed var(--line);
}

/* 贴在图片左下角的价签 */
.price-tag {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 4px 9px 5px;
  background: var(--butter-soft);
  border: 1px solid rgba(229, 189, 114, 0.66);
  border-radius: 2px;
  box-shadow: 2px 2px 0 rgba(63, 61, 86, 0.06);
  transform: rotate(-2.4deg);
}

.tag-price {
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.tag-original {
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 9px;
  text-decoration: line-through;
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
  border-radius: 999px;
  box-shadow: 0 0 0 2px rgba(184, 68, 97, 0.13);
}

.seller-name {
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 500;
}

.meta-inline {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.meta-inline svg {
  width: 13px;
  height: 13px;
  color: var(--primary);
}

@media (max-width: 767px) {
  .card-content {
    gap: 7px;
    padding: 11px 11px 10px;
  }

  .card-title {
    min-height: 40px;
    font-size: 14px;
    line-height: 1.45;
  }

  .seller-name {
    max-width: 62px;
    font-size: 10px;
  }

  .price-tag {
    left: 7px;
    bottom: 7px;
    padding: 3px 7px 4px;
  }

  .tag-price { font-size: 12px; }

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
    padding: 5px 12px;
    font-size: 14px;
  }
}

/* 触屏没有 hover：避免卡片和图片在点按后停留在悬停态 */
@media (hover: none), (pointer: coarse) {
  .xhs-card:hover {
    transform: none;
    border-color: var(--line);
    box-shadow: var(--shadow-sm);
  }
  .xhs-card:hover .card-image :deep(img) { transform: none; }
}
</style>
