<template>
  <div class="page">
    <main class="main-content">
      <header class="search-hero">
        <div class="hero-copy">
          <h1 class="hero-title">搜索校园闲置</h1>
          <p class="hero-desc">输入商品名、分类或关键词。教材、数码、宿舍用品都能搜。</p>
        </div>

        <form class="search-form" role="search" @submit.prevent="submitSearch">
          <svg class="search-form-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            v-model="keyword"
            type="search"
            class="search-input"
            placeholder="搜索商品、描述或分类"
            aria-label="搜索商品"
            autocomplete="off"
            enterkeyhint="search"
            autocapitalize="off"
            spellcheck="false"
          />
          <button v-if="keyword" type="button" class="clear-btn" aria-label="清空搜索" @click="clearSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button type="submit" class="search-submit">搜索</button>
        </form>

        <div class="hero-suggestions" aria-label="热门分类">
          <button
            v-for="cat in quickCategories"
            :key="cat"
            type="button"
            :class="['suggest-chip', { active: searchQuery === cat }]"
            @click="searchCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </header>

      <div class="search-layout">

        <section class="search-results" aria-live="polite">
          <div class="results-head">
            <div>
              <h2 class="results-title">
                {{ searchQuery ? `“${searchQuery}”` : '搜索好物' }}
              </h2>
            </div>
            <div v-if="searchQuery && !loading && !error" class="results-count">
              <strong>{{ results.length }}</strong>
              <span>件好物</span>
            </div>
          </div>

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
              <span class="empty-tape" aria-hidden="true"></span>
              <div class="empty-doodle" aria-hidden="true">
                <svg viewBox="0 0 110 110" fill="none">
                  <circle cx="46" cy="46" r="28" fill="#fbf1d8" stroke="#3f3d56" stroke-width="2.4" />
                  <path d="M67 67l22 22" stroke="#3f3d56" stroke-width="4" stroke-linecap="round" />
                  <path d="M33 41c2-7 9-11 16-10" stroke="#e5bd72" stroke-width="3" stroke-linecap="round" />
                  <path d="M40 54c4 3 9 3 13 0" stroke="#b84461" stroke-width="2" stroke-linecap="round" />
                  <text x="46" y="55" text-anchor="middle" font-family="Noto Serif SC, Songti SC, serif" font-size="24" font-weight="600" fill="#b84461">?</text>
                  <path d="M84 26l1.6 3.8 3.8 1.6-3.8 1.6-1.6 3.8-1.6-3.8-3.8-1.6 3.8-1.6Z" fill="#e5bd72" />
                </svg>
              </div>
              <div class="empty-copy">
                <h3 class="empty-title">{{ searchQuery ? `没有找到“${searchQuery}”` : '搜点什么吧' }}</h3>
                <p class="empty-desc">{{ searchQuery ? '换一个更短的关键词，或者换个分类继续找。' : '输入商品名或关键词；也可以从上面的分类开始逛。' }}</p>
                <div class="empty-actions">
                  <button v-if="searchQuery" type="button" class="btn btn-outline" @click="clearSearch">清空搜索</button>
                  <router-link to="/" class="btn btn-outline">去首页逛逛</router-link>
                </div>
              </div>
            </div>
          </template>
        </section>
      </div>
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

const quickCategories = ['图书教材', '电子产品', '生活用品', '服装鞋帽', '运动器材', '美妆护肤', '数码配件', '文具用品', '食品饮料', '其他']

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

const searchCategory = (category) => {
  keyword.value = category
  if (searchQuery.value === category) {
    fetchResults(true)
    return
  }
  router.replace({ path: '/search', query: { q: category } })
}

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
/* Friendly 搜索页：大标题 + 搜索胶囊 + 左侧分类栏 */
.page {
  min-height: 100vh;
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 30px 36px 80px;
}

.search-hero {
  padding: 4px 0 26px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
}

.hero-copy { max-width: 680px; }

.hero-title {
  margin: 0 0 8px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: clamp(26px, 2.3vw, 31px);
  font-weight: 600;
  line-height: 1.26;
  letter-spacing: 0.015em;
}

.hero-title em {
  color: var(--primary);
  font-style: normal;
}

.hero-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 14px;
  line-height: 1.7;
}

.search-form {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 56px;
  margin-top: 18px;
  padding: 6px 6px 6px 16px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  box-shadow: 3px 3px 0 rgba(63, 61, 86, 0.05);
}

.search-form:focus-within {
  border-color: var(--line-strong);
  box-shadow: 0 0 0 3px rgba(184, 68, 97, 0.08);
}

.search-form-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--primary);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 4px;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
}

.search-input::placeholder { color: var(--text-4); }

.clear-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  background: var(--cream-1);
  border: 0;
  border-radius: 999px;
  color: var(--text-3);
  cursor: pointer;
}

.clear-btn svg { width: 14px; height: 14px; }

.search-submit {
  flex-shrink: 0;
  min-width: 88px;
  min-height: 46px;
  padding: 0 20px;
  background: var(--primary);
  border: 0;
  border-radius: 4px;
  color: var(--on-primary);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.22s var(--fish-ease), transform 0.22s var(--fish-ease);
}

.search-submit:hover { background: var(--primary-2); }
.search-submit:active { transform: scale(0.98); }

