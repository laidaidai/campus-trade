<template>
  <div class="page">
    <main class="main-content">
      <div class="publish-form">
        <header class="form-head">
          <span class="eyebrow">{{ isEdit ? 'EDIT' : 'PUBLISH' }}</span>
          <h1 class="form-title">{{ isEdit ? '编辑商品' : '发布商品' }}</h1>
        </header>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-layout">
            <!-- 左侧：图片上传 -->
            <div class="form-left">
              <div class="form-section">
                <label class="form-label">商品图片</label>
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
                    <span v-else>AI 写文案</span>
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
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 32px 72px;
}

/* 表单卡：纸卡墨线，唯一的硬影 */
.publish-form {
  padding: 30px;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 24px;
  box-shadow: 5px 6px 0 var(--shadow);
}

.form-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--line-2);
}

.form-title {
  margin: 0;
  color: var(--ink);
  font-size: 32px;
  font-weight: 900;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.form-subtitle {
  display: none;
}

/* 两栏：图 0.9 / 字段 1.1 */
.form-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 32px;
}

.form-left,
.form-right {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.form-right {
  gap: 16px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.form-label,
.form-label-row {
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.form-label-row .ai-desc-btn {
  margin: 0;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-4);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 3px 4px 0 var(--shadow);
}

.form-textarea {
  min-height: 132px;
  line-height: 1.7;
  resize: vertical;
}

.form-select {
  appearance: none;
  padding-right: 38px;
  background-image: none;
  cursor: pointer;
  position: relative;
}

.char-count {
  align-self: flex-end;
  margin-top: -2px;
  color: var(--text-4);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-with-unit {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-unit .form-input {
  padding-right: 40px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.unit {
  position: absolute;
  right: 14px;
  color: var(--text-3);
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
}

/* 分类：纸片方块，选中实心描边 */
.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 46px;
  padding: 8px;
  background: var(--cream-1);
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease),
              border-color 0.2s var(--fish-ease),
              color 0.2s var(--fish-ease);
}

.category-item:hover {
  background: var(--cream-2);
  border-color: var(--edge);
}

.category-item.active {
  background: var(--primary-3);
  border-color: var(--primary-2);
  color: var(--ink);
  box-shadow: 2px 3px 0 var(--shadow);
}

.category-icon {
  display: inline-flex;
  color: currentColor;
}

.category-icon :deep(svg) {
  width: 18px;
  height: 18px;
}

.category-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* AI 按钮：次级胶囊 */
.ai-desc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 32px;
  padding: 5px 12px;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease);
}

.ai-desc-btn:hover {
  background: var(--cream-3);
}

.ai-desc-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--line-strong);
  border-top-color: var(--primary-2);
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 底部操作：取消次级 + 一个主按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 26px;
  padding-top: 18px;
  border-top: 2px solid var(--line-2);
}

.btn-cancel {
  min-height: 46px;
  padding: 10px 24px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-2);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease);
}

.btn-cancel:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-submit {
  min-width: 168px;
  min-height: 46px;
  padding: 10px 28px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-submit:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

.btn-submit:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

/* 平板 */
@media (max-width: 1023px) {
  .main-content { padding: 20px 24px 64px; }
  .publish-form { padding: 24px; }
  .form-layout { gap: 24px; }
  .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* 手机：单列，操作按钮等宽 */
@media (max-width: 767px) {
  .main-content { padding: 12px 12px 40px; }
  .publish-form { padding: 16px; border-radius: 20px; }
  .form-title { font-size: 24px; }
  .form-layout { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .form-row { grid-template-columns: 1fr; }
  .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .form-actions { flex-direction: column-reverse; }
  .btn-cancel,
  .btn-submit { width: 100%; }
}
</style>
