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
  height: calc(76px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  background: rgba(255, 252, 253, 0.9);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  width: 100%;
  max-width: 1240px;
  height: 100%;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border-radius: 15px;
  box-shadow: 0 8px 18px rgba(184, 68, 97, 0.23);
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-name {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}

.brand-sub {
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.top-nav {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 8px;
}

.top-nav-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: var(--radius-full);
  color: var(--text-3);
  font-size: 14px;
  font-weight: 600;
  transition: color 0.24s var(--fish-ease), background-color 0.24s var(--fish-ease);
}

.top-nav-item:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.top-nav-item.router-link-active {
  background: var(--primary-3);
  color: var(--primary-2);
}

.icon-btn.search-icon { display: inline-flex; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.icon-btn {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--card);
  color: var(--text-2);
  transition: background-color 0.24s var(--fish-ease), border-color 0.24s var(--fish-ease);
}

.assistant-btn {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-2);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), border-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.assistant-btn svg {
  width: 17px;
  height: 17px;
}

.assistant-btn:hover {
  background: var(--cream-1);
  border-color: var(--line-strong);
  color: var(--ink);
}

.icon-btn:hover {
  background: var(--cream-1);
  border-color: var(--line-strong);
}

.icon-btn :deep(svg) {
  width: 19px;
  height: 19px;
}

.publish-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  padding: 9px 18px;
  background: var(--primary);
  border-radius: var(--radius-full);
  box-shadow: 0 8px 18px rgba(184, 68, 97, 0.24);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.24s var(--fish-ease), background-color 0.24s var(--fish-ease);
}

.publish-cta svg {
  width: 17px;
  height: 17px;
}

.publish-cta:hover {
  transform: translateY(-1px);
  background: var(--primary-2);
}

.publish-cta:active {
  transform: translateY(1px);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 42px;
  padding: 4px 11px 4px 4px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  transition: background-color 0.24s var(--fish-ease), border-color 0.24s var(--fish-ease);
}

.user-chip:hover {
  background: var(--cream-1);
  border-color: var(--line-strong);
}

.header-avatar {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 999px;
  background: var(--cream-2);
  box-shadow: 0 0 0 2px rgba(184, 68, 97, 0.14);
}

.user-name {
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
}

.login-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 9px 20px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  background: var(--card);
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  transition: background-color 0.24s var(--fish-ease), border-color 0.24s var(--fish-ease);
}

.login-pill:hover {
  background: var(--cream-1);
  border-color: var(--primary-3);
}

@media (max-width: 1080px) {
  .header-inner { padding: 0 24px; gap: 16px; }
  .top-nav { gap: 0; padding-left: 4px; }
  .top-nav-item { padding: 8px 12px; font-size: 13px; }
  .user-name { display: none; }
  .user-chip { padding: 4px; min-height: 44px; }
  .icon-btn { width: 44px; height: 44px; }
  .assistant-btn { width: 44px; height: 44px; padding: 0; justify-content: center; border-radius: 999px; }
  .assistant-label { display: none; }
  .login-pill { min-height: 44px; }
}

@media (max-width: 767px) {
  .site-header { height: calc(62px + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px); }
  .header-inner { padding: 0 14px; gap: 10px; }
  .brand-mark { width: 38px; height: 38px; border-radius: 13px; font-size: 18px; }
  .brand-name { font-size: 16px; }
  .brand-sub { display: none; }
  .top-nav { display: none; }
  .header-actions { margin-left: auto; gap: 8px; }
  .icon-btn { width: 44px; height: 44px; }
  .assistant-btn { width: 44px; height: 44px; }
  .publish-cta { display: none; }
  .user-chip { min-height: 44px; padding: 3px; }
  .header-avatar { width: 34px; height: 34px; }
  .login-pill { min-height: 44px; padding: 8px 15px; font-size: 13px; }
}

@media (hover: none), (pointer: coarse) {
  .publish-cta:hover { transform: none; }
}
</style>
