<template>
  <div class="page">
    <main class="main-content">
      <header class="search-head">
        <span class="eyebrow">SEARCH</span>
        <h1 class="search-title">搜索结果</h1>
        <p class="search-query">{{ searchQuery ? `“${searchQuery}”` : '全部商品' }}</p>
      </header>

      <div v-if="loading && results.length === 0" class="state-panel">
        <div class="state-icon spinner"></div>
        <p>正在搜索…</p>
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
          <h3 class="empty-title">{{ searchQuery ? '没有找到相关商品' : '请输入搜索关键词' }}</h3>
          <p class="empty-desc">{{ searchQuery ? '换个关键词试试，或者回首页看看最新闲置。' : '从首页搜索框输入商品名称、描述或分类。' }}</p>
          <router-link to="/" class="btn btn-primary">回到首页</router-link>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import XHSProductCard from '@/components/XHSProductCard.vue'
import { getProducts } from '@/api/product'
import { getImageUrl } from '@/config'
import { resolveAvatar } from '@/utils/avatar'

const route = useRoute()
const searchQuery = computed(() => String(route.query.q || '').trim())

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

  if (loading.value) return
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

watch(searchQuery, () => fetchResults(true))
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
  gap: 6px;
  padding-bottom: 20px;
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

.load-more {
  display: flex;
  justify-content: center;
  margin-top: 28px;
}

@media (max-width: 767px) {
  .main-content { padding: 24px 16px 48px; }
  .search-title { font-size: 26px; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
}
</style>
