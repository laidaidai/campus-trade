<template>
  <aside :class="['sidebar', { 'mobile': isMobile }]">
    <!-- Logo (桌面端) -->
    <div v-if="!isMobile" class="sidebar-logo">
      <div class="logo-mark" aria-label="校园交易">校</div>
      <div class="logo-copy">
        <span class="logo-text">校园交易</span>
        <span class="logo-sub">CAMPUS TRADE</span>
      </div>
    </div>

    <!-- 桌面端：发布作为唯一主操作 -->
    <router-link v-if="!isMobile" to="/publish" class="sidebar-cta" @click="handleNavClick">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>发布闲置</span>
    </router-link>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" :class="{ 'navigating': isNavigating }" @click="handleNavClick">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="nav-text">首页</span>
      </router-link>

      <router-link v-if="isMobile" to="/publish" class="nav-item" :class="{ 'navigating': isNavigating }" @click="handleNavClick">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="16"></line>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <span class="nav-text">发布</span>
      </router-link>

      <router-link to="/messages" class="nav-item" :class="{ 'navigating': isNavigating }" @click="handleNavClick">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="nav-text">消息</span>
        <span v-if="unreadCount > 0" class="badge nav-badge">{{ unreadCount }}</span>
      </router-link>

      <router-link to="/favorites" class="nav-item" :class="{ 'navigating': isNavigating }" @click="handleNavClick">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <span class="nav-text">收藏</span>
      </router-link>

      <router-link to="/profile" class="nav-item" :class="{ 'navigating': isNavigating }" @click="handleNavClick">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span class="nav-text">我的</span>
      </router-link>
    </nav>

    <!-- 底部：用户（桌面端） -->
    <div v-if="!isMobile" class="sidebar-foot">
      <div class="sidebar-user">
        <div v-if="userStore.isLoggedIn" class="user-info">
          <div class="avatar-frame">
            <img :src="userAvatar" alt="头像" class="user-avatar" />
          </div>
          <div class="user-details">
            <div class="user-name">{{ userStore.userInfo?.username }}</div>
            <button type="button" @click="logout" class="btn-logout">退出</button>
          </div>
        </div>
        <router-link v-else to="/auth" class="btn-login">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
          登录 / 注册
        </router-link>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import socketService from '@/utils/socket'
import { getUnreadCount } from '@/api/message'
import { resolveAvatar } from '@/utils/avatar'

const props = defineProps({
  isMobile: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const userStore = useUserStore()

const unreadCount = ref(0)
const isNavigating = ref(false)

// 计算用户头像URL
const userAvatar = computed(() => {
  const info = userStore.userInfo
  return resolveAvatar(info?.avatar, info?.username)
})

// 获取未读消息数
const fetchUnreadCount = async () => {
  if (!userStore.isLoggedIn) return

  try {
    const response = await getUnreadCount()
    unreadCount.value = response.data?.count || 0
  } catch (error) {
    console.error('获取未读消息数失败:', error)
  }
}

const handleUnreadCountUpdate = (data) => {
  unreadCount.value = data.count || 0
}

const handleNewMessage = () => {
  unreadCount.value = (unreadCount.value || 0) + 1
}

const logout = () => {
  userStore.logout()
  router.push('/')
}

const handleNavClick = (event) => {
  if (isNavigating.value) {
    event.preventDefault()
    return
  }

  isNavigating.value = true

  setTimeout(() => {
    isNavigating.value = false
  }, 300)
}

watch(() => userStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    fetchUnreadCount()
    const token = localStorage.getItem('token')
    if (token && !socketService.socket?.connected) {
      socketService.connect(token)
    }
  } else {
    unreadCount.value = 0
  }
})

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchUnreadCount()

    socketService.on('unread_count_updated', handleUnreadCountUpdate)
    socketService.on('new_message', handleNewMessage)
  }
})

onUnmounted(() => {
  socketService.off('unread_count_updated', handleUnreadCountUpdate)
  socketService.off('new_message', handleNewMessage)
})
</script>

<style scoped>
/* Friendly 侧栏：奶油白、粉色主操作、柔和悬停 */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 244px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-right: 1px solid var(--line);
  box-shadow: 8px 0 32px rgba(63, 61, 86, 0.05);
  z-index: 1000;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 26px 22px 20px;
}

