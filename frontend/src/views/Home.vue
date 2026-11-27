<template>
  <div class="home-page">
    <!-- 页面锚点 -->
    <header class="home-hero">
      <div class="hero-copy">
        <h1 class="hero-title">把闲置，<em>卖给同校的人</em></h1>
        <p class="hero-desc">教材、数码、宿舍用品，发布后同校同学就能看到。当面验货，不收服务费。</p>
      </div>
      <div class="hero-side">
        <router-link to="/publish" class="hero-link">
          <span>发布闲置</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="13 6 19 12 13 18"></polyline>
          </svg>
        </router-link>
      </div>
    </header>

    <div class="home-workspace">
      <!-- 桌面分类索引；平板以下收进顶部横条 -->
      <aside class="category-rail" aria-labelledby="category-rail-title">
        <h2 id="category-rail-title" class="rail-title">分类</h2>
        <div class="rail-list">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            :class="['rail-item', { active: currentCategory === category.id }]"
            @click="currentCategory = category.id"
          >
            <span>{{ category.name }}</span>
            <span class="rail-mark" aria-hidden="true">{{ currentCategory === category.id ? '•' : '' }}</span>
          </button>
        </div>
      </aside>

      <!-- 可滚动内容区域 -->
      <main class="main-content">
        <!-- 平板/手机：顶部横滑分类 -->
        <div class="fixed-header">
          <div class="categories">
            <button
              v-for="category in categories"
              :key="category.id"
              :class="['category-btn', { active: currentCategory === category.id }]"
              @click="currentCategory = category.id"
            >
              <span>{{ category.name }}</span>
            </button>
          </div>
        </div>

        <div class="feed-head" id="feed">
        <div class="feed-heading">
          <h2>在售好物</h2>
        </div>
        <div class="feed-count">
          <strong>{{ filteredProducts.length }}</strong>
          <span>件在售</span>
        </div>
      </div>

      <!-- 加载中：骨架卡片，避免先闪一下空态 -->
      <div v-if="loading && products.length === 0" class="products-grid skeleton-grid" aria-hidden="true">
        <div v-for="i in 8" :key="i" class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-copy">
            <span class="skeleton-line wide"></span>
            <span class="skeleton-line short"></span>
          </div>
        </div>
      </div>

      <!-- 加载失败：给出原因和重试 -->
      <div v-else-if="loadError && products.length === 0" class="empty-state">
        <div class="empty-icon error-icon">!</div>
        <p class="empty-title">没能加载商品</p>
        <p class="empty-desc">{{ loadError }}</p>
        <button class="btn btn-primary" @click="fetchProducts(true)">重试</button>
      </div>

      <template v-else>
        <transition name="fade" mode="out-in">
          <div class="products-grid" :key="currentCategory">
            <XHSProductCard
              v-for="item in filteredProducts"
              :key="item.id"
              :product="item"
            />
          </div>
        </transition>

        <!-- 加载更多 -->
        <div class="load-more" v-if="hasMore && filteredProducts.length > 0">
          <button class="load-more-btn" @click="loadMore">
            加载更多
          </button>
        </div>

        <!-- 空状态 -->
        <transition name="fade-empty">
          <div class="empty-state empty-catalog" v-if="filteredProducts.length === 0" :key="'empty-' + currentCategory">
            <div class="empty-doodle" aria-hidden="true">
              <svg viewBox="0 0 200 140" fill="none">
                <ellipse cx="100" cy="129" rx="66" ry="5.5" fill="var(--line)" opacity="0.55" />
                <path d="M53 67 148 67 142 124 58 124Z" fill="var(--card)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round" />
                <path d="M53 67 37 45 80 56 85 67" fill="var(--butter-soft)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round" />
                <path d="M148 67 163 45 120 56 116 67" fill="var(--butter-soft)" stroke="var(--ink)" stroke-width="2.2" stroke-linejoin="round" />
                <g transform="rotate(-9 89 57)">
                  <rect x="70" y="42" width="40" height="19" rx="2" fill="var(--primary-3)" stroke="var(--primary)" stroke-width="1.8" />
                  <path d="M78 42v19" stroke="var(--primary)" stroke-width="1.8" />
                </g>
                <path d="M121 57c3-10 11-12 15-11 3 1 3 5-1 9-3 3-7 4-14 2Z" fill="var(--secondary-3)" stroke="var(--secondary-2)" stroke-width="1.8" />
                <path d="M125 57c-6-3-11-1-13 3-1 4 2 6 7 5 4-1 6-4 6-8Z" fill="var(--secondary-3)" stroke="var(--secondary-2)" stroke-width="1.8" />
                <path d="M118 58h11l-2 9h-7Z" fill="var(--butter)" stroke="var(--ink)" stroke-width="1.8" />
                <path d="M100 57v9" stroke="var(--ink)" stroke-width="1.6" />
                <g transform="rotate(8 100 71)">
                  <rect x="87" y="65" width="26" height="14" rx="2" fill="var(--butter-soft)" stroke="var(--ink)" stroke-width="1.8" />
                  <circle cx="89.5" cy="68.5" r="1.8" fill="var(--card)" stroke="var(--ink)" stroke-width="1.4" />
                  <text x="96" y="76" fill="var(--ink)" font-family="JetBrains Mono, monospace" font-size="8">¥ 5</text>
                </g>
                <path d="M65 101c4-3 13-3 17 0M70 108h8" stroke="var(--line-strong)" stroke-width="1.6" stroke-linecap="round" />
                <circle cx="135" cy="104" r="2.2" fill="var(--primary)" />
              </svg>
            </div>
            <div class="empty-copy">
              <p class="empty-title">{{ currentCategory !== 'all' ? '这个分类还没有在售的闲置' : '还没有在售的闲置' }}</p>
              <p class="empty-desc">{{ currentCategory !== 'all' ? '换个分类看看，或发布第一件。' : '第一件商品发布后，会出现在这里。' }}</p>
            </div>
            <button v-if="currentCategory !== 'all'" type="button" class="btn btn-outline" @click="currentCategory = 'all'">查看全部</button>
            <router-link v-else to="/publish" class="btn btn-primary empty-action">发布第一件</router-link>
          </div>
        </transition>
      </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import XHSProductCard from '@/components/XHSProductCard.vue'
