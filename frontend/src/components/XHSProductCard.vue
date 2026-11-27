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

      <div class="price-row">
        <span class="price-now">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.originalPrice" class="price-original">¥{{ formatPrice(product.originalPrice) }}</span>
      </div>

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
/* 商品卡：陶土色系的目录卡片，图片在上，文字与价格在下 */
.xhs-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  box-shadow: none;
  transition: border-color 0.2s var(--fish-ease), transform 0.2s var(--fish-ease);
  animation: cardIn 0.3s var(--fish-ease) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.xhs-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}

.xhs-card:active {
  transform: translateY(0);
}

.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 1px solid var(--line);
}

.card-image :deep(img) {
  transition: transform 0.36s var(--fish-ease);
}

.xhs-card:hover .card-image :deep(img) {
  transform: scale(1.025);
}

/* 已售：左上角的一枚状态签 */
.sold-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  pointer-events: none;
  z-index: 2;
}

.sold-watermark {
  padding: 3px 8px;
  color: var(--primary-2);
  background: var(--card);
  border: 1px solid var(--primary);
  border-radius: 2px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  user-select: none;
}

.delete-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  cursor: pointer;
  z-index: 3;
  transition: background-color 0.18s var(--fish-ease), border-color 0.18s var(--fish-ease);
}

.delete-icon.force-show { opacity: 1 !important; }

.delete-icon svg {
  width: 16px;
  height: 16px;
  color: var(--text-2);
  transition: color 0.18s var(--fish-ease);
}

.delete-icon:hover {
  background: var(--danger-bg);
  border-color: var(--danger);
}

.delete-icon:hover svg {
  color: var(--danger);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 13px 12px;
}

.card-title {
  margin: 0;
  min-height: 44px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
}

.price-now {
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.price-original {
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 11px;
  text-decoration: line-through;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.seller-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.avatar {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 50%;
}

.seller-name {
  max-width: 82px;
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
  width: 12px;
  height: 12px;
  color: var(--text-4);
}

@media (max-width: 767px) {
  .card-content {
    gap: 6px;
    padding: 10px 10px 9px;
  }

  .card-title {
    min-height: 40px;
    font-size: 14px;
    line-height: 1.45;
  }

  .price-now { font-size: 15px; }

  .seller-name {
    max-width: 64px;
    font-size: 11px;
  }

  .delete-icon {
    width: 30px;
    height: 30px;
    top: 6px;
    right: 6px;
    opacity: 1;
  }

  .delete-icon svg { width: 14px; height: 14px; }

  .sold-watermark { font-size: 11px; }
}

@media (hover: none), (pointer: coarse) {
  .xhs-card:hover {
    transform: none;
    border-color: var(--line);
  }
  .xhs-card:hover .card-image :deep(img) { transform: none; }
}
</style>
