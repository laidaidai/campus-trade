<template>
  <div class="app-container">
    <!-- 左侧导航栏(桌面端) -->
    <Sidebar v-if="!isAuthPage" :is-mobile="isMobile" />
    
    <!-- 主内容区 -->
    <div :class="['main-wrapper', { 'full-width': isAuthPage, 'mobile': isMobile }]">
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>
  </div>

  <!-- AI 悬浮助手 -->
  <AiAssistant />


  <!-- AI 悬浮助手 -->
  <AiAssistant />

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import AiAssistant from '@/components/AiAssistant.vue'
import AiAssistant from '@/components/AiAssistant.vue'
import { startTokenMonitor, checkAndClearExpiredToken } from '@/utils/token'

const router = useRouter()
const route = useRoute()
const transitionName = ref('slide-left')
const isMobile = ref(false)

// 判断是否是认证页面(不显示侧边栏)
const isAuthPage = computed(() => route.path === '/auth')

// 检测是否为移动端（包括iPad竖屏）
const checkMobile = () => {
  const width = window.innerWidth
  const isPortrait = window.matchMedia('(orientation: portrait)').matches
  
  // 768px以下，或者1024px以下且竖屏（iPad竖屏）
  isMobile.value = width <= 768 || (width <= 1024 && isPortrait)
}

let tokenMonitor = null

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  
  // 检查并清除过期的令牌
  checkAndClearExpiredToken()
  
  // 启动令牌监控
  tokenMonitor = startTokenMonitor(() => {
    // 令牌过期时的回调
    console.log('令牌已过期，正在跳转到登录页...')
    router.push('/auth')
  }, 5) // 每5分钟检查一次
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  
  // 清除令牌监控
  if (tokenMonitor) {
    clearInterval(tokenMonitor)
  }
})

// 监听路由变化，判断前进还是后退
let isBack = false
router.beforeEach((to, from) => {
  // 判断是否为后退操作
  const toDepth = to.meta.depth || 0
  const fromDepth = from.meta.depth || 0
  
  // 所有页面切换使用平滑的淡入淡出
  if (toDepth < fromDepth || isBack) {
    transitionName.value = 'fade'
    isBack = false
  } else {
    transitionName.value = 'fade'
  }
})

// 监听浏览器后退按钮
window.addEventListener('popstate', () => {
  isBack = true
})
</script>

<style>
/* global app styles */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 平滑的淡入淡出过渡动画 */
.fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 新布局样式 */
.app-container {
  display: flex;
  min-height: 100vh;
}

.main-wrapper {
  flex: 1;
  margin-left: 240px;
  min-height: 100vh;
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow-x: hidden;
}

.main-wrapper.full-width {
  margin-left: 0;
}

/* 移动端布局 */
.main-wrapper.mobile {
  margin-left: 0 !important;
  margin-bottom: 70px; /* 为底部导航栏留出空间 */
}

/* 响应式 */
/* iPad竖屏：手机模式 */
@media (max-width: 1024px) and (orientation: portrait) {
  .main-wrapper {
    margin-left: 0 !important;
    margin-bottom: 70px;
  }
  
  .main-wrapper.full-width {
    margin-bottom: 0;
  }
}

/* iPad横屏：桌面模式（缩略侧边栏） */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .main-wrapper:not(.full-width) {
    margin-left: 80px;
  }
}

/* 手机 */
@media (max-width: 768px) {
  .main-wrapper {
    margin-left: 0 !important;
    margin-bottom: 70px;
  }
  
  .main-wrapper.full-width {
    margin-bottom: 0;
  }
}
</style>
