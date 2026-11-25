<template>
  <div class="page">
    <main class="main-content">
      <header class="search-head">
        <h1 class="search-title">搜索</h1>
        <form class="search-form" role="search" @submit.prevent="submitSearch">
          <svg class="search-form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="keyword"
            type="search"
            class="search-input"
            placeholder="搜索商品或分类"
            aria-label="搜索商品"
            autocomplete="off"
          />
          <button
            v-if="keyword"
            type="button"
            class="clear-btn"
            aria-label="清空搜索"
            @click="clearSearch"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button type="submit" class="search-submit">搜索</button>
        </form>
        <div v-if="searchQuery && !loading && !error" class="results-meta">
          <span>“{{ searchQuery }}”</span>
          <strong>{{ results.length }}</strong>
          <span>件</span>
        </div>
      </header>

      <div v-if="loading && results.length === 0" class="products-grid skeleton-grid" aria-hidden="true">
        <div v-for="i in 8" :key="i" class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-copy">
            <span class="skeleton-line wide"></span>
            <span class="skeleton-line short"></span>
          </div>
        </div>
      </div>

      <div v-else-if="error" class="state-panel">
        <div class="state-icon">!</div>
        <h3 class="empty-title">搜索失败</h3>
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="fetchResults(true)">重试</button>
      </div>

      <template v-else>
        <div v-if="results.length > 0" class="products-grid">
          <XHSProductCard v-for="item in results" :key="item.id" :product="item" />
        </div>

        <div v-if="hasMore && results.length > 0" class="load-more">
          <button class="btn btn-secondary" :disabled="loading" @click="fetchResults(false)">
            {{ loading ? '加载中…' : '加载更多' }}
          </button>
        </div>

        <div v-if="results.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          <h3 class="empty-title">{{ searchQuery ? `没有找到“${searchQuery}”` : '输入关键词开始搜索' }}</h3>
          <p class="empty-desc">{{ searchQuery ? '换一个更短的关键词，或者去首页看看最新闲置。' : '搜索商品名称、描述或分类，找到校园里的闲置。' }}</p>
          <div class="empty-actions">
            <button v-if="searchQuery" type="button" class="btn btn-outline" @click="clearSearch">清空搜索</button>
            <router-link to="/" class="btn btn-outline">去首页逛逛</router-link>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import XHSProductCard from '@/components/XHSProductCard.vue'
import { getProducts } from '@/api/product'
import { getImageUrl } from '@/config'
import { resolveAvatar } from '@/utils/avatar'

const route = useRoute()
const router = useRouter()
const searchQuery = computed(() => String(route.query.q || '').trim())
const keyword = ref(searchQuery.value)

const results = ref([])
const loading = ref(false)
const error = ref('')
const hasMore = ref(false)
let offset = 0
const limit = 24
let requestId = 0

