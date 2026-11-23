<template>
  <div class="home-page">
    <!-- 页面锚点 -->
    <header class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow">CAMPUS MARKET</span>
        <h1 class="hero-title">校园好物</h1>
        <p class="hero-desc">把闲置交给需要的人，在校园里完成交易。</p>
      </div>
      <router-link to="/publish" class="hero-cta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        发布闲置
      </router-link>
    </header>

    <!-- 吸顶筛选区 -->
    <div class="fixed-header">
      <!-- 搜索框 -->
      <div class="search-section">
        <div class="search-box">
          <input 
            type="text" 
            placeholder="搜索校园二手好物..." 
            class="search-input"
            @keyup.enter="handleSearch"
            v-model="searchKeyword"
          />
          <button 
            v-if="searchKeyword" 
            class="clear-btn" 
            @click="clearSearch"
            title="清除搜索"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button 
            class="search-btn" 
            @click="handleSearch"
            title="搜索"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- 分类标签 -->
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

    <!-- 可滚动内容区域 -->
    <main class="main-content">
      <div class="feed-head">
        <div class="feed-heading">
          <h2>在售好物</h2>
          <p>按发布时间浏览校园里的最新闲置</p>
        </div>
        <div class="feed-count">
          <strong>{{ filteredProducts.length }}</strong>
          <span>件在售</span>
        </div>
      </div>

      <!-- 商品网格 -->
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
        <div class="empty-state" v-if="filteredProducts.length === 0" :key="'empty-' + currentCategory">
          <div class="empty-icon"><Icon name="box" /></div>
          <p class="empty-title">暂无商品</p>
          <router-link to="/publish" class="btn btn-primary empty-action">去发布</router-link>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import XHSProductCard from '@/components/XHSProductCard.vue'
import Icon from '@/components/Icon.vue'
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
const searchKeyword = ref('')

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
    
    // 添加搜索关键词
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim()
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
    }
  } catch (error) {
    console.error('获取商品列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  // 重置并重新加载商品
  fetchProducts(true)
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  fetchProducts(true)
}

// 监听搜索关键词变化（防抖）
let searchTimer = null
watch(searchKeyword, (newVal) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchProducts(true)
  }, 500) // 500ms 防抖
})

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
/* 网页比例：内容列 1120px，四栏纸卡 */
.home-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 32px 72px;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
}

/* 页头：说明 + 唯一主操作 */
.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 4px 2px 20px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.hero-title {
  margin: 0;
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--ink);
}

.hero-desc {
  margin: 0;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.6;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-shrink: 0;
  min-height: 48px;
  padding: 10px 20px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 900;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.hero-cta svg {
  width: 17px;
  height: 17px;
}

.hero-cta:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.hero-cta:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

/* 吸顶筛选条：纸底 + 实线 */
.fixed-header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding-top: 4px;
  background: var(--bg);
  border-bottom: 2px solid var(--line-2);
}

.search-section {
  display: flex;
  justify-content: center;
  padding: 4px 0 0;
}

.search-box {
  position: relative;
  width: 100%;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 14px;
  box-shadow: 4px 5px 0 var(--shadow);
  transition: box-shadow 0.26s var(--fish-ease), border-color 0.26s var(--fish-ease);
}

.search-box:hover {
  box-shadow: 5px 6px 0 var(--shadow);
}

.search-box:focus-within {
  border-color: var(--primary-2);
  box-shadow: 6px 7px 0 var(--shadow);
}

.search-input {
  width: 100%;
  padding: 15px 108px 15px 18px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--ink);
  font-size: 16px;
  font-weight: 500;
}

.search-input::placeholder {
  color: var(--text-4);
  font-weight: 500;
}

.search-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 10px;
  box-shadow: 2px 3px 0 var(--shadow);
  cursor: pointer;
  z-index: 3;
  transition: transform 0.2s var(--fish-ease), box-shadow 0.2s var(--fish-ease);
}

.search-btn svg {
  width: 18px;
  height: 18px;
  color: var(--on-primary);
}

.search-btn:hover {
  transform: translateY(calc(-50% - 1px));
  box-shadow: 3px 4px 0 var(--shadow);
}

.search-btn:active {
  transform: translateY(calc(-50% + 2px));
  box-shadow: 1px 1px 0 var(--shadow);
}

.clear-btn {
  position: absolute;
  right: 62px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  cursor: pointer;
  z-index: 2;
}

.clear-btn svg {
  width: 13px;
  height: 13px;
  color: var(--text-2);
}

.clear-btn:hover {
  background: var(--cream-3);
}

