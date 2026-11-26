<template>
  <header class="navbar">
    <div class="navbar-container">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <span class="logo-icon"><Icon name="school" /></span>
        <span class="logo-text">校园交易</span>
      </router-link>

      <!-- 搜索框 -->
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索二手商品..." 
          @keyup.enter="onSearch"
        />
        <button class="search-btn" @click="onSearch">
          <span class="search-icon"><Icon name="search" /></span>
        </button>
      </div>

      <!-- 导航链接 -->
      <nav class="nav-links">
        <router-link to="/" class="nav-item" active-class="active">
          <span class="nav-icon"><Icon name="home" /></span>
          <span>首页</span>
        </router-link>
        <router-link to="/publish" class="nav-item" active-class="active">
          <span class="nav-icon"><Icon name="plus" /></span>
          <span>发布</span>
        </router-link>
        <router-link to="/messages" class="nav-item" active-class="active">
          <span class="nav-icon"><Icon name="message" /></span>
          <span>消息</span>
        </router-link>
        <router-link to="/profile" class="nav-item" active-class="active">
          <span class="nav-icon"><Icon name="user" /></span>
          <span>我的</span>
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'

const router = useRouter()
const searchQuery = ref('')

function onSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value } })
  }
}
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
}

.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 32px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  font-weight: 700;
  white-space: nowrap;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
}

.logo:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
}

.logo-icon {
  font-size: 28px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.logo-icon :deep(svg) {
  width: 28px;
  height: 28px;
  stroke-width: 2;
}

.logo-text {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 搜索框 */
.search-box {
  flex: 1;
  max-width: 600px;
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-md);
  padding: 4px 4px 4px 16px;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.search-box:focus-within {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border-color: rgba(255, 36, 66, 0.3);
  transform: translateY(-1px);
}

.search-box input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  padding: 8px 12px;
  color: var(--text-primary);
}

.search-box input::placeholder {
  color: rgba(0, 0, 0, 0.4);
}

.search-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-light) 100%);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(255, 36, 66, 0.3);
}

.search-btn:hover {
  transform: scale(1.05) translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 36, 66, 0.4);
}

.search-btn:active {
  transform: scale(0.95);
}

.search-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
}

.search-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

/* 导航链接 */
.nav-links {
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.04);
  padding: 4px;
  border-radius: var(--radius-md);
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 14px;
  text-decoration: none;
  color: rgba(0, 0, 0, 0.6);
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
  white-space: nowrap;
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.8);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.95);
  color: var(--primary-color);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.12),
    0 1px 3px rgba(0, 0, 0, 0.08);
  transform: translateY(0);
}

.nav-icon {
  font-size: 18px;
  display: flex;
  align-items: center;
}

.nav-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .navbar-container {
    gap: 16px;
  }
  
  .search-box {
    max-width: 400px;
  }
  
  .logo-text {
    display: none;
  }
}

@media (max-width: 767px) {
  .navbar-container {
    padding: 8px 16px;
    gap: 12px;
  }
  
  .search-box {
    max-width: none;
  }
  
  .nav-item span:not(.nav-icon) {
    display: none;
  }
  
  .nav-item {
    padding: 10px 12px;
  }
}

@media (max-width: 480px) {
  .search-box {
    padding: 4px;
  }
  
  .search-box input {
    font-size: 13px;
    padding: 6px 8px;
  }
}
</style>
