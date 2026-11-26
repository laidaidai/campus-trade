<template>
  <div class="page">
    <div class="profile-shell">
      <aside class="profile-sidebar">
        <!-- 身份卡 -->
        <header class="profile-hero">
          <div class="identity">
            <img :src="userAvatar" :alt="userStore.userInfo?.username" class="user-avatar" />
            <div class="identity-copy">
              <h1 class="username">{{ userStore.userInfo?.username || '用户' }}</h1>
              <p class="user-email">{{ userStore.userInfo?.email }}</p>
            </div>
          </div>
          <button type="button" class="logout-btn" @click="handleLogout">
            <span class="menu-icon icon-logout"></span>
            <span class="logout-label">退出登录</span>
          </button>
        </header>

        <!-- 个人中心导航 -->
        <nav class="profile-tabs" aria-label="个人中心功能">
          <button
            v-for="item in navItems"
            :key="item.key"
            type="button"
            :class="['profile-tab', { active: activeMenu === item.key }]"
            @click="selectMenu(item.key)"
          >
            <span :class="['menu-icon', `icon-${item.icon}`]"></span>
            <span class="tab-label">{{ item.label }}</span>
            <span v-if="item.count !== undefined" class="tab-count">{{ item.count }}</span>
          </button>
        </nav>

        <div class="profile-tip">
          <span class="tip-heart">♡</span>
          <p>同校面交，先验货再确认，交易更安心。</p>
        </div>
      </aside>

      <main class="profile-content">
        <div class="section-head">
          <div>
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
import { ref, computed, watch } from 'vue'
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

const MENU_KEYS = ['myProducts', 'orders', 'history', 'addresses', 'profile']
const TAB_TO_MENU = {
  addresses: 'addresses',
  address: 'addresses',
  profile: 'profile',
  history: 'history',
  sold: 'orders',
  bought: 'orders',
  orders: 'orders',
  myProducts: 'myProducts'
}

const resolveMenu = () => {
  const menu = route.query.menu ? String(route.query.menu) : ''
  if (MENU_KEYS.includes(menu)) return menu
  const tab = route.query.tab ? String(route.query.tab) : ''
  return TAB_TO_MENU[tab] || 'myProducts'
}

const activeMenu = ref(resolveMenu())

const selectMenu = (key) => {
  if (!MENU_KEYS.includes(key)) return
  activeMenu.value = key
  if (String(route.query.menu || '') !== key) {
    router.replace({ query: { ...route.query, menu: key } })
  }
}

// 支持 /profile?tab=addresses 这类入口在页面已打开时也能切换
watch(
  () => [route.query.menu, route.query.tab],
  () => {
    activeMenu.value = resolveMenu()
  }
)

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
    desc: '管理你发布的闲置，查看在售与已售状态。'
  },
  {
    key: 'orders', label: '我的订单', icon: 'shopping-bag', count: undefined,
    desc: '集中查看你买到和卖出的订单。'
  },
  {
    key: 'history', label: '浏览历史', icon: 'eye', count: undefined,
    desc: '最近浏览过的商品，继续之前的选择。'
  },
  {
    key: 'addresses', label: '地址管理', icon: 'map-pin', count: undefined,
    desc: '维护收货地址，下单时直接选用。'
  },
  {
    key: 'profile', label: '个人资料', icon: 'settings', count: undefined,
    desc: '更新你的账号信息和联系方式。'
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
/* Friendly 个人空间：左侧身份与导航，右侧内容工作台 */
.page {
  min-height: 100vh;
  background: var(--bg);
}

.profile-shell {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 36px 80px;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 26px;
  align-items: start;
}

.profile-sidebar {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.profile-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 30px 20px 18px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  box-shadow: 3px 4px 0 rgba(63, 61, 86, 0.055);
}

.profile-hero::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  width: 74px;
  height: 18px;
  background: rgba(229, 189, 114, 0.31);
  border-left: 1px solid rgba(229, 189, 114, 0.47);
  border-right: 1px solid rgba(229, 189, 114, 0.47);
  transform: translateX(-50%) rotate(-1.4deg);
}

.identity {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
  padding-right: 0;
}

.user-avatar {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--card);
  border: 2px solid var(--card);
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(184, 68, 97, 0.14);
}

.identity-copy {
  min-width: 0;
}

.username {
  margin: 0 0 3px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
  word-break: break-word;
}

.user-email {
  margin: 0;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  padding: 9px 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line);
  border-radius: 12px;
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.24s var(--fish-ease), color 0.24s var(--fish-ease);
}