/* 分类：桌面端换行完整展示，移动端横向滑动 */
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 13px 0 14px;
  overflow: visible;
}
.categories::-webkit-scrollbar { display: none; }

.category-btn {
  flex-shrink: 0;
  min-height: 38px;
  padding: 7px 18px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              transform 0.26s var(--fish-ease);
}

.category-btn:hover {
  background: var(--cream-2);
}

.category-btn:active {
  transform: translateY(2px);
}

.category-btn.active {
  background: var(--primary);
  color: var(--on-primary);
  box-shadow: 2px 3px 0 var(--shadow);
}

/* 内容区 */
.main-content {
  flex: 1;
  padding-top: 12px;
  max-width: 100%;
  margin: 0;
  overflow: visible;
}

/* 内容区标题：把“浏览”和“筛选”分开 */
.feed-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 2px 14px;
  border-bottom: 2px solid var(--line-2);
  margin-bottom: 16px;
}

.feed-heading h2 {
  margin: 0 0 2px;
  color: var(--ink);
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.feed-heading p {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
}

.feed-count {
  display: flex;
  align-items: baseline;
  gap: 5px;
  padding-bottom: 2px;
  white-space: nowrap;
}

.feed-count strong {
  color: var(--primary-2);
  font-size: 22px;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.feed-count span {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
  margin: 0 0 8px;
}

/* 入场：一次，按 0.04s 交错 */
.products-grid > * { animation-delay: 0s; }
.products-grid > *:nth-child(2) { animation-delay: 0.04s; }
.products-grid > *:nth-child(3) { animation-delay: 0.08s; }
.products-grid > *:nth-child(4) { animation-delay: 0.12s; }
.products-grid > *:nth-child(5) { animation-delay: 0.16s; }
.products-grid > *:nth-child(6) { animation-delay: 0.2s; }
.products-grid > *:nth-child(7) { animation-delay: 0.24s; }
.products-grid > *:nth-child(8) { animation-delay: 0.28s; }

/* 页面切换只淡入 */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.26s var(--fish-ease); }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

.fade-empty-enter-active { transition: opacity 0.3s var(--fish-ease); }
.fade-empty-leave-active { transition: opacity 0.2s var(--fish-ease); }
.fade-empty-enter-from,
.fade-empty-leave-to { opacity: 0; }

/* 加载更多：次级胶囊 */
.load-more {
  display: flex;
  justify-content: center;
  margin: 28px 0 8px;
}

.load-more-btn {
  min-height: 44px;
  padding: 10px 32px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-soft);
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.load-more-btn:hover {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.load-more-btn:active {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

/* 空态：实线圆 + 唯一主操作 */
.empty-state {
  gap: 14px;
  min-height: 300px;
  max-height: none;
  margin-top: 12px;
  padding: 48px 20px;
}

.empty-icon {
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-3);
}

.empty-icon :deep(svg) {
  width: 44px;
  height: 44px;
  stroke-width: 1.6;
}

.empty-title {
  color: var(--ink);
  font-size: 17px;
  font-weight: 800;
}

.empty-action {
  margin-top: 2px;
}

/* 1024 以下：三栏 */
@media (max-width: 1023px) {
  .home-page { padding: 20px 24px 64px; }
  .products-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .hero-title { font-size: 30px; }
  .hero-cta { padding: 9px 16px; }
}

/* 手机：两栏，控件保持 44px */
@media (max-width: 767px) {
  .home-page { padding: 16px 12px 24px; }
  .home-hero { padding-bottom: 12px; gap: 12px; }
  .hero-title { font-size: 26px; }
  .hero-desc { font-size: 12px; line-height: 1.5; }
  .hero-cta { display: none; }
  .categories {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    margin-right: -12px;
    padding-right: 12px;
  }
  .categories::-webkit-scrollbar { display: none; }
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .search-input { padding: 13px 96px 13px 14px; font-size: 15px; }
  .search-btn { width: 40px; height: 40px; right: 6px; }
  .clear-btn { right: 54px; width: 26px; height: 26px; }
  .category-btn { padding: 6px 14px; font-size: 13px; min-height: 36px; }
  .feed-head { padding: 6px 2px 10px; margin-bottom: 12px; }
  .feed-heading h2 { font-size: 17px; }
  .feed-heading p { display: none; }
  .feed-count strong { font-size: 19px; }
  .main-content { padding-top: 8px; }
  .load-more-btn { padding: 9px 26px; font-size: 13px; }
  .empty-icon { width: 80px; height: 80px; }
}
</style>
