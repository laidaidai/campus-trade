<template>
  <div class="product-card" @click="goToDetail">
    <!-- 商品图片 -->
    <div class="product-image">
      <OptimizedImage 
        :src="product.image" 
        :alt="product.title"
        :lazy="false"
        :quality="80"
        :max-width="300"
        aspect-ratio="1/1"
      />
      <!-- 已售出水印 -->
      <div v-if="product.status === 'sold'" class="sold-watermark">
        已售出
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="product-info">
      <h3 class="product-title">{{ product.title }}</h3>
      
      <div class="product-price">
        <span class="price">¥{{ formatPrice(product.price) }}</span>
        <span v-if="product.originalPrice" class="original-price">¥{{ formatPrice(product.originalPrice) }}</span>
      </div>

      <div class="product-meta">
        <span class="location">
          <span class="icon-location"></span>
          {{ product.location }}
        </span>
        <span class="views">
          <span class="icon-view"></span>
          {{ product.views }}
        </span>
      </div>

      <div class="product-footer">
        <div class="seller">
          <img :src="getImageUrl(product.sellerAvatar)" :alt="product.sellerName" class="avatar" />
          <span class="seller-name">{{ product.sellerName }}</span>
        </div>
        <span class="time">{{ product.publishTime }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { getImageUrl } from '@/config'
import OptimizedImage from './OptimizedImage.vue'
import { formatPrice } from '@/utils/price'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const router = useRouter()

function goToDetail() {
  router.push(`/product/${props.product.id}`)
}
</script>

<style scoped>
.product-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-in-out);
  box-shadow: var(--shadow-sm);
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.product-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-lg);
  border-color: rgba(255, 36, 66, 0.3);
}

/* 商品图片 */
.product-image {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background: #f5f5f5;
  overflow: hidden;
}

.product-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base) var(--ease-in-out);
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

/* 已售出水印 */
.sold-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-25deg);
  font-size: 40px;
  font-weight: 900;
  font-style: italic;
  color: rgba(255, 0, 0, 0.6);
  text-shadow: 
    2px 2px 4px rgba(255, 255, 255, 0.8),
    -2px -2px 4px rgba(255, 255, 255, 0.8);
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

/* 商品信息 */
.product-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.product-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  min-height: 2.8em;
}

.product-price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-light);
}

.original-price {
  font-size: 13px;
  color: var(--text-tertiary);
  text-decoration: line-through;
}

.product-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

.location,
.views {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-location,
.icon-view {
  width: 14px;
  height: 14px;
  display: inline-block;
  position: relative;
  flex-shrink: 0;
}

.icon-location::before {
  content: '';
  position: absolute;
  width: 8px;
  height: 8px;
  border: 2px solid currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  top: 1px;
  left: 50%;
  margin-left: -4px;
}

.icon-location::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 3px;
  background: currentColor;
  border-radius: 50%;
  top: 4px;
  left: 50%;
  margin-left: -1.5px;
}

.icon-view::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 7px;
  border: 1.5px solid currentColor;
  border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-view::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
  margin-top: auto;
}

.seller {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.seller-name {
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* 响应式 */
@media (max-width: 768px) {
  .product-info {
    padding: 10px;
  }
  
  .product-title {
    font-size: 13px;
  }
  
  .price {
    font-size: 18px;
  }
}
</style>
