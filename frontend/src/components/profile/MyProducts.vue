<template>
  <div class="my-products">
    <!-- 状态筛选 -->
    <div class="filter-tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.value"
        :class="['tab-item', { active: activeTab === tab.value }]"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="products.length === 0" class="empty-state">
      <div class="empty-icon icon-box-large"></div>
      <p>{{ emptyText }}</p>
      <button class="btn-publish" @click="$router.push('/publish')">
        去发布商品
      </button>
    </div>

    <!-- 商品列表 -->
    <div v-else class="products-grid">
      <div 
        v-for="product in products" 
        :key="product.id"
        class="product-item"
      >
        <div class="product-image" @click="goToDetail(product.id)">
          <img :src="getImageUrl(product.images[0])" :alt="product.title" />
          <div v-if="product.status === 'sold'" class="sold-badge">已售出</div>
          <!-- 更多操作按钮 -->
          <button 
            class="btn-more" 
            @click.stop="toggleMenu(product.id)"
            :class="{ active: activeMenu === product.id }"
          >
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </button>
          <!-- 操作菜单 -->
          <div 
            v-if="activeMenu === product.id" 
            class="action-menu"
            @click.stop
          >
            <button 
              v-if="product.status === 'available'"
              class="menu-item menu-sold"
              @click="markAsSold(product.id)"
            >
              <span class="icon">✓</span>
              标记已售
            </button>
            <button 
              v-else
              class="menu-item menu-sold"
              @click="markAsAvailable(product.id)"
            >
              <span class="icon">↺</span>
              设为在售
            </button>
            <button 
              class="menu-item menu-edit"
              @click="editProduct(product.id)"
            >
              <span class="icon">✎</span>
              编辑
            </button>
            <button 
              class="menu-item menu-delete"
              @click="confirmDelete(product.id)"
            >
              <span class="icon">✕</span>
              删除
            </button>
          </div>
        </div>
        <div class="product-info">
          <h4 class="product-title" @click="goToDetail(product.id)">{{ product.title }}</h4>
          <p class="product-price">¥{{ product.price }}</p>
          <div class="product-meta">
            <span class="meta-item">{{ formatDate(product.created_at) }}</span>

          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more">
      <button class="btn-load-more" @click="loadMore">
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMyProducts, updateProductStatus, deleteProduct } from '@/api/product'
import { getImageUrl } from '@/config'
import toast from '@/utils/toast'
import { showConfirm, showDeleteConfirm } from '@/utils/dialog'

const router = useRouter()

const activeTab = ref('all')
const loading = ref(false)
const products = ref([])
const hasMore = ref(false)
const offset = ref(0)
const limit = 20
const activeMenu = ref(null) // 当前激活的菜单

const tabs = ref([
  { label: '全部', value: 'all', count: undefined },
  { label: '在售', value: 'available', count: undefined },
  { label: '已售', value: 'sold', count: undefined }
])

const emptyText = computed(() => {
  const textMap = {
    all: '还没有发布商品',
    available: '没有在售商品',
    sold: '没有已售商品'
  }
  return textMap[activeTab.value] || '暂无商品'
})

// 获取商品列表
const fetchProducts = async (reset = true) => {
  try {
    loading.value = true
    if (reset) {
      offset.value = 0
    }

    const params = {
      status: activeTab.value === 'all' ? undefined : activeTab.value,
      limit,
      offset: offset.value
    }

    const response = await getMyProducts(params)
    
    if (reset) {
      products.value = response.data || []
    } else {
      products.value = [...products.value, ...(response.data || [])]
    }

    hasMore.value = response.pagination?.hasMore || false
    offset.value += limit
  } catch (error) {
    console.error('获取商品列表失败:', error)
    products.value = []
  } finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  fetchProducts(false)
}

// 标记为已售
const markAsSold = async (productId) => {
  const confirmed = await showConfirm({
    title: '标记为已售出',
    message: '确定要标记为已售出吗？',
    type: 'warning',
    confirmText: '标记',
    cancelText: '取消'
  })
  
  if (!confirmed) return

  try {
    await updateProductStatus(productId, 'sold')
    // 刷新列表
    await fetchProducts()
    toast.success('已标记为已售出')
  } catch (error) {
    console.error('标记失败:', error)
    toast.error(error.response?.data?.message || '操作失败')
  }
}

// 设为在售
const markAsAvailable = async (productId) => {
  const confirmed = await showConfirm({
    title: '设为在售',
    message: '确定将该商品设为在售吗？',
    type: 'info',
    confirmText: '设为在售',
    cancelText: '取消'
  })
  if (!confirmed) return
  try {
    await updateProductStatus(productId, 'available')
    await fetchProducts()
    toast.success('已设为在售')
  } catch (error) {
    console.error('设置在售失败:', error)
    toast.error(error.response?.data?.message || '操作失败')
  }
}

// 编辑商品
const editProduct = (productId) => {
  // 简易编辑：跳转发布页带上id；若需要就地弹窗编辑，再加弹窗组件
  router.push({ path: '/publish', query: { id: productId } })
}

