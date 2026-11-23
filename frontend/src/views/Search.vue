<template>
  <div class="page">
    <main class="main-content">
      <header class="search-head">
        <span class="eyebrow">SEARCH</span>
        <h1 class="search-title">搜索结果</h1>
        <p class="search-query">{{ searchQuery || '全部' }}</p>
      </header>

      <div class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <h3 class="empty-title">搜索暂未开放</h3>
        <router-link to="/" class="btn btn-primary">回到首页</router-link>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const searchQuery = computed(() => route.query.q || '')
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 32px 72px;
}

.search-head {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--line-2);
}

.search-title {
  margin: 0;
  color: var(--ink);
  font-size: 34px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.search-query {
  margin: 0;
  color: var(--primary-2);
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.empty-state {
  margin-top: 32px;
  min-height: 300px;
  gap: 16px;
  padding: 52px 24px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 24px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--text-2);
}

.empty-icon svg {
  width: 40px;
  height: 40px;
}

.empty-title {
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
}

@media (max-width: 767px) {
  .main-content { padding: 24px 16px 48px; }
  .search-title { font-size: 26px; }
  .empty-icon { width: 80px; height: 80px; }
  .empty-icon svg { width: 32px; height: 32px; }
}
</style>