import { getCategories } from '@/api/category'
import { getProducts } from '@/api/product'
import { getImageUrl } from '@/config'
import { generateAvatar, resolveAvatar } from '@/utils/avatar'
import imagePreloader from '@/utils/imagePreloader'

defineOptions({
  name: 'Home'
})

// 数据库类别名到前端分类ID的映射
const categoryMap = {
  '电子产品': 'electronics',
  '图书教材': 'books',
  '服装鞋帽': 'clothes',
  '生活用品': 'daily',
  '运动器材': 'sports',
  '美妆护肤': 'beauty',
  '数码配件': 'digital',
  '文具用品': 'stationery',
  '食品饮料': 'food',
  '其他': 'other'
}

// 分类数据
const categories = ref([
  { id: 'all', name: '全部' }
])
const currentCategory = ref('all')
const hasMore = ref(true)
const loading = ref(false)
const products = ref([])
const offset = ref(0)
const limit = 20
const loadError = ref('')

// 获取类别列表
const fetchCategories = async () => {
  try {
    const response = await getCategories()
    if (response.success) {
      // 将数据库类别转换为前端格式(不再使用数据库的icon字段)
      const dbCategories = response.data.map(cat => ({
        id: categoryMap[cat.name] || 'other',
        name: cat.name,
        dbName: cat.name // 保存数据库中的原始名称
      }))
      categories.value = [
        { id: 'all', name: '全部' },
        ...dbCategories
      ]
    }
  } catch (error) {
    console.error('获取类别失败:', error)
    // 失败时使用默认分类
  }
}

