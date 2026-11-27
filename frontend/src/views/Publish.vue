<template>
  <div class="page">
    <main class="main-content">
      <header class="publish-hero">
        <div>
          <h1 class="hero-title">{{ isEdit ? '编辑这件好物' : '发布一件好物' }}</h1>
          <p class="hero-desc">拍几张清楚的照片，写清楚成色和瑕疵，同校同学更容易判断。</p>
        </div>
      </header>

      <form class="publish-grid" @submit.prevent="handleSubmit">
        <!-- 左：照片与拍摄提示 -->
        <aside class="photo-panel">
          <div class="panel-head">
            <h2>商品照片</h2>
            <p>第一张会作为封面展示，最多 9 张。</p>
          </div>
          <ImageUploader
            v-model="form.images"
            :max-count="9"
            :multiple="true"
            @change="handleImagesChange"
          />
          <ul class="photo-tips">
            <li>自然光下拍，背景干净，颜色更真实。</li>
            <li>拍正面、细节和瑕疵，大家会更放心。</li>
            <li>不要放联系方式或与商品无关的内容。</li>
          </ul>
        </aside>

        <!-- 右：商品信息 -->
        <section class="form-panel">
          <div class="panel-head form-panel-head">
            <h2>商品信息</h2>
          </div>

          <div class="form-section">
            <label class="form-label" for="product-title">商品标题</label>
            <input
              id="product-title"
              v-model="form.title"
              type="text"
              class="form-input"
              placeholder="例如：九成新《传播学概论》教材"
              maxlength="50"
              required
            />
            <div class="char-count">{{ form.title.length }}/50</div>
          </div>

          <div class="form-section">
            <div class="form-label-row">
              <label class="form-label" for="product-desc">商品描述</label>
              <button
                v-if="aiEnabled"
                type="button"
                class="ai-desc-btn"
                :disabled="generatingDesc"
                @click="handleGenerateDescription"
              >
                <span v-if="generatingDesc" class="spinner"></span>
                <span v-else>AI 帮我写</span>
              </button>
            </div>
            <textarea
              id="product-desc"
              v-model="form.description"
              class="form-textarea"
              placeholder="写清使用情况、成色和瑕疵。"
              rows="5"
              required
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-section">
              <label class="form-label" for="product-price">价格</label>
              <div class="input-with-unit">
                <input
                  id="product-price"
                  v-model.number="form.price"
                  type="number"
                  inputmode="decimal"
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
              <label class="form-label" for="product-condition">成色</label>
              <select id="product-condition" v-model="form.condition" class="form-select" required>
                <option value="">请选择</option>
                <option value="new">全新</option>
                <option value="like-new">99 新</option>
                <option value="good">较好</option>
                <option value="fair">一般</option>
                <option value="poor">较差</option>
              </select>
            </div>
          </div>

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

          <div v-if="isEdit" class="form-section">
            <label class="form-label" for="product-status">商品状态</label>
            <select id="product-status" v-model="form.status" class="form-select">
              <option value="available">在售</option>
              <option value="sold">已售</option>
              <option value="reserved">预定</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="handleCancel">取消</button>
            <button type="submit" class="btn-submit" :disabled="submitting">
              {{ submitting ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存修改' : '立即发布') }}
            </button>
          </div>
        </section>
      </form>
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
/* 发布工作台：照片在左，信息在右，像一张轻松的商品卡片 */
.page {
  background: var(--bg);
}

.main-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px 32px 80px;
}

.publish-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
  padding: 4px 2px;
}

.hero-title {
  margin: 0 0 8px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.015em;
}

.hero-desc {
  max-width: 520px;
  margin: 0;
  color: var(--text-3);
  font-size: 14px;
  line-height: 1.7;
}

.publish-grid {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 0;
  align-items: start;
  background: linear-gradient(
    to right,
    var(--cream-1) 0 calc(360px - 1px),
    var(--line) calc(360px - 1px) 360px,
    var(--card) 360px 100%
  );
  border: 1px solid var(--line-strong);
  border-radius: 5px;
}

.photo-panel {
  position: sticky;
  top: calc(98px + env(safe-area-inset-top, 0px));
  min-width: 0;
  padding: 26px;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.form-panel {
  min-width: 0;
  padding: 28px 30px;
  background: var(--card);
  border: 0;
  border-radius: 0 5px 5px 0;
  box-shadow: none;
}

.panel-head {
  margin-bottom: 18px;
}

.form-panel-head {
  padding-bottom: 18px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 22px;
}

.form-panel-head h2 {
  margin-bottom: 0;
}

.panel-head h2 {
  margin: 0 0 5px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0;
}

.panel-head p {
  margin: 0;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.photo-panel :deep(.upload-list:has(> .upload-trigger:only-child) .upload-trigger) {
  grid-column: 1 / -1;
  aspect-ratio: auto;
  min-height: 250px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
}

.photo-panel :deep(.upload-list:has(> .upload-trigger:only-child) .upload-content) {
  gap: 8px;
}

.photo-panel :deep(.upload-list:has(> .upload-trigger:only-child) .upload-text) {
  font-size: 13px;
}

.photo-panel :deep(.upload-list:has(> .upload-trigger:only-child) .upload-text svg) {
  width: 34px;
  height: 34px;
  color: var(--primary);
}

.photo-tips {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 16px 0 0;
  padding: 14px 0 0;
  border-top: 1px solid var(--line);
  list-style: none;
}

.photo-tips li {
  position: relative;
  padding-left: 14px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.6;
}

.photo-tips li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.65em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.3;
}

.form-section {
  position: relative;
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 13px 15px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--ink);
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  transition: border-color 0.22s var(--fish-ease), background-color 0.22s var(--fish-ease), box-shadow 0.22s var(--fish-ease);
}

