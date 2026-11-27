<template>
  <div class="optimized-image-container" :style="{ aspectRatio: aspectRatio }">
    <!-- 占位符 -->
    <div v-if="!imageLoaded && !imageError" class="image-placeholder">
      <div class="placeholder-content">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </div>
        <div class="placeholder-text">加载中...</div>
      </div>
    </div>
    
    <!-- 错误占位符 -->
    <div v-if="imageError" class="image-error">
      <div class="error-content">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="error-text">图片加载失败</div>
        <button v-if="showRetry" @click="retryLoad" class="retry-btn">重试</button>
      </div>
    </div>
    
    <!-- 实际图片 -->
    <img
      v-show="imageLoaded && !imageError"
      :src="optimizedSrc"
      :alt="alt"
      :class="['optimized-image', { 'image-loaded': imageLoaded }]"
      :loading="lazy ? 'lazy' : 'eager'"
      @load="handleImageLoad"
      @error="handleImageError"
      @click="handleClick"
    />
    
    <!-- 移除加载进度条 -->
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { getImageUrl } from '@/config'
import imagePreloader from '@/utils/imagePreloader'
import performanceMonitor from '@/utils/performanceMonitor'

const props = defineProps({
  // 图片源
  src: {
    type: String,
    required: true
  },
  // 替代文本
  alt: {
    type: String,
    default: ''
  },
  // 是否懒加载
  lazy: {
    type: Boolean,
    default: false  // 默认不懒加载，避免浏览器干预
  },
  // 宽高比
  aspectRatio: {
    type: String,
    default: '1/1'
  },
  // 是否显示重试按钮
  showRetry: {
    type: Boolean,
    default: true
  },
  // 图片质量 (1-100)
  quality: {
    type: Number,
    default: 80  // 降低默认质量以提高加载速度
  },
  // 最大宽度
  maxWidth: {
    type: Number,
    default: 400  // 降低默认宽度以提高加载速度
  }
})

const emit = defineEmits(['load', 'error', 'click'])

const imageLoaded = ref(false)
const imageError = ref(false)
const loadingProgress = ref(0)
const retryCount = ref(0)
const maxRetries = 3

// 优化的图片源
const optimizedSrc = computed(() => {
  if (!props.src) return ''
  
  return getImageUrl(props.src, {
    quality: props.quality,
    width: props.maxWidth,
    webp: true
  })
})

// 处理图片加载成功
const handleImageLoad = (event) => {
  imageLoaded.value = true
  imageError.value = false
  loadingProgress.value = 100
  
  // 记录性能数据
  const loadTime = performance.now() - (event.target._startTime || 0)
  performanceMonitor.recordImageLoad(optimizedSrc.value, loadTime, event.target.complete)
  
  // 添加淡入动画
  nextTick(() => {
    const img = event.target
    img.style.opacity = '0'
    img.style.transition = 'opacity 0.3s ease'
    requestAnimationFrame(() => {
      img.style.opacity = '1'
    })
  })
  
  emit('load', event)
}

// 处理图片加载错误
const handleImageError = (event) => {
  console.warn('图片加载失败:', props.src, '生成URL:', optimizedSrc.value)
  
  // 记录错误
  performanceMonitor.recordImageError(optimizedSrc.value)
  
  if (retryCount.value < maxRetries) {
    retryCount.value++
    console.log(`尝试重新加载图片 (${retryCount.value}/${maxRetries})`)
    
    // 延迟重试
    setTimeout(() => {
      const img = event.target
      img.src = img.src + '?retry=' + retryCount.value
    }, 1000 * retryCount.value)
  } else {
    imageError.value = true
    imageLoaded.value = false
    loadingProgress.value = 0
  }
  
  emit('error', event)
}

// 重试加载
const retryLoad = () => {
  imageError.value = false
  retryCount.value = 0
  loadingProgress.value = 0
  
  // 强制重新加载
  const img = document.querySelector('.optimized-image')
  if (img) {
    img.src = optimizedSrc.value + '?retry=' + Date.now()
  }
}

// 处理点击事件
const handleClick = (event) => {
  emit('click', event)
}

// 快速加载，不显示进度
const simulateProgress = () => {
  loadingProgress.value = 100
}

// 预加载图片
const preloadImage = async () => {
  if (!props.src) return
  
  try {
    // 记录开始时间
    const startTime = performance.now()
    
    // 预加载图片
    await imagePreloader.preload(optimizedSrc.value, {
      timeout: 10000,
      crossOrigin: 'anonymous'
    })
    
    // 记录预加载时间
    const loadTime = performance.now() - startTime
    performanceMonitor.recordImageLoad(optimizedSrc.value, loadTime, true)
  } catch (error) {
    console.warn('图片预加载失败:', error)
    performanceMonitor.recordImageError(optimizedSrc.value)
  }
}

// 监听图片源变化
watch(() => props.src, () => {
  imageLoaded.value = false
  imageError.value = false
  loadingProgress.value = 0
  retryCount.value = 0
  
  if (props.src) {
    simulateProgress()
    // 如果不是懒加载，立即预加载
    if (!props.lazy) {
      preloadImage()
    }
  }
}, { immediate: true })

// 组件挂载时开始模拟进度
onMounted(() => {
  if (props.src && !props.lazy) {
    simulateProgress()
    preloadImage()
  }
})
</script>

<style scoped>
.optimized-image-container {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--cream-2);
  border-radius: 3px;
}

.optimized-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s var(--fish-ease);
}

.optimized-image.image-loaded { opacity: 1; }

/* 占位：纯色呼吸，不做渐变扫光 */
.image-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-2);
  animation: breathe 1.4s ease-in-out infinite alternate;
}

@keyframes breathe {
  from { opacity: 0.55; }
  to { opacity: 1; }
}

.placeholder-content {
  color: var(--text-3);
  text-align: center;
}

.placeholder-icon {
  width: 30px;
  height: 30px;
  margin: 0 auto 8px;
  opacity: 0.6;
}

.placeholder-icon svg {
  width: 100%;
  height: 100%;
}

.placeholder-text {
  color: var(--text-4);
  font-size: 12px;
}

/* 失败占位 */
.image-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-1);
}

.error-content {
  color: var(--text-3);
  text-align: center;
}

.error-icon {
  width: 30px;
  height: 30px;
  margin: 0 auto 8px;
  opacity: 0.6;
}

.error-icon svg {
  width: 100%;
  height: 100%;
}

.error-text {
  margin-bottom: 8px;
  color: var(--text-4);
  font-size: 12px;
}

.retry-btn {
  min-height: 28px;
  padding: 4px 12px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.retry-btn:hover {
  background: var(--cream-2);
  color: var(--ink);
}

/* 进度 */
.loading-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: var(--cream-1);
  border-top: 1px solid var(--line);
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.3s var(--fish-ease);
}
</style>
