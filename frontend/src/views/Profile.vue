<template>
  <div class="page">
    <div class="profile-shell">
      <!-- 身份头部：完整宽度，不再占用内容列 -->
      <header class="profile-hero">
        <div class="identity">
          <img :src="userAvatar" :alt="userStore.userInfo?.username" class="user-avatar" />
          <div class="identity-copy">
            <span class="profile-eyebrow">MY CAMPUS</span>
            <h1 class="username">{{ userStore.userInfo?.username || '用户' }}</h1>
            <p class="user-email">{{ userStore.userInfo?.email }}</p>
          </div>
        </div>
        <button type="button" class="logout-btn" @click="handleLogout">
          <span class="menu-icon icon-logout"></span>
          <span class="logout-label">退出登录</span>
        </button>
      </header>

      <!-- 功能用横向标签，移动端不再被多行菜单占满首屏 -->
      <nav class="profile-tabs" aria-label="个人中心功能">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          :class="['profile-tab', { active: activeMenu === item.key }]"
          @click="activeMenu = item.key"
        >
          <span :class="['menu-icon', `icon-${item.icon}`]"></span>
          <span class="tab-label">{{ item.label }}</span>
          <span v-if="item.count !== undefined" class="tab-count">{{ item.count }}</span>
        </button>
      </nav>

      <main class="profile-content">
        <div class="section-head">
          <div>
            <span class="section-eyebrow">{{ currentSection.eyebrow }}</span>
            <h2 class="section-title">{{ currentSection.label }}</h2>
            <p class="section-desc">{{ currentSection.desc }}</p>
          </div>
        </div>

        <div class="content-section">
          <MyProducts v-if="activeMenu === 'myProducts'" />
          <MyOrders
            v-else-if="activeMenu === 'orders'"
            :default-tab="(route.query.tab && String(route.query.tab) === 'sold') ? 'sold' : 'bought'"
          />
          <ViewHistory v-else-if="activeMenu === 'history'" />
          <AddressManagement v-else-if="activeMenu === 'addresses'" />
          <UserProfile v-else-if="activeMenu === 'profile'" />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { resolveAvatar } from '@/utils/avatar'
import { showLogoutConfirm } from '@/utils/dialog'
import MyProducts from '@/components/profile/MyProducts.vue'
import ViewHistory from '@/components/profile/ViewHistory.vue'
import AddressManagement from '@/components/profile/AddressManagement.vue'
import UserProfile from '@/components/profile/UserProfile.vue'
import MyOrders from '@/components/profile/MyOrders.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const activeMenu = ref(route.query.menu ? String(route.query.menu) : 'myProducts')

const handleLogout = async () => {
  const confirmed = await showLogoutConfirm('确定要退出登录吗？')
  if (confirmed) {
    userStore.logout()
    router.push('/auth')
  }
}

const menuItems = ref([
  {
    key: 'myProducts', label: '我的发布', icon: 'box', count: undefined,
    eyebrow: 'MANAGE', desc: '管理你发布的闲置，查看在售与已售状态。'
  },
  {
    key: 'orders', label: '我的订单', icon: 'shopping-bag', count: undefined,
    eyebrow: 'ORDERS', desc: '集中查看你买到和卖出的订单。'
  },
  {
    key: 'history', label: '浏览历史', icon: 'eye', count: undefined,
    eyebrow: 'RECENT', desc: '最近浏览过的商品，继续之前的选择。'
  },
  {
    key: 'addresses', label: '地址管理', icon: 'map-pin', count: undefined,
    eyebrow: 'ADDRESS', desc: '维护收货地址，下单时直接选用。'
  },
  {
    key: 'profile', label: '个人资料', icon: 'settings', count: undefined,
    eyebrow: 'ACCOUNT', desc: '更新你的账号信息和联系方式。'
  }
])

const navItems = computed(() => menuItems.value)

const currentSection = computed(() => {
  return menuItems.value.find(item => item.key === activeMenu.value) || menuItems.value[0]
})

const userAvatar = computed(() => {
  const info = userStore.userInfo
  return resolveAvatar(info?.avatar, info?.username)
})
</script>

<style scoped>
/* 个人中心：一个完整宽度的身份头部 + 横向功能标签 + 内容台 */
.page {
  min-height: 100vh;
  background: var(--bg);
}

.profile-shell {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 32px 64px;
  box-sizing: border-box;
}

.profile-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  background: var(--panel);
  border: 2px solid var(--edge);
  border-radius: 22px;
  box-shadow: 5px 6px 0 var(--shadow);
  overflow: hidden;
}

.identity {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.user-avatar {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--panel-deep);
  border: 3px solid var(--primary);
  border-radius: 999px;
}

