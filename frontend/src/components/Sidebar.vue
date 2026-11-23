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

    <!-- 底部：主题 + 用户（桌面端） -->
    <div v-if="!isMobile" class="sidebar-foot">
      <div class="theme-block">
        <span class="theme-label">主题</span>
        <div class="theme-dots" role="group" aria-label="主题选择">
          <button
            v-for="t in THEMES"
            :key="t.id"
            type="button"
            class="theme-dot"
            :class="{ active: currentTheme === t.id }"
            :style="{ background: t.bg, borderColor: t.ink }"
            :title="t.name"
            :aria-label="t.name"
            @click="pickTheme(t.id)"
          >
            <span class="dot-core" :style="{ background: t.primary }"></span>
          </button>
        </div>
      </div>

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
import { THEMES, applyTheme, getSavedTheme } from '@/utils/theme'

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
const currentTheme = ref(getSavedTheme())

const pickTheme = (id) => {
  currentTheme.value = applyTheme(id)
}

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
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 232px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  border-right: 2px solid var(--edge);
  box-shadow: 4px 0 0 var(--shadow);
  z-index: 1000;
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 22px 20px 20px;
  border-bottom: 2px solid var(--line-2);
}

.logo-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--primary);
  color: var(--on-primary);
  border: 2px solid var(--edge);
  border-radius: 12px;
  box-shadow: 3px 4px 0 var(--shadow);
  font-size: 21px;
  font-weight: 900;
  line-height: 1;
}

.logo-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.logo-text {
  color: var(--ink);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.logo-sub {
  color: var(--text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

/* 主操作：桌面端唯一的实心发布入口 */
.sidebar-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  margin: 16px 14px 2px;
  padding: 10px 14px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 12px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.04em;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.sidebar-cta:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.sidebar-cta:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

.sidebar-cta svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 10px 14px;
  border: 2px solid transparent;
  border-radius: 12px;
  color: var(--text-2);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease),
              color 0.26s var(--fish-ease);
}

.nav-item:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.nav-item:active {
  background: var(--cream-3);
}

.nav-item.router-link-active {
  background: var(--cream-2);
  border-color: var(--edge);
  color: var(--ink);
  box-shadow: 2px 3px 0 var(--shadow);
}

.nav-item.router-link-active .nav-icon {
  color: var(--primary-2);
}

.nav-item.navigating {
  pointer-events: none;
  opacity: 0.75;
}

.nav-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: var(--ink);
}

.nav-text {
  flex: 1;
}

.nav-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  background: var(--primary);
  border: 1.5px solid var(--edge);
  color: var(--ink);
  font-size: 11px;
  font-weight: 800;
}

/* 底部 */
.sidebar-foot {
  padding: 14px 16px 18px;
  border-top: 2px solid var(--line-2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.theme-block {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.theme-label {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.theme-dots {
  display: flex;
  gap: 6px;
}

.theme-dot {
  width: 20px;
  height: 20px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 2px solid var(--edge);
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s var(--fish-ease), box-shadow 0.2s var(--fish-ease);
}

.theme-dot:hover {
  transform: translateY(-2px);
}

.theme-dot.active {
  box-shadow: 2px 3px 0 var(--shadow);
  transform: scale(1.08);
}

.dot-core {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.sidebar-user {
  min-height: 52px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-frame {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--cream-2);
  border: 2px solid var(--edge);
  border-radius: 999px;
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
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-logout {
  margin-top: 2px;
  padding: 0;
  background: none;
  border: none;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
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
  min-height: 44px;
  padding: 10px 12px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 800;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-login svg {
  width: 18px;
  height: 18px;
}

.btn-login:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-login:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

/* iPad 横屏：只留图标 */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .sidebar {
    width: 76px;
  }

  .logo-copy {
    display: none;
  }

  .sidebar-logo {
    justify-content: center;
    padding: 20px 0;
  }

  .logo-mark {
    width: 40px;
    height: 40px;
    font-size: 19px;
  }

  .nav-text,
  .theme-block,
  .user-details,
  .sidebar-cta span {
    display: none;
  }

  .sidebar-cta {
    width: 52px;
    height: 52px;
    margin: 14px auto 2px;
    padding: 0;
    flex-shrink: 0;
  }

  .sidebar-nav {
    padding: 12px 8px;
    align-items: center;
  }

  .nav-item {
    width: 52px;
    height: 52px;
    padding: 0;
    justify-content: center;
  }

  .nav-badge {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  .sidebar-foot {
    align-items: center;
    padding: 12px 8px;
  }

  .user-info {
    justify-content: center;
  }
}

/* 手机 / iPad 竖屏：底部 tab */
@media (max-width: 1024px) and (orientation: portrait),
       (max-width: 768px) {
  .sidebar.mobile {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: 100%;
    height: auto;
    flex-direction: row;
    background: var(--card);
    border-right: none;
    border-top: 2px solid var(--edge);
    box-shadow: 0 -4px 0 var(--shadow);
    z-index: 1000;
  }

  .sidebar.mobile .sidebar-nav {
    flex-direction: row;
    width: 100%;
    padding: 0;
    gap: 0;
    overflow: visible;
  }

  .sidebar.mobile .nav-item {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    min-height: 64px;
    padding: 8px 4px 6px;
    border: none;
    border-radius: 0;
    font-size: 11px;
    color: var(--text-2);
  }

  .sidebar.mobile .nav-item:hover,
  .sidebar.mobile .nav-item:active {
    background: transparent;
  }

  .sidebar.mobile .nav-item.router-link-active {
    background: transparent;
    color: var(--ink);
    box-shadow: none;
    border: none;
  }

  .sidebar.mobile .nav-item.router-link-active::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: 28px;
    height: 3px;
    background: var(--primary);
    border-radius: 2px;
  }

  .sidebar.mobile .nav-item.router-link-active .nav-icon {
    color: var(--primary-2);
  }

  .sidebar.mobile .nav-icon {
    width: 22px;
    height: 22px;
  }

  .sidebar.mobile .nav-text {
    display: block;
    font-size: 11px;
  }

  .sidebar.mobile .nav-badge {
    position: absolute;
    top: 4px;
    right: calc(50% - 20px);
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