.logout-btn:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

.logout-label {
  display: inline;
}

/* 导航：左侧整列，标签不再横向挤压 */
/* 导航像一叠索引卡：每条一行，虚线分隔 */
.profile-tabs {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 0;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  box-shadow: 3px 4px 0 rgba(63, 61, 86, 0.05);
  overflow: hidden;
}

.profile-tab {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 9px 15px;
  background: transparent;
  border: 0;
  border-bottom: 1px dashed var(--line);
  border-left: 3px solid transparent;
  border-radius: 0;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.profile-tabs .profile-tab:last-child { border-bottom: 0; }

.profile-tab:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.profile-tab.active {
  background: var(--butter-soft);
  border-left-color: var(--primary);
  color: var(--primary-2);
  box-shadow: none;
}

.profile-tab.active .tab-count {
  background: rgba(255, 253, 249, 0.8);
  border-color: rgba(184, 68, 97, 0.2);
}

.tab-label {
  flex: 1;
  line-height: 1.2;
}

.tab-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* 一条贴在手边的薄荷便签 */
.profile-tip {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 13px 15px;
  background: var(--secondary-3);
  border: 1px solid rgba(108, 197, 160, 0.32);
  border-radius: 3px;
  box-shadow: 2px 3px 0 rgba(44, 115, 87, 0.06);
  color: var(--secondary-2);
  transform: rotate(-0.8deg);
}

.tip-heart {
  font-size: 16px;
  line-height: 1.3;
}

.profile-tip p {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.65;
}

/* 右侧内容：一块安静的工作台 */
.profile-content {
  position: relative;
  min-width: 0;
  min-height: 620px;
  padding: 32px 30px 30px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  box-shadow: 4px 6px 0 rgba(63, 61, 86, 0.055);
}

.profile-content::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 46px;
  width: 78px;
  height: 18px;
  background: rgba(229, 189, 114, 0.28);
  border-left: 1px solid rgba(229, 189, 114, 0.44);
  border-right: 1px solid rgba(229, 189, 114, 0.44);
  transform: rotate(-2deg);
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px 22px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 22px;
}

.section-eyebrow {
  margin: 0 0 5px;
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.section-title {
  margin: 0 0 4px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.section-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
}

.content-section {
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
  border-radius: 10px 6px 0 0;
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


/* 1024 以下：侧栏收窄 */
@media (max-width: 1024px) {
  .profile-shell {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 20px;
    padding: 24px 24px 64px;
  }
  .profile-content {
    padding: 24px 22px 26px;
    border-radius: 28px;
  }
  .section-title { font-size: 23px; }
}

/* 900 以下：恢复单列，导航横滑 */
@media (max-width: 767px) {
  .profile-content::before {
    left: 50%;
    transform: translateX(-50%) rotate(-2deg);
  }

  .profile-shell {
    display: block;
    padding: 16px 14px 108px;
  }
  .profile-sidebar {
    position: static;
    gap: 12px;
  }
  .profile-hero {
    padding: 18px;
    border-radius: 24px;
  }
  .identity { padding-right: 34px; }
  .user-avatar { width: 60px; height: 60px; }
  .username { font-size: 20px; }
  .profile-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 3px;
    padding: 6px;
    border-radius: 20px;
    overflow: visible;
  }
  .profile-tab {
    width: 100%;
    min-height: 44px;
    justify-content: flex-start;
    gap: 7px;
    padding: 8px 9px;
    white-space: nowrap;
    font-size: 12px;
  }
  .profile-tip { display: none; }
  .profile-content {
    min-height: 0;
    margin-top: 14px;
    padding: 22px 18px 24px;
    border-radius: 26px;
  }
  .section-head {
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .section-title { font-size: 21px; }
  .section-desc { font-size: 12px; }
  .logout-btn { position: absolute; top: 10px; right: 10px; width: 44px; min-height: 44px; height: 44px; padding: 0; border-radius: 999px; }
  .logout-label { display: none; }
  .identity { padding-right: 34px; }
}

@media (max-width: 480px) {
  .profile-shell { padding: 12px 12px 104px; }
  .profile-hero { padding: 16px 14px; }
  .identity { gap: 10px; }
  .user-avatar { width: 52px; height: 52px; }
  .username { font-size: 18px; }
  .user-email { font-size: 10px; }
  .profile-content { padding: 18px 14px 20px; }
  .profile-tab { gap: 5px; padding: 8px 7px; font-size: 11px; }
}
</style>