// 获取商品列表
const fetchProducts = async (reset = false) => {
  if (loading.value) return
  
  loading.value = true
  loadError.value = ''
  try {
    if (reset) {
      offset.value = 0
      products.value = []
    }
    
    const params = {
      limit,
      offset: offset.value,
      status: 'available'
    }
    
    // 如果不是"全部"分类,需要传递数据库中的类别名称
    if (currentCategory.value !== 'all') {
      const currentCat = categories.value.find(c => c.id === currentCategory.value)
      if (currentCat && currentCat.dbName) {
        params.category = currentCat.dbName
      }
    }
    
    const response = await getProducts(params)
    if (response.success) {
      // 转换数据格式以适配前端 ProductCard 组件
      const formattedProducts = response.data.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        originalPrice: null, // 数据库没有原价字段
        image: product.images && product.images.length > 0 
          ? getImageUrl(product.images[0])
          : 'https://picsum.photos/400/400?random=' + product.id,
        location: '校园', // 可以后续添加位置字段
        views: 0, // 可以后续添加浏览量字段
        favoriteCount: product.favorite_count ?? product.favoriteCount ?? 0, // 收藏人数
        sellerAvatar: resolveAvatar(product.seller_avatar, product.seller_name || '用户'),
        sellerName: product.seller_name || '匿名用户',
        publishTime: formatTime(product.created_at),
        status: product.status,
        category: categoryMap[product.category] || 'other'
      }))
      
      if (reset) {
        products.value = formattedProducts
      } else {
        products.value = [...products.value, ...formattedProducts]
      }
      
      // 预加载图片以提高显示速度
      const imageUrls = formattedProducts
        .filter(p => p.image && !p.image.includes('picsum.photos'))
        .map(p => p.image)
      
      if (imageUrls.length > 0) {
        imagePreloader.preloadBatch(imageUrls, { timeout: 3000 })
          .catch(err => console.warn('图片预加载失败:', err))
      }
      
      hasMore.value = response.pagination?.hasMore || false
      offset.value += limit
    } else {
      loadError.value = response.message || '商品列表暂时不可用。'
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
    loadError.value = '网络有点慢，请稍后重试。'
  } finally {
    loading.value = false
  }
}

// 格式化时间
const formatTime = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else if (days < 30) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

// 临时模拟数据（作为后备数据）
const mockProducts = ref([
  {
    id: 1,
    title: 'iPhone 13 Pro Max 256G 深空灰 99新',
    price: 6999,
    originalPrice: 9999,
    image: 'https://picsum.photos/400/400?random=1',
    location: '北京·海淀',
    views: 128,
    sellerAvatar: generateAvatar('张同学'),
    sellerName: '张同学',
    publishTime: '2小时前',
    status: '热卖',
    category: 'electronics'
  },
  {
    id: 2,
    title: '高等数学教材 第七版 同济大学',
    price: 25,
    originalPrice: 58,
    image: 'https://picsum.photos/400/400?random=2',
    location: '北京·朝阳',
    views: 86,
    sellerAvatar: generateAvatar('李同学'),
    sellerName: '李同学',
    publishTime: '5小时前',
    category: 'books'
  },
  {
    id: 3,
    title: '全新羽毛球拍 YONEX 双拍套装',
    price: 299,
    originalPrice: 598,
    image: 'https://picsum.photos/400/400?random=3',
    location: '上海·徐汇',
    views: 234,
    sellerAvatar: generateAvatar('王同学'),
    sellerName: '王同学',
    publishTime: '1天前',
    category: 'sports'
  },
  {
    id: 4,
    title: 'MacBook Pro 2021 M1 芯片 16GB 512GB',
    price: 12999,
    originalPrice: 15999,
    image: 'https://picsum.photos/400/400?random=4',
    location: '深圳·南山',
    views: 567,
    sellerAvatar: generateAvatar('刘同学'),
    sellerName: '刘同学',
    publishTime: '3小时前',
    status: '热卖',
    category: 'electronics'
  },
  {
    id: 5,
    title: 'Nike Air Force 1 白色板鞋 US9码',
    price: 499,
    originalPrice: 799,
    image: 'https://picsum.photos/400/400?random=5',
    location: '杭州·西湖',
    views: 345,
    sellerAvatar: generateAvatar('陈同学'),
    sellerName: '陈同学',
    publishTime: '6小时前',
    category: 'clothes'
  },
  {
    id: 6,
    title: '索尼降噪耳机 WH-1000XM4 黑色',
    price: 1699,
    originalPrice: 2499,
    image: 'https://picsum.photos/400/400?random=6',
    location: '成都·武侯',
    views: 432,
    sellerAvatar: generateAvatar('赵同学'),
    sellerName: '赵同学',
    publishTime: '1天前',
    category: 'electronics'
  },
  {
    id: 7,
    title: '英语四级词汇书 新东方乱序版',
    price: 18,
    originalPrice: 38,
    image: 'https://picsum.photos/400/400?random=7',
    location: '武汉·洪山',
    views: 156,
    sellerAvatar: generateAvatar('周同学'),
    sellerName: '周同学',
    publishTime: '2天前',
    category: 'books'
  },
  {
    id: 8,
    title: '瑜伽垫加厚10mm 防滑健身垫',
    price: 59,
    originalPrice: 129,
    image: 'https://picsum.photos/400/400?random=8',
    location: '西安·雁塔',
    views: 89,
    sellerAvatar: generateAvatar('吴同学'),
    sellerName: '吴同学',
    publishTime: '12小时前',
    category: 'sports'
  },
  {
    id: 9,
    title: '小米充电宝 20000mAh 50W快充',
    price: 129,
    originalPrice: 199,
    image: 'https://picsum.photos/400/400?random=9',
    location: '南京·鼓楼',
    views: 278,
    sellerAvatar: generateAvatar('郑同学'),
    sellerName: '郑同学',
    publishTime: '8小时前',
    category: 'electronics'
  },
  {
    id: 10,
    title: 'Uniqlo 基础款T恤 纯棉多色可选',
    price: 39,
    originalPrice: 79,
    image: 'https://picsum.photos/400/400?random=10',
    location: '重庆·渝中',
    views: 123,
    sellerAvatar: generateAvatar('冯同学'),
    sellerName: '冯同学',
    publishTime: '1天前',
    category: 'clothes'
  },
])