.identity-copy {
  min-width: 0;
}

.profile-eyebrow {
  display: block;
  margin-bottom: 5px;
  color: var(--on-panel-warm);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.username {
  margin: 0 0 5px;
  color: var(--on-panel);
  font-size: 30px;
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.user-email {
  margin: 0;
  color: var(--on-panel-warm);
  font-size: 13px;
  word-break: break-all;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 15px;
  background: transparent;
  border: 1.5px solid var(--on-panel-warm);
  border-radius: 999px;
  color: var(--on-panel);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease), border-color 0.26s var(--fish-ease);
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--on-panel);
}

/* 横向标签：固定高度，内容不再被菜单推走 */
.profile-tabs {
  display: flex;
  gap: 4px;
  margin-top: 16px;
  padding: 8px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 16px;
  overflow-x: auto;
  scrollbar-width: none;
}

.profile-tabs::-webkit-scrollbar {
  display: none;
}

.profile-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 0 0 auto;
  min-height: 46px;
  padding: 9px 18px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 11px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease),
              color 0.26s var(--fish-ease);
}

.profile-tab:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.profile-tab.active {
  background: var(--primary);
  border-color: var(--edge);
  color: var(--on-primary);
  box-shadow: 2px 3px 0 var(--shadow);
}

.tab-label {
  line-height: 1;
}

.tab-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

/* 内容标题：让功能与说明成组，不与导航混在一起 */
.profile-content {
  margin-top: 20px;
  min-width: 0;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px 14px;
}

.section-eyebrow {
  display: block;
  margin-bottom: 3px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.section-title {
  margin: 0 0 3px;
  color: var(--ink);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.section-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.55;
}

.content-section {
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  min-height: 0;
}

/* 图标（线条，2px） */
.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: inline-block;
  position: relative;
  color: currentColor;
}

.icon-box::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 4px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-shopping-bag::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 16px;
  border: 2px solid currentColor;
  border-top: none;
  border-radius: 0 0 3px 3px;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
}

.icon-shopping-bag::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 6px;
  border: 2px solid currentColor;
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
}

.icon-eye::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 10px;
  border: 2px solid currentColor;
  border-radius: 50% / 60% 60% 40% 40%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-eye::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-map-pin::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  top: 2px;
  left: 50%;
  margin-left: -6px;
}

.icon-map-pin::after {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background: currentColor;
  border-radius: 50%;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
}

.icon-settings::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-settings::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-logout::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 16px;
  border: 2px solid currentColor;
  border-right: none;
  border-radius: 3px 0 0 3px;
  top: 50%;
  left: 2px;
  transform: translateY(-50%);
}

.icon-logout::after {
  content: '';
  position: absolute;
  width: 9px;
  height: 2px;
  background: currentColor;
  top: 50%;
  right: 1px;
  transform: translateY(-50%);
}

/* 平板 */
@media (max-width: 1023px) {
  .profile-shell { padding: 18px 24px 48px; }
  .profile-hero { padding: 24px; }
  .user-avatar { width: 72px; height: 72px; }
  .username { font-size: 26px; }
}

/* 手机：头部两行、标签横向滚动，内容紧跟 */
@media (max-width: 767px) {
  .profile-shell { padding: 12px 12px 96px; }
  .profile-hero {
    padding: 18px 16px;
    border-radius: 18px;
    align-items: flex-start;
    gap: 12px;
  }
  .identity { gap: 13px; }
  .user-avatar { width: 60px; height: 60px; }
  .username { font-size: 21px; }
  .user-email { font-size: 12px; }
  .logout-btn { min-height: 38px; padding: 6px 10px; font-size: 12px; }
  .logout-btn .menu-icon { width: 16px; height: 16px; }
  .profile-tabs {
    margin-top: 12px;
    padding: 6px;
    border-radius: 14px;
  }
  .profile-tab {
    min-height: 42px;
    padding: 8px 13px;
    font-size: 12px;
    gap: 6px;
  }
  .profile-tab .menu-icon { width: 17px; height: 17px; }
  .profile-content { margin-top: 16px; }
  .section-head { padding-bottom: 10px; }
  .section-title { font-size: 18px; }
  .section-desc { font-size: 12px; }
  .content-section { padding: 0; border-radius: 0; min-height: 0; }
}

@media (max-width: 480px) {
  .profile-hero { padding: 16px 14px; }
  .identity { gap: 11px; }
  .user-avatar { width: 52px; height: 52px; }
  .username { font-size: 19px; }
  .logout-btn {
    width: 40px;
    min-width: 40px;
    min-height: 40px;
    padding: 0;
    justify-content: center;
  }
  .logout-label { display: none; }
}
</style>