const formatTime = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 60) return `${Math.max(minutes, 1)}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString()
}

const fetchResults = async (reset = false) => {
  if (!searchQuery.value) {
    results.value = []
    hasMore.value = false
    error.value = ''
    return
  }

  if (loading.value && !reset) return
  const currentRequest = ++requestId
  loading.value = true
  error.value = ''

  if (reset) {
    offset = 0
    results.value = []
  }

  try {
    const response = await getProducts({
      search: searchQuery.value,
      status: 'available',
      limit,
      offset
    })

    if (currentRequest !== requestId) return

    if (!response?.success) {
      error.value = response?.message || '服务暂时不可用'
      return
    }

    const formatted = (response.data || []).map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
      originalPrice: null,
      image: product.images && product.images.length > 0
        ? getImageUrl(product.images[0])
        : '',
      favoriteCount: product.favorite_count ?? product.favoriteCount ?? 0,
      sellerAvatar: resolveAvatar(product.seller_avatar, product.seller_name || '用户'),
      sellerName: product.seller_name || '匿名用户',
      publishTime: formatTime(product.created_at),
      status: product.status
    }))

    results.value = reset ? formatted : [...results.value, ...formatted]
    hasMore.value = Boolean(response.pagination?.hasMore)
    offset += formatted.length
  } catch (err) {
    if (currentRequest === requestId) {
      console.error('搜索失败:', err)
      error.value = err.response?.data?.message || '搜索失败，请稍后重试'
    }
  } finally {
    if (currentRequest === requestId) loading.value = false
  }
}

watch(searchQuery, (query) => {
  keyword.value = query
  fetchResults(true)
})

const submitSearch = () => {
  const query = keyword.value.trim()
  if (!query) {
    router.replace('/search')
    results.value = []
    return
  }
  if (query === searchQuery.value) {
    fetchResults(true)
    return
  }
  router.replace({ path: '/search', query: { q: query } })
}

const clearSearch = () => {
  keyword.value = ''
  router.replace('/search')
  results.value = []
  hasMore.value = false
}

onMounted(() => fetchResults(true))
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 32px 72px;
}

.search-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 2px solid var(--line-2);
}

.search-title {
  margin: 0;
  color: var(--ink);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.search-form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  padding: 5px 6px 5px 16px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 14px;
  box-shadow: 4px 5px 0 var(--shadow);
  transition: border-color 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.search-form:focus-within {
  border-color: var(--primary-2);
  box-shadow: 5px 6px 0 var(--shadow);
}

.search-form-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--text-3);
}

.search-input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 2px;
  background: transparent;
  border: none;
  outline: none;
  color: var(--ink);
  font-size: 15px;
  font-weight: 500;
}

.search-input::-webkit-search-cancel-button {
  display: none;
}

.clear-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  cursor: pointer;
}

.clear-btn svg {
  width: 14px;
  height: 14px;
}

.clear-btn:hover {
  background: var(--cream-3);
}

.search-submit {
  flex-shrink: 0;
  min-width: 72px;
  min-height: 44px;
  padding: 0 16px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 10px;
  box-shadow: 2px 3px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s var(--fish-ease), box-shadow 0.2s var(--fish-ease);
}

.search-submit:hover {
  transform: translateY(-1px);
  box-shadow: 3px 4px 0 var(--shadow);
}

.search-submit:active {
  transform: translateY(2px);
  box-shadow: 1px 1px 0 var(--shadow);
}

.results-meta {
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 600;
}

.results-meta span:first-child {
  min-width: 0;
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
}

.results-meta strong {
  color: var(--primary-2);
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.state-panel,
.empty-state {
  margin-top: 28px;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 40px 24px;
  text-align: center;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 24px;
}

.state-icon,
.empty-icon {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--text-2);
  font-size: 32px;
  font-weight: 900;
}

.empty-icon svg {
  width: 38px;
  height: 38px;
}

.spinner::after {
  content: '';
  width: 26px;
  height: 26px;
  border: 3px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-title {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 800;
}

.empty-desc,
.state-panel p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.empty-desc {
  max-width: 36ch;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
}

.skeleton-grid { margin-top: 24px; }

.skeleton-card {
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 18px;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--cream-2);
  border-bottom: 2px solid var(--line);
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

.skeleton-copy {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
}

.skeleton-line {
  height: 10px;
  background: var(--cream-2);
  border-radius: 6px;
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

.skeleton-line.wide { width: 86%; }
.skeleton-line.short { width: 46%; }

@keyframes skeletonPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.9; }
}

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 767px) {
  .main-content { padding: 18px 16px calc(88px + env(safe-area-inset-bottom, 0px)); }
  .search-head { gap: 10px; padding-bottom: 14px; }
  .search-title { font-size: 26px; }
  .search-form { min-height: 50px; padding-left: 13px; }
  .search-submit { min-width: 62px; padding: 0 12px; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  .skeleton-grid { margin-top: 16px; }
}
</style>
