<template>
  <div class="page">
    <main class="main-content">
      <div class="publish-form">
        <h1 class="form-title">{{ isEdit ? '编辑商品' : '发布商品' }}</h1>
        <p class="form-subtitle">{{ isEdit ? '修改商品信息并保存' : '分享你的闲置物品，让它找到新主人' }}</p>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-layout">
            <!-- 左侧：图片上传 -->
            <div class="form-left">
              <div class="form-section">
                <label class="form-label">商品图片</label>
                <p class="form-hint">最多上传9张，第一张为封面</p>
                <ImageUploader 
                  v-model="form.images" 
                  :max-count="9"
                  :multiple="true"
                  @change="handleImagesChange"
                />
              </div>
            </div>

            <!-- 右侧：表单信息 -->
            <div class="form-right">
              <!-- 商品标题 -->
              <div class="form-section">
                <label class="form-label">商品标题</label>
                <input
                  v-model="form.title"
                  type="text"
                  class="form-input"
                  placeholder="请输入商品标题（最多50字）"
                  maxlength="50"
                  required
                />
                <div class="char-count">{{ form.title.length }}/50</div>
              </div>

              <!-- 商品描述 -->
              <div class="form-section">
                <div class="form-label-row">
                  <label class="form-label">商品描述</label>
                  <button
                    v-if="aiEnabled"
                    type="button"
                    class="ai-desc-btn"
                    :disabled="generatingDesc"
                    @click="handleGenerateDescription"
                  >
                    <span v-if="generatingDesc" class="spinner"></span>
                    <span v-else>✨ AI 写文案</span>
                  </button>
                </div>
                <textarea
                  v-model="form.description"
                  class="form-textarea"
                  placeholder="请详细描述商品的外观、功能、使用情况等"
                  rows="5"
                  required
                ></textarea>
              </div>

              <!-- 价格和成色 -->
              <div class="form-row">
                <div class="form-section">
                  <label class="form-label">价格</label>
                  <div class="input-with-unit">
                    <input
                      v-model.number="form.price"
                      type="number"
                      class="form-input"
                      placeholder="0.00"
                      min="0"
                      max="99999999"
                      step="0.01"
                      required
                    />
                    <span class="unit">元</span>
                  </div>
                  <p class="form-hint" style="color: var(--text-tertiary); font-size: 12px; margin-top: 4px;">
                    最高价格: 99,999,999 元
                  </p>
                </div>

                <div class="form-section">
                  <label class="form-label">成色</label>
                  <select v-model="form.condition" class="form-select" required>
                    <option value="">请选择</option>
                    <option value="new">全新</option>
                    <option value="like-new">99新</option>
                    <option value="good">较好</option>
                    <option value="fair">一般</option>
                    <option value="poor">较差</option>
                  </select>
                </div>
              </div>

              <!-- 商品分类 -->
              <div class="form-section">
                <label class="form-label">商品分类</label>
                <div class="category-grid">
                  <label
                    v-for="cat in categories"
                    :key="cat.id"
                    :class="['category-item', { active: form.category === cat.dbName }]"
                  >
                    <input
                      type="radio"
                      :value="cat.dbName"
                      v-model="form.category"
                      style="display: none"
                      required
                    />
                    <span class="category-icon"><Icon :name="cat.id" /></span>
                    <span class="category-name">{{ cat.name }}</span>
                  </label>
                </div>
              </div>

              <!-- 编辑模式：状态选择 -->
              <div v-if="isEdit" class="form-section">
                <label class="form-label">商品状态</label>
                <select v-model="form.status" class="form-select">
                  <option value="available">在售</option>
                  <option value="sold">已售</option>
                  <option value="reserved">预定</option>
                </select>
              </div>
            </div>
          </div>

          <!-- 提交按钮 -->
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="handleCancel">
              取消
            </button>
            <button type="submit" class="btn-submit" :disabled="submitting">
              {{ submitting ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存修改' : '立即发布') }}
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ImageUploader from '@/components/ImageUploader.vue'
import Icon from '@/components/Icon.vue'
import { getCategories } from '@/api/category'
import { createProduct, getProductById, updateProduct } from '@/api/product'
import { generateDescription, getAiStatus } from '@/api/ai'
import toast from '@/utils/toast'
import { showConfirm } from '@/utils/dialog'
import { getImageUrl } from '@/config'

const router = useRouter()
const route = useRoute()

// 表单数据
const form = ref({
  title: '',
  description: '',
  price: null,
  condition: '',
  category: '',
  images: [],
  status: 'available'
})

const categories = ref([])
const submitting = ref(false)
const isEdit = ref(false)
const editingId = ref(null)
// AI 文案生成
const aiEnabled = ref(false)
const generatingDesc = ref(false)

// 分类ID映射(用于图标显示)
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

// 获取分类列表
const fetchCategories = async () => {
  try {
    const response = await getCategories()
    if (response.success) {
      categories.value = response.data.map(cat => ({
        id: categoryMap[cat.name] || 'other',
        name: cat.name,
        dbName: cat.name
      }))
    }
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

// 图片变化回调
const handleImagesChange = (urls) => {
  console.log('图片已更新:', urls)
  // 确保图片URL正确更新
  form.value.images = urls
}

// 提交表单
const handleSubmit = async () => {
  // 验证图片
  if (!form.value.images || form.value.images.length === 0) {
    toast.warning('请至少上传一张商品图片')
    return
  }

  // 验证价格范围
  if (form.value.price < 0) {
    toast.warning('价格不能为负数')
    return
  }
  if (form.value.price > 99999999) {
    toast.warning('价格不能超过 99,999,999 元')
    return
  }

  submitting.value = true

  try {
    if (isEdit.value && editingId.value) {
      const payload = {
        title: form.value.title,
        description: form.value.description,
        price: form.value.price,
        condition: form.value.condition,
        category: form.value.category,
        images: form.value.images,
        status: form.value.status
      }
      const res = await updateProduct(editingId.value, payload)
      if (res.success !== false) {
        toast.success('保存成功！')
        router.push('/profile')
      } else {
        throw new Error(res.message || '保存失败')
      }
    } else {
      const response = await createProduct({
        title: form.value.title,
        description: form.value.description,
        price: form.value.price,
        condition: form.value.condition,
        category: form.value.category,
        images: form.value.images
      })
      if (response.success) {
        toast.success('发布成功！')
        router.push('/')
      } else {
        throw new Error(response.message || '发布失败')
      }
    }
  } catch (error) {
    console.error('提交失败:', error)
    toast.error((error.response?.data?.message) || error.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

// 取消发布
const handleCancel = async () => {
  const confirmed = await showConfirm({
    title: '确认取消',
    message: '确定要取消发布吗？未保存的内容将丢失',
    type: 'warning',
    confirmText: '确定取消',
    cancelText: '继续编辑'
  })
  if (confirmed) {
    router.push('/')
  }
}

// 加载编辑数据
const loadEditingProduct = async (id) => {
  try {
    const res = await getProductById(id)
    const data = res.data || res
    if (!data) return
    form.value.title = data.title || ''
    form.value.description = data.description || ''
    form.value.price = Number(data.price) || 0
    form.value.condition = data.condition || ''
    form.value.category = data.category || ''
    // 兼容字符串/数组
    const imgs = Array.isArray(data.images)
      ? data.images
      : (typeof data.images === 'string' ? JSON.parse(data.images) : [])
    form.value.images = (imgs || []).map(url => {
      // 确保URL是字符串格式
      const imageUrl = typeof url === 'string' ? url : url.url || url
      return getImageUrl(imageUrl)
    })
    form.value.status = data.status || 'available'
  } catch (e) {
    console.error('加载商品失败:', e)
    toast.error('加载商品信息失败')
  }
}

onMounted(() => {
  fetchCategories()
  // 探测 AI 是否启用，决定是否显示「AI 写文案」按钮
  getAiStatus()
    .then((res) => { aiEnabled.value = !!res.data?.enabled })
    .catch(() => { aiEnabled.value = false })
  const id = route.query.id
  if (id) {
    isEdit.value = true
    editingId.value = parseInt(id)
    loadEditingProduct(editingId.value)
  }
})

// AI 生成商品描述
const handleGenerateDescription = async () => {
  if (!form.value.title.trim()) {
    toast.warning('请先填写商品标题')
    return
  }
  if (generatingDesc.value) return

  generatingDesc.value = true
  try {
    const res = await generateDescription({
      title: form.value.title,
      category: form.value.category,
      condition: form.value.condition,
    })
    if (res.success && res.data?.description) {
      // 已有内容则追加，避免覆盖用户手写的部分
      const existing = form.value.description.trim()
      form.value.description = existing
        ? existing + '\n\n' + res.data.description
        : res.data.description
      toast.success('AI 文案已生成')
    } else {
      toast.error(res.message || '生成失败，请重试')
    }
  } catch (e) {
    toast.error(e.response?.data?.message || e.message || 'AI 生成失败，请稍后重试')
  } finally {
    generatingDesc.value = false
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg-gray);
}

.main-content {
  width: 100%;
  margin: 0 20px; /* 左右边距都是20px，和消息页一致 */
  padding: 32px 20px;
}

.publish-form {
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.form-subtitle {
  color: var(--text-tertiary);
  font-size: 15px;
  margin: 0 0 32px;
}

/* 横向布局 */
.form-layout {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 48px;
  margin-bottom: 32px;
  align-items: start;
}

.form-left {
  min-width: 0;
}

.form-right {
  flex: 1;
  min-width: 0;
}

.form-section {
  margin-bottom: 28px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-label {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.form-label-row .form-label {
  margin-bottom: 0;
}

.ai-desc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-color);
  background: #fff5f6;
  border: 1px solid rgba(255, 36, 66, 0.25);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ai-desc-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: #fff;
}
.ai-desc-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: ai-spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes ai-spin {
  to { transform: rotate(360deg); }
}

.form-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: -8px 0 12px 0;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-md);
  font-size: 15px;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
  background: rgba(0, 0, 0, 0.02);
  color: var(--text-primary);
}

.form-input:hover,
.form-textarea:hover,
.form-select:hover {
  border-color: rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: rgba(255, 36, 66, 0.5);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 4px rgba(255, 36, 66, 0.08);
  transform: translateY(-1px);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #bbb;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.input-with-unit {
  position: relative;
}

.input-with-unit .unit {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 15px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.4, 0.0, 0.2, 1);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  position: relative;
}

.category-item:hover {
  border-color: rgba(255, 36, 66, 0.3);
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.category-item.active {
  border-color: rgba(255, 36, 66, 0.5);
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 
    0 8px 24px rgba(255, 36, 66, 0.15),
    0 0 0 2px rgba(255, 36, 66, 0.1);
  transform: translateY(-3px);
}

.category-item:active {
  transform: scale(0.96) translateY(0);
}

.category-icon {
  font-size: 32px;
  position: relative;
  z-index: 1;
  transition: transform var(--transition-base) var(--ease-in-out) ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.category-icon :deep(svg) {
  width: 32px;
  height: 32px;
  stroke-width: 1.5;
}

.category-item:hover .category-icon {
  transform: scale(1.1);
  color: var(--primary-color);
}

.category-item.active .category-icon {
  transform: scale(1.05);
  color: var(--primary-color);
}

.category-name {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  position: relative;
  z-index: 1;
  transition: all var(--transition-base) var(--ease-in-out);
}

.category-item:hover .category-name {
  color: var(--primary-color);
}

.category-item.active .category-name {
  color: var(--primary-color);
  font-weight: 700;
}

.form-actions {
  position: fixed;
  top: 80px;
  right: 60px;
  display: flex;
  gap: 12px;
  z-index: 100;
}

.btn-cancel,
.btn-submit {
  padding: 10px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-in-out) cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 1);
  color: rgba(0, 0, 0, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.btn-cancel:active {
  transform: scale(0.96);
}

.btn-submit {
  background: linear-gradient(135deg, #ff2442 0%, #ff4757 100%);
  color: #fff;
  box-shadow: 0 2px 12px rgba(255, 36, 66, 0.35);
  border: none;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 36, 66, 0.45);
  background: linear-gradient(135deg, #ff1a38 0%, #ff3d4d 100%);
}

.btn-submit:active:not(:disabled) {
  transform: scale(0.96);
  box-shadow: 0 2px 8px rgba(255, 36, 66, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 2px 8px rgba(255, 36, 66, 0.2);
}

/* iPad横屏：桌面布局 */
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .main-content {
    max-width: 100%;
    margin: 0 20px; /* 统一为20px，和其他页面一致 */
    padding: 24px 20px;
  }

  .publish-form {
    padding: 32px;
  }

  .form-layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .form-actions {
    top: 70px;
    right: 32px;
  }
}

/* iPad竖屏：统一边距 */
@media (max-width: 1024px) and (orientation: portrait) {
  .main-content {
    margin: 0; /* 移除左右边距 */
    padding: 20px 16px;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .main-content {
    margin: 0; /* 移除左右边距 */
    padding: 20px 16px;
  }

  .publish-form {
    padding: 24px 20px;
    border-radius: 16px;
  }

  .form-title {
    font-size: 24px;
  }

  .form-subtitle {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .form-layout {
    gap: 24px;
  }

  .form-section {
    margin-bottom: 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  /* 优化成色选择在移动端的显示 */
  .form-select {
    min-height: 48px; /* 增大触摸区域 */
    font-size: 16px; /* 防止iOS缩放 */
    -webkit-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 40px;
  }

  /* 移动端单列布局 */
  .form-layout {
    grid-template-columns: 1fr;
  }

  /* 分类区域底部留出空间，避免被按钮遮挡 */
  .form-right {
    padding-bottom: 100px;
  }

  .category-grid {
    grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
    gap: 10px;
  }

  .category-item {
    padding: 14px 10px;
  }

  .category-icon {
    font-size: 28px;
  }

  .category-name {
    font-size: 12px;
  }

  .form-actions {
    position: fixed;
    bottom: 80px; /* 在底部导航栏上方 */
    right: 16px;
    left: 16px;
    width: auto;
    top: auto;
    flex-direction: row;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 12px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000; /* 提高层级确保在内容上方 */
  }

  .btn-cancel,
  .btn-submit {
    flex: 1;
    padding: 12px 20px;
    font-size: 15px;
    border-radius: 12px;
    min-height: 44px; /* 增大触摸区域 */
  }
}

/* 小屏手机优化 */
@media (max-width: 480px) {
  .form-actions {
    padding: 10px;
  }

  .btn-cancel,
  .btn-submit {
    font-size: 14px;
    padding: 10px 16px;
  }
}
</style>