// 删除商品
const confirmDelete = async (productId) => {
  const confirmed = await showDeleteConfirm('确定要删除这个商品吗？此操作无法撤销！')
  
  if (!confirmed) return

  try {
    await deleteProduct(productId)
    // 从列表中移除
    products.value = products.value.filter(p => p.id !== productId)
    toast.success('删除成功')
  } catch (error) {
    console.error('删除失败:', error)
    toast.error(error.response?.data?.message || '删除失败')
  }
}

// 切换菜单显示
const toggleMenu = (productId) => {
  activeMenu.value = activeMenu.value === productId ? null : productId
}

// 点击其他地方关闭菜单
const closeMenu = () => {
  activeMenu.value = null
}

// 跳转到详情页
const goToDetail = (productId) => {
  router.push(`/product/${productId}`)
}

// 格式化日期
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    available: '在售',
    sold: '已售',
    reserved: '预定'
  }
  return statusMap[status] || status
}

// 监听tab变化
watch(activeTab, () => {
  fetchProducts()
  closeMenu()
})

onMounted(() => {
  fetchProducts()
  // 点击其他地方关闭菜单
  document.addEventListener('click', closeMenu)
})

// 清理事件监听
onUnmounted(() => {
  document.removeEventListener('click', closeMenu)
})
</script>

<style scoped>
.my-products {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 状态筛选 */
.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 7px 18px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease),
              color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease);
}

.tab-item:hover {
  color: var(--ink);
  border-color: var(--edge);
}

.tab-item.active {
  background: var(--primary);
  border-color: var(--edge);
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
}

.tab-count {
  color: var(--text-4);
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.tab-item.active .tab-count { color: var(--on-primary); }

/* 加载 / 空态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 16px;
  color: var(--text-3);
  font-size: 13px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--line-2);
  border-top-color: var(--primary);
  border-radius: 999px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 20px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 18px;
}

.empty-icon {
  position: relative;
  width: 84px;
  height: 84px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
}

/* CSS 纸箱 */
.icon-box-large::before {
  content: '';
  position: absolute;
  top: 28px;
  left: 24px;
  width: 32px;
  height: 26px;
  border: 2px solid var(--text-2);
  border-radius: 4px;
  background: var(--cream-2);
}

.icon-box-large::after {
  content: '';
  position: absolute;
  top: 28px;
  left: 24px;
  width: 32px;
  height: 9px;
  border-bottom: 2px solid var(--text-2);
  background: var(--primary-3);
}

.empty-state p {
  margin: 0;
  color: var(--ink);
  font-size: 15px;
  font-weight: 800;
}

.btn-publish {
  min-height: 42px;
  padding: 9px 24px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
}

.btn-publish:hover { transform: translateY(-1px); }

/* 商品格 */
.products-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.product-item {
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 16px;
  transition: transform 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease);
}

.product-item:hover {
  transform: translateY(-2px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.product-image {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border-bottom: 2px solid var(--edge);
  cursor: pointer;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image:hover img { opacity: 0.94; }

/* 已售出：图章 */
.sold-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  background: var(--card);
  border: 3px solid var(--danger);
  border-radius: 10px;
  color: var(--danger);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  transform: rotate(-10deg);
}

/* 更多：纸片圆钮 */
.btn-more {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 2px 3px 0 var(--shadow);
  cursor: pointer;
}

.btn-more:hover,
.btn-more.active { background: var(--cream-2); }

.btn-more .dot {
  width: 4px;
  height: 4px;
  background: var(--ink);
  border-radius: 999px;
}

.btn-more.active .dot { background: var(--primary); }

/* 操作菜单：小纸卡 */
.action-menu {
  position: absolute;
  top: 44px;
  right: 8px;
  z-index: 10;
  min-width: 132px;
  padding: 6px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 12px;
  box-shadow: 4px 5px 0 var(--shadow);
  animation: menuIn 0.2s var(--fish-ease) both;
}

@keyframes menuIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover { background: var(--cream-2); color: var(--ink); }

.menu-item .icon {
  width: 16px;
  font-size: 13px;
  text-align: center;
}

.menu-sold:hover { color: var(--success); }
.menu-delete:hover { color: var(--danger); }

.product-info {
  padding: 10px 12px 12px;
}

.product-title {
  margin: 0 0 6px;
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.product-price {
  margin: 0 0 6px;
  color: var(--primary-2);
  font-size: 18px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.product-meta {
  display: flex;
  gap: 10px;
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.load-more {
  display: flex;
  justify-content: center;
}

.btn-load-more {
  min-height: 42px;
  padding: 9px 28px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.btn-load-more:hover { background: var(--cream-2); color: var(--ink); }

@media (max-width: 1024px) {
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .product-title { font-size: 12px; }
  .product-price { font-size: 16px; }
  .btn-more { width: 30px; height: 30px; }
  .action-menu { right: 6px; }
}
</style>
