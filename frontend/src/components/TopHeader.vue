<template>
  <header class="site-header">
    <div class="header-inner">
      <router-link to="/" class="brand" aria-label="校园交易首页">
        <span class="brand-mark">校</span>
        <span class="brand-copy">
          <span class="brand-name">校园交易</span>
          <span class="brand-sub">同校面交 · 无服务费</span>
        </span>
      </router-link>

      <nav class="top-nav" aria-label="主导航">
        <router-link to="/" class="top-nav-item">首页</router-link>
        <router-link to="/messages" class="top-nav-item">消息</router-link>
        <router-link to="/favorites" class="top-nav-item">收藏</router-link>
      </nav>

      <div class="header-actions">
        <button type="button" class="assistant-btn" @click="openAssistant" title="校园助手" aria-label="打开校园助手">
          <Icon name="message" />
          <span class="assistant-label">助手</span>
        </button>

        <router-link to="/search" class="icon-btn search-icon" title="搜索好物" aria-label="搜索好物">
          <Icon name="search" />
        </router-link>

        <router-link v-if="isLoggedIn" to="/publish" class="publish-cta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>发布闲置</span>
        </router-link>

        <router-link v-if="isLoggedIn" to="/profile" class="user-chip" :title="username">
          <img :src="avatarSrc" :alt="username" class="header-avatar" />
          <span class="user-name">{{ username }}</span>
        </router-link>

        <router-link v-else to="/auth" class="login-pill">登录</router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useUserStore } from '@/stores/user'
import { resolveAvatar } from '@/utils/avatar'

const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo || {})
const username = computed(() => userInfo.value.username || '同学')
const avatarSrc = computed(() => resolveAvatar(userInfo.value.avatar, username.value))
const openAssistant = () => window.dispatchEvent(new CustomEvent('open-ai-assistant'))
</script>

<style scoped>
.site-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  height: calc(74px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  width: 100%;
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 26px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border-radius: 3px;
  color: var(--on-primary);
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  line-height: 1;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-name {
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
}

.brand-sub {
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.top-nav {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 26px;
  padding-left: 22px;
  height: 100%;
}

.top-nav-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 500;
  transition: color 0.16s var(--fish-ease);
}

.top-nav-item:hover {
  color: var(--ink);
}

.top-nav-item.router-link-active {
  color: var(--ink);
  font-weight: 600;
}

.top-nav-item.router-link-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 18px;
  height: 2px;
  background: var(--primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-btn.search-icon { display: inline-flex; }

.icon-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  background: transparent;
  color: var(--text-2);
  transition: background-color 0.16s var(--fish-ease), border-color 0.16s var(--fish-ease);
}

.icon-btn:hover {
  background: var(--card);
  border-color: var(--edge-deep);
  color: var(--ink);
}

.icon-btn :deep(svg) {
  width: 18px;
  height: 18px;
}

.assistant-btn {
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.16s var(--fish-ease), color 0.16s var(--fish-ease);
}

.assistant-btn svg {
  width: 16px;
  height: 16px;
}

.assistant-btn:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.publish-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 8px 16px;
  background: var(--primary);
  border-radius: 3px;
  color: var(--on-primary);
  font-size: 12px;
  font-weight: 600;
  transition: background-color 0.16s var(--fish-ease);
}

.publish-cta svg {
  width: 16px;
  height: 16px;
}

.publish-cta:hover {
  background: var(--primary-2);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 2px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  transition: background-color 0.16s var(--fish-ease);
}

.user-chip:hover {
  background: var(--cream-1);
}

.header-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 50%;
  background: var(--cream-2);
}

.user-name {
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 500;
}

.login-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 8px 18px;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  background: var(--card);
  color: var(--ink);
  font-size: 12px;
  font-weight: 600;
  transition: background-color 0.16s var(--fish-ease), border-color 0.16s var(--fish-ease);
}

.login-pill:hover {
  background: var(--cream-1);
  border-color: var(--edge-deep);
}

@media (max-width: 1080px) {
  .header-inner { padding: 0 24px; gap: 16px; }
  .top-nav { gap: 18px; padding-left: 6px; }
  .top-nav-item { font-size: 12px; }
  .user-name { display: none; }
  .user-chip { padding: 3px; }
  .icon-btn { width: 40px; height: 40px; }
  .assistant-btn { width: 40px; height: 40px; padding: 0; justify-content: center; }
  .assistant-label { display: none; }
  .login-pill { min-height: 40px; }
}

@media (max-width: 767px) {
  .site-header { height: calc(60px + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px); }
  .header-inner { padding: 0 14px; gap: 10px; }
  .brand-mark { width: 34px; height: 34px; border-radius: 3px; font-size: 17px; }
  .brand-name { font-size: 15px; }
  .brand-sub { display: none; }
  .top-nav { display: none; }
  .header-actions { margin-left: auto; gap: 6px; }
  .icon-btn { width: 40px; height: 40px; }
  .assistant-btn { width: 40px; height: 40px; }
  .publish-cta { display: none; }
  .user-chip { min-height: 40px; padding: 2px; }
  .header-avatar { width: 32px; height: 32px; }
  .login-pill { min-height: 40px; padding: 7px 13px; font-size: 12px; }
}
</style>