.logo-mark {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--primary);
  color: var(--on-primary);
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(184, 68, 97, 0.28);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.logo-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.logo-text {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.logo-sub {
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

/* 主操作 */
.sidebar-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin: 4px 18px 8px;
  padding: 11px 16px;
  background: var(--primary);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 20px rgba(184, 68, 97, 0.24);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.24s var(--fish-ease), box-shadow 0.24s var(--fish-ease),
    background-color 0.24s var(--fish-ease);
}

.sidebar-cta:hover {
  transform: translateY(-1px);
  background: var(--primary-2);
  box-shadow: 0 12px 26px rgba(184, 68, 97, 0.3);
}

.sidebar-cta:active {
  transform: translateY(1px);
}

.sidebar-cta svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 导航 */
.sidebar-nav {
  flex: 1;
  padding: 12px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: var(--text-2);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.24s var(--fish-ease),
    color 0.24s var(--fish-ease);
}

.nav-item:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.nav-item:active {
  background: var(--cream-3);
}

.nav-item.router-link-active {
  background: var(--cream-1);
  color: var(--primary-2);
}

.nav-item.router-link-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 4px;
  height: 18px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: var(--primary);
}

.nav-item.router-link-active .nav-icon {
  color: var(--primary-2);
}

.nav-item.navigating {
  pointer-events: none;
  opacity: 0.7;
}

.nav-icon {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
  color: var(--ink);
}

.nav-text {
  flex: 1;
}

.nav-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  background: var(--primary);
  border: none;
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 700;
}

/* 底部 */
.sidebar-foot {
  padding: 14px 16px 18px;
  border-top: 1px solid var(--line);
}

.sidebar-user {
  min-height: 52px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: var(--cream-1);
  border-radius: var(--radius-md);
}

.avatar-frame {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--cream-2);
  border-radius: var(--radius-full);
  box-shadow: 0 0 0 3px rgba(184, 68, 97, 0.16);
}

.user-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-logout {
  margin-top: 1px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.btn-logout:hover {
  color: var(--danger);
}

.btn-login {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 46px;
  padding: 10px 14px;
  background: var(--primary);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 20px rgba(184, 68, 97, 0.24);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.24s var(--fish-ease), background-color 0.24s var(--fish-ease);
}

.btn-login svg {
  width: 18px;
  height: 18px;
}

.btn-login:hover {
  transform: translateY(-1px);
  background: var(--primary-2);
}

.btn-login:active {
  transform: translateY(1px);
}

/* iPad 横屏：只留图标 */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .sidebar {
    width: 80px;
  }

  .logo-copy {
    display: none;
  }

  .sidebar-logo {
    justify-content: center;
    padding: 22px 0 18px;
  }

  .logo-mark {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .nav-text,
  .user-details,
  .sidebar-cta span {
    display: none;
  }

  .sidebar-cta {
    width: 52px;
    height: 52px;
    margin: 10px auto 6px;
    padding: 0;
    flex-shrink: 0;
    border-radius: 18px;
  }

  .sidebar-nav {
    padding: 10px 12px;
    align-items: center;
  }

  .nav-item {
    width: 52px;
    height: 52px;
    padding: 0;
    justify-content: center;
  }

  .nav-item.router-link-active::before {
    left: -1px;
  }

  .nav-badge {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .sidebar-foot {
    display: flex;
    justify-content: center;
    padding: 12px 8px;
  }

  .user-info {
    justify-content: center;
    padding: 6px;
    background: transparent;
  }

  .btn-login {
    width: 52px;
    min-height: 52px;
    padding: 0;
    border-radius: 18px;
    font-size: 0;
    gap: 0;
  }

  .btn-login svg {
    width: 20px;
    height: 20px;
  }
}

/* 手机：底部 tab */
@media (max-width: 767px) {
  .sidebar.mobile {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    height: auto;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-top: 1px solid var(--line);
    box-shadow: 0 -10px 30px rgba(63, 61, 86, 0.08);
    z-index: 1000;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .sidebar.mobile .sidebar-nav {
    flex-direction: row;
    width: 100%;
    padding: 6px 8px 0;
    gap: 0;
    overflow: visible;
  }

  .sidebar.mobile .nav-item {
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-height: 66px;
    padding: 8px 4px 6px;
    border: none;
    border-radius: 0;
    font-size: 11px;
    color: var(--text-3);
  }

  .sidebar.mobile .nav-item:hover,
  .sidebar.mobile .nav-item:active {
    background: transparent;
  }

  .sidebar.mobile .nav-item.router-link-active {
    background: transparent;
    color: var(--primary-2);
  }

  .sidebar.mobile .nav-item.router-link-active::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 2px;
    bottom: auto;
    width: 22px;
    height: 3px;
    transform: translateX(-50%);
    background: var(--primary);
    border-radius: 999px;
  }

  .sidebar.mobile .nav-item.router-link-active .nav-icon {
    color: var(--primary-2);
  }

  .sidebar.mobile .nav-icon {
    width: 23px;
    height: 23px;
  }

  .sidebar.mobile .nav-text {
    display: block;
    font-size: 11px;
    font-weight: 600;
  }

  .sidebar.mobile .nav-badge {
    position: absolute;
    top: 3px;
    right: calc(50% - 21px);
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    font-size: 10px;
  }

  .sidebar.mobile .sidebar-foot,
  .sidebar.mobile .sidebar-logo {
    display: none;
  }
}
</style>
