<template>
  <div class="app-container">
    <a href="#main-content" class="skip-link">跳到主要内容</a>
    <!-- 顶部导航（桌面与移动共用） -->
    <TopHeader v-if="!isAuthPage" />

    <!-- 主内容区 -->
    <div id="main-content" :class="['main-wrapper', { 'full-width': isAuthPage, 'mobile': isMobile }]">
      <router-view v-slot="{ Component, route }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </div>

    <!-- 移动端底部主导航 -->
    <Sidebar v-if="isMobile && !isAuthPage" :is-mobile="true" />
  </div>

  <!-- AI 悬浮助手 -->
  <AiAssistant />

</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '@/components/Sidebar.vue'
import TopHeader from '@/components/TopHeader.vue'
import AiAssistant from '@/components/AiAssistant.vue'
import { startTokenMonitor, checkAndClearExpiredToken } from '@/utils/token'

const router = useRouter()
const route = useRoute()
const transitionName = ref('slide-left')
const isMobile = ref(false)

// 判断是否是认证页面(不显示侧边栏)
const isAuthPage = computed(() => route.path === '/auth' || route.path === '/reset-password')

// 检测是否为手机布局
const checkMobile = () => {
  // 手机边界：小于 768px；768px 起按平板/桌面自适应
  isMobile.value = window.innerWidth < 768
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
.skip-link {
  position: fixed;
  top: 10px;
  left: 12px;
  z-index: 9999;
  padding: 10px 16px;
  background: var(--ink);
  border-radius: 999px;
  color: var(--card);
  font-size: 12px;
  font-weight: 700;
  transform: translateY(-160%);
  transition: transform 0.18s var(--fish-ease);
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline-color: var(--card);
}

/* 全局应用壳：顶部导航 + 居中内容列 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 页面切换：轻盈上浮，不弹跳 */
.fade-enter-active {
  transition: opacity 0.24s var(--fish-ease), transform 0.24s var(--fish-ease);
}
.fade-leave-active {
  transition: opacity 0.16s var(--fish-ease), transform 0.16s var(--fish-ease);
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.app-container {
  min-height: 100vh;
  background: var(--bg);
}

.main-wrapper {
  width: 100%;
  min-height: 100vh;
  padding-top: calc(74px + env(safe-area-inset-top, 0px));
  position: relative;
  overflow-x: clip;
  background: var(--bg);
}

.main-wrapper.full-width {
  padding-top: 0;
}

.main-wrapper.mobile {
  padding-top: calc(60px + env(safe-area-inset-top, 0px));
  padding-bottom: var(--mobile-nav-space);
}

@media (max-width: 767px) {
  .main-wrapper {
    padding-top: calc(60px + env(safe-area-inset-top, 0px));
    padding-bottom: var(--mobile-nav-space);
  }
  .main-wrapper.full-width {
    padding-top: 0;
    padding-bottom: 0;
  }
}
</style>