.form-input,
.form-select { min-height: 50px; }

.form-textarea {
  min-height: 132px;
  resize: vertical;
}

.form-input::placeholder,
.form-textarea::placeholder { color: var(--text-4); }

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  background: var(--card);
  border-color: var(--primary-3);
  box-shadow: 0 0 0 3px rgba(197, 106, 60, 0.10);
}

.input-with-unit { position: relative; }

.input-with-unit .unit {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
  pointer-events: none;
}

.input-with-unit .form-input { padding-right: 38px; }

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%239d96a8' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 15px center;
  padding-right: 36px;
}

.char-count {
  position: absolute;
  right: 2px;
  bottom: -17px;
  color: var(--text-4);
  font-family: var(--font-mono);
  font-size: 11px;
}

.ai-desc-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding: 6px 10px;
  background: var(--primary-3);
  border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--line));
  border-radius: 3px;
  color: var(--primary-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.ai-desc-btn:disabled { opacity: 0.6; cursor: wait; }

.spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--primary-3);
  border-top-color: var(--primary-2);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 7px 12px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 4px;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.22s var(--fish-ease), color 0.22s var(--fish-ease), border-color 0.22s var(--fish-ease);
}

.category-item:hover { background: var(--cream-2); color: var(--ink); }

.category-item.active {
  background: var(--primary-3);
  border-color: var(--primary-2);
  color: var(--primary-2);
}

.category-icon {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
}

.category-icon :deep(svg) { width: 17px; height: 17px; }

.category-name {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid var(--line);
}

.btn-cancel,
.btn-submit {
  min-height: 46px;
  padding: 10px 24px;
  border-radius: 3px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.22s var(--fish-ease);
}

.btn-cancel {
  background: var(--card);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
}

.btn-cancel:hover { background: var(--cream-1); }

.btn-submit {
  min-width: 140px;
  background: var(--primary);
  border: 1px solid var(--primary);
  box-shadow: none;
  color: var(--on-primary);
}

.btn-submit:hover:not(:disabled) { background: var(--primary-2); }
.btn-submit:active:not(:disabled) { transform: none; }
.btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

@media (max-width: 1024px) {
  .main-content { padding: 24px 24px 64px; }
  .publish-grid {
    grid-template-columns: 330px minmax(0, 1fr);
    gap: 0;
    background: linear-gradient(
      to right,
      var(--cream-1) 0 calc(330px - 1px),
      var(--line) calc(330px - 1px) 330px,
      var(--card) 330px 100%
    );
  }
  .photo-panel { padding: 20px; }
  .form-panel { padding: 22px; border-radius: 0 5px 5px 0; }
  .hero-title { font-size: 32px; }
}

@media (max-width: 767px) {
  .main-content { padding: 16px 14px 108px; }
  .publish-hero { align-items: flex-start; margin-bottom: 16px; }
  .hero-title { font-size: 28px; }
  .hero-desc { font-size: 13px; }
  .publish-grid { display: flex; flex-direction: column; gap: 0; background: var(--card); }
  .photo-panel,
  .form-panel { position: static; width: 100%; padding: 18px; }
  .photo-panel {
    background: var(--cream-1);
    border-bottom: 1px solid var(--line);
    border-radius: 5px 5px 0 0;
  }
  .form-panel { border-radius: 0 0 5px 5px; }
  .form-panel-head { margin-bottom: 18px; padding-bottom: 14px; }
  .panel-head h2 { font-size: 19px; }
  .form-actions { position: sticky; bottom: calc(var(--mobile-nav-space) + 4px); padding: 14px 0 2px; background: linear-gradient(to top, var(--card) 82%, transparent); }
  .btn-cancel { flex: 1; }
  .btn-submit { flex: 1.4; min-width: 0; }
}

@media (max-width: 560px) {
  .main-content { padding: 12px 14px 108px; }
  .hero-title { font-size: 26px; }
  .photo-panel,
  .form-panel { padding: 16px; }
  .photo-panel :deep(.upload-list:has(> .upload-trigger:only-child) .upload-trigger) { min-height: 180px; border-radius: 5px; }
  .form-row { grid-template-columns: 1fr 1fr; gap: 10px; }
  .btn-cancel,
  .btn-submit { min-height: 44px; padding: 9px 16px; }
}

@media (max-width: 380px) {
  .form-row { grid-template-columns: 1fr; }
}
</style>