// 过滤商品
const filteredProducts = computed(() => {
  return products.value
})

// 监听分类切换
watch(currentCategory, () => {
  fetchProducts(true)
})

// 加载更多
function loadMore() {
  fetchProducts(false)
}

// 页面加载时获取数据
onMounted(() => {
  fetchCategories()
  fetchProducts(true)
})
</script>

<style scoped>
/* Friendly 首页：搜索优先、粉彩英雄区、温柔商品流 */
.home-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 32px 84px;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
}

/* 主页：页头 + 分类索引 + 商品主区 */
.home-workspace {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
}

.category-rail {
  position: sticky;
  top: calc(98px + env(safe-area-inset-top, 0px));
  min-width: 0;
  padding-top: 26px;
}

.rail-title {
  margin: 0;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.rail-list {
  display: flex;
  flex-direction: column;
}

.rail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line-2);
  border-radius: 0;
  color: var(--text-3);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.rail-item:hover {
  background: var(--cream-1);
  color: var(--ink);
}

.rail-item.active {
  background: var(--cream-1);
  color: var(--primary-2);
  font-weight: 600;
}

.rail-mark {
  width: 10px;
  color: var(--primary);
  font-size: 13px;
  line-height: 1;
  text-align: right;
}

/* 吸顶分类只在平板与手机出现 */
.fixed-header { display: none; }

/* 页头：直接说明在卖什么，按钮靠右，不用装饰卡 */
.home-hero {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 42px 0 38px;
  border-bottom: 1px solid var(--line);
}

.hero-copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  max-width: 760px;
}

.hero-title {
  margin: 0;
  max-width: none;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: clamp(36px, 3.8vw, 48px);
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.15;
}

.hero-title em {
  position: relative;
  display: inline-block;
  color: var(--primary);
  font-style: normal;
}

.hero-desc {
  margin: 15px 0 0;
  max-width: 620px;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.75;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 0 0 auto;
  width: auto;
}

.hero-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 4px 0 5px;
  border-bottom: 1px solid var(--line-strong);
  color: var(--primary-2);
  font-size: 13px;
  font-weight: 600;
  transition: color 0.2s var(--fish-ease), border-color 0.2s var(--fish-ease);
}

.hero-link svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s var(--fish-ease);
}

.hero-link:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.hero-link:hover svg {
  transform: translateX(3px);
}

.hero-points {
  display: flex;
  align-items: center;
  gap: 18px;
  flex-wrap: wrap;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
  color: var(--text-3);
  font-size: 12px;
}

.hero-points li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hero-points li span {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--secondary-2);
}

/* 右侧说明：结构化的交易步骤，而不是悬浮数据卡 */
.hero-board {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 8px 0 8px 34px;
  border-left: 1px solid var(--line-strong);
}

.board-eyebrow {
  margin: 0 0 12px;
  color: var(--primary-2);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.board-title {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.4;
}

.board-steps {
  display: grid;
  gap: 17px;
  margin: 24px 0 0;
  padding: 0;
  list-style: none;
}

.board-steps li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 10px;
}