.hero-suggestions {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.suggest-chip {
  min-height: 32px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 999px;
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.22s var(--fish-ease), color 0.22s var(--fish-ease);
}

.suggest-chip:hover { background: var(--card); color: var(--ink); }

.suggest-chip.active {
  background: var(--primary-3);
  color: var(--primary-2);
}

.search-layout {
  display: block;
  margin-top: 22px;
}

.search-facets {
  position: sticky;
  top: 100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.facet-card {
  padding: 16px 10px 10px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.facet-eyebrow {
  margin: 0 0 3px;
  padding: 0 8px;
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.facet-title {
  margin: 0 0 12px;
  padding: 0 8px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.facet-list { display: flex; flex-direction: column; gap: 2px; }

.facet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 8px;
  background: transparent;
  border: 0;
  border-radius: 11px;
  color: var(--text-2);
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.facet-item span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.facet-arrow { color: var(--text-4); font-size: 12px; }

.facet-item:hover { background: var(--cream-1); color: var(--ink); }

.facet-item.active {
  background: var(--primary-3);
  color: var(--primary-2);
}

.facet-item.active .facet-arrow { color: var(--primary-2); }

.facet-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 13px 14px;
  background: var(--secondary-3);
  border-radius: 18px;
  color: var(--secondary-2);
}

.facet-note span { font-size: 15px; line-height: 1.3; }

.facet-note p {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.65;
}

.search-results { min-width: 0; }

.results-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 2px 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}

.results-eyebrow {
  margin: 0 0 4px;
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.results-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.01em;
  word-break: break-word;
}

.results-count {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
  color: var(--text-3);
  font-size: 11px;
}

.results-count strong {
  color: var(--primary);
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.skeleton-grid { pointer-events: none; }

.skeleton-card {
  min-width: 0;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
}

.skeleton-image {
  aspect-ratio: 4 / 3.4;
  background: linear-gradient(100deg, var(--cream-1) 20%, #fff 42%, var(--cream-1) 64%);
  background-size: 220% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

.skeleton-copy { padding: 12px 14px 16px; }

.skeleton-line {
  display: block;
  height: 9px;
  border-radius: 99px;
  background: var(--cream-1);
}

.skeleton-line.wide { width: 76%; margin-bottom: 8px; }
.skeleton-line.short { width: 38%; }

@keyframes shimmer {
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
}

.state-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  padding: 44px 24px;
  text-align: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 28px;
}

/* 搜索无结果：一张贴在公告栏上的便签 */
.empty-state {
  position: relative;
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  align-items: center;
  gap: 6px 24px;
  width: min(100%, 700px);
  min-height: 0;
  margin: 10px auto 0;
  padding: 26px 32px 26px 22px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  box-shadow: 4px 5px 0 rgba(63, 61, 86, 0.055);
  transform: rotate(-0.3deg);
  text-align: left;
}

.empty-tape {
  position: absolute;
  top: -10px;
  left: 50%;
  width: 78px;
  height: 18px;
  background: rgba(229, 189, 114, 0.3);
  border-left: 1px solid rgba(229, 189, 114, 0.46);
  border-right: 1px solid rgba(229, 189, 114, 0.46);
  transform: translateX(-50%) rotate(1.2deg);
}

.empty-doodle {
  grid-row: 1 / 3;
  width: 104px;
}

.empty-doodle svg { width: 100%; height: auto; }

.empty-copy {
  min-width: 0;
}

.state-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  background: var(--primary-3);
  border-radius: 12px;
  color: var(--primary-2);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
}

.empty-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.empty-desc {
  max-width: 520px;
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.7;
}

.empty-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 9px 20px;
  border-radius: 4px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.22s var(--fish-ease), transform 0.22s var(--fish-ease);
}

.btn-primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: var(--on-primary);
}

.btn-secondary,
.btn-outline {
  background: var(--card);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
}

.btn-secondary:hover,
.btn-outline:hover { background: var(--cream-1); }
.btn-primary:hover { background: var(--primary-2); }

.load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0 4px;
}

@media (max-width: 1024px) {
  .main-content { padding: 24px 24px 64px; }
  .search-hero { padding: 2px 0 22px; border-radius: 0; }
  .search-layout { display: block; }
  .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; }
  .hero-suggestions { gap: 5px; }
  .suggest-chip { padding: 8px 10px; min-height: 44px; }
}

@media (max-width: 767px) {
  .main-content { padding: 16px 14px 108px; }
  .search-hero { padding: 0 0 18px; border-radius: 0; }
  .hero-title { font-size: 28px; }
  .hero-desc { font-size: 13px; }
  .search-form { min-height: 52px; margin-top: 16px; padding-left: 14px; }
  .search-input { font-size: 14px; }
  .search-submit { min-width: 76px; min-height: 44px; padding: 0 16px; }
  .hero-suggestions {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    margin: 12px -14px 0;
    padding: 0 14px 3px;
    scrollbar-width: none;
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
  }
  .hero-suggestions::-webkit-scrollbar { display: none; }
  .suggest-chip { flex: 0 0 auto; min-height: 44px; padding: 8px 14px; }
  .search-layout { display: block; margin-top: 16px; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .results-head { padding-bottom: 12px; margin-bottom: 14px; }
  .results-title { font-size: 21px; }
  .products-grid { gap: 11px; }
  .state-panel { min-height: 300px; padding: 34px 18px; border-radius: 24px; }
  .empty-state {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 6px;
    min-height: 0;
    padding: 30px 20px 24px;
    border-radius: 4px;
    text-align: center;
  }
  .empty-doodle { grid-row: auto; width: 88px; margin: 0 auto -2px; }
  .empty-title, .empty-desc, .empty-actions { grid-column: 1; grid-row: auto; }
  .empty-desc { max-width: 34ch; }
  .empty-actions { justify-content: center; margin-top: 12px; }
}

@media (max-width: 380px) {
  .search-form { padding-left: 12px; }
  .search-input { font-size: 13px; }
  .search-submit { min-width: 64px; padding: 0 12px; }
  .hero-title { font-size: 27px; }
  .products-grid { gap: 9px; }
}
</style>