.board-steps li > span {
  padding-top: 3px;
  color: var(--primary);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.board-steps strong {
  display: block;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.board-steps p {
  margin: 4px 0 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.65;
}

.board-foot {
  margin: 24px 0 0;
  padding-top: 15px;
  border-top: 1px solid var(--line);
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* 搜索与分类：吸顶但保持轻盈 */
.fixed-header {
  position: sticky;
  top: calc(74px + env(safe-area-inset-top, 0px));
  z-index: 100;
  margin: 0 -4px;
  padding: 0 4px;
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  border-bottom: 1px solid var(--line);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* 分类：桌面完整换行，移动横向滑动 */
.categories {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 22px;
  padding: 0;
  overflow: visible;
}

.categories::-webkit-scrollbar { display: none; }

/* 分类是报纸索引，不是一排胶囊按钮 */
.category-btn {
  position: relative;
  flex-shrink: 0;
  min-height: 46px;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.category-btn:hover {
  background: transparent;
  color: var(--ink);
}

.category-btn:active {
  transform: translateY(1px);
}

.category-btn.active {
  background: transparent;
  border-bottom-color: var(--primary);
  color: var(--primary-2);
  font-weight: 600;
  box-shadow: none;
}

/* 商品流 */
.main-content {
  flex: 1;
  padding-top: 0;
  max-width: 100%;
  margin: 0;
  overflow: visible;
}

.feed-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 26px 0 18px;
}

.feed-heading h2 {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0;
}

.feed-count {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  white-space: nowrap;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
}

.feed-count strong {
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.feed-count span {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 600;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
  margin: 0 0 8px;
}

/* 骨架：与商品卡同节奏 */
.skeleton-card {
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: none;
}

.skeleton-image {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--cream-2);
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

.skeleton-copy {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px 14px 16px;
}

.skeleton-line {
  height: 10px;
  background: var(--cream-2);
  border-radius: 999px;
  animation: skeletonPulse 1.4s ease-in-out infinite;
}

.skeleton-line.wide { width: 86%; }
.skeleton-line.short { width: 46%; }

@keyframes skeletonPulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.95; }
}

/* 交错入场 */
.products-grid > * { animation-delay: 0s; }
.products-grid > *:nth-child(2) { animation-delay: 0.04s; }
.products-grid > *:nth-child(3) { animation-delay: 0.08s; }
.products-grid > *:nth-child(4) { animation-delay: 0.12s; }
.products-grid > *:nth-child(5) { animation-delay: 0.16s; }
.products-grid > *:nth-child(6) { animation-delay: 0.2s; }
.products-grid > *:nth-child(7) { animation-delay: 0.24s; }
.products-grid > *:nth-child(8) { animation-delay: 0.28s; }

.fade-enter-active,
.fade-leave-active { transition: opacity 0.24s var(--fish-ease); }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.fade-empty-enter-active { transition: opacity 0.28s var(--fish-ease); }
.fade-empty-leave-active { transition: opacity 0.18s var(--fish-ease); }
.fade-empty-enter-from,
.fade-empty-leave-to { opacity: 0; }

/* 加载更多 */
.load-more {
  display: flex;
  justify-content: center;
  margin: 30px 0 8px;
}

.load-more-btn {
  min-height: 46px;
  padding: 10px 30px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.24s var(--fish-ease), border-color 0.24s var(--fish-ease),
    transform 0.24s var(--fish-ease);
}

.load-more-btn:hover {
  background: var(--cream-1);
  border-color: var(--primary-3);
  transform: translateY(-1px);
}

.load-more-btn:active {
  transform: translateY(1px);
}

/* 空态 */
.empty-desc {
  max-width: 34ch;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.65;
}

.empty-icon.error-icon {
  color: var(--danger);
  border-color: var(--danger);
  font-size: 20px;
  font-weight: 600;
}

.empty-state {
  gap: 12px;
  min-height: 260px;
  max-height: none;
  margin-top: 12px;
  padding: 44px 20px;
  background: transparent;
  border-top: 1px solid var(--line-2);
  border-bottom: 1px solid var(--line-2);
  border-radius: 0;
}

.empty-state.empty-catalog {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 20px;
  width: 100%;
  min-height: 0;
  margin: 8px auto 0;
  padding: 24px 0;
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line-2);
  border-bottom: 1px solid var(--line-2);
  border-radius: 0;
  box-shadow: none;
  text-align: left;
}

.empty-doodle {
  flex: 0 0 128px;
  width: 128px;
}

.empty-doodle svg {
  width: 100%;
  height: auto;
}

.empty-catalog .btn { flex: 0 0 auto; margin-left: auto; }

.empty-copy {
  max-width: 560px;
}

.empty-catalog .empty-title {
  margin: 0 0 5px;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 22px;
  line-height: 1.3;
}

.empty-catalog .empty-desc {
  margin: 0;
  max-width: 46ch;
  font-size: 13px;
}

.empty-catalog .btn { flex: 0 0 auto; }

.empty-mark {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding-right: 8px;
  color: var(--primary);
  text-align: right;
}

.empty-mark strong {
  font-family: var(--font-display);
  font-size: 96px;
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.06em;
  font-variant-numeric: tabular-nums;
}

.empty-mark span {
  margin-top: 12px;
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  box-shadow: none;
  color: var(--text-3);
}

.empty-icon :deep(svg) {
  width: 20px;
  height: 20px;
  stroke-width: 1.6;
}

.empty-title {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
}

.empty-action {
  margin-top: 2px;
}

/* 1199 以下取消桌面索引栏，分类回到顶部横条 */
@media (max-width: 1199px) {
  .home-workspace { display: block; }
  .category-rail { display: none; }
  .fixed-header { display: block; }
  .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
  .categories {
    flex-wrap: nowrap;
    justify-content: flex-start;
    gap: 18px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .categories::-webkit-scrollbar { display: none; }
  .categories {
    -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 30px), transparent);
    mask-image: linear-gradient(to right, #000 calc(100% - 30px), transparent);
  }
  .category-btn { flex: 0 0 auto; padding: 6px 9px; font-size: 12px; min-height: 44px; }
}

/* 1100 以下：分类横滑，避免换行孤儿 */
@media (max-width: 1100px) {
  .category-btn { flex: 0 0 auto; padding: 6px 9px; font-size: 12px; }
  .home-hero { gap: 24px; padding: 22px 0 26px; }
  .hero-title { font-size: 38px; }
}

@media (max-width: 1023px) {
  .home-page { padding: 22px 24px 72px; }
  .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
  .feed-heading h2 { font-size: 22px; }
  .category-btn { min-height: 44px; }
}

/* 900 以下不再挤两栏，保持阅读舒适 */
@media (max-width: 767px) {
  .home-hero { flex-direction: column; align-items: stretch; gap: 0; padding: 20px 0 24px; }
  .hero-title { font-size: 34px; }
  .categories {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .categories::-webkit-scrollbar { display: none; }
}

/* 手机：两栏，控件保持 44px */
@media (max-width: 767px) {
  .home-page { padding: 10px 14px calc(94px + env(safe-area-inset-bottom, 0px)); }
  .home-hero {
    padding: 28px 0 26px;
    border-radius: 0;
    gap: 0;
  }
  .hero-title { font-size: 32px; line-height: 1.18; max-width: none; }
  .hero-desc,
  .hero-side { display: none; }
  .fixed-header { top: calc(60px + env(safe-area-inset-top, 0px)); margin: 0 -4px; padding: 0 4px; }
  .categories {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
    margin-right: -12px;
    padding-right: 12px;
  }
  .categories::-webkit-scrollbar { display: none; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .categories { gap: 18px; }
  .category-btn { padding: 9px 0; font-size: 11px; min-height: 44px; }
  .feed-head { padding: 18px 2px 12px; }
  .feed-heading h2 { font-size: 20px; }
  .feed-count { padding: 0; }
  .feed-count strong { font-size: 15px; }
  .feed-count span { font-size: 11px; }
  .main-content { padding-top: 0; }
  .load-more-btn { padding: 9px 26px; font-size: 13px; }
  .empty-icon { width: 44px; height: 44px; }
  .empty-state { padding: 32px 18px; border-radius: 4px; }
  .empty-state.empty-catalog {
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 0;
    padding: 26px 0;
    border-radius: 0;
    text-align: center;
  }
  .empty-doodle { flex: 0 0 auto; width: 128px; margin: 0; }
  .empty-catalog .btn { width: auto; min-width: 172px; margin-left: 0; }
}

/* 手机横屏：压缩首屏，让搜索进入一屏 */
@media (max-height: 520px) and (orientation: landscape) {
  .home-hero { flex-direction: row; align-items: flex-end; gap: 24px; padding: 16px 0 18px; border-radius: 0; }
  .hero-desc { display: none; }
  .hero-title { font-size: 32px; line-height: 1.2; }
  .hero-title br { display: none; }
}

/* 触屏：hover 只作桌面增强，点按后不保留抬升 */
@media (hover: none), (pointer: coarse) {
  .load-more-btn:hover { transform: none; }
  .search-btn:hover { transform: translateY(-50%); }
}
</style>
