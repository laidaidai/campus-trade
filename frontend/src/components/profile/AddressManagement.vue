<template>
  <div class="address-management">
    <!-- 添加地址按钮 -->
    <button class="btn btn-primary btn-add-address" @click="showAddDialog">
      <span class="icon">+</span>
      添加新地址
    </button>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="addresses.length === 0" class="empty-state">
      <div class="empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 0 1 16 0z"></path>
          <circle cx="12" cy="10" r="2.6"></circle>
        </svg>
      </div>
      <p>还没有收货地址</p>
      <small>新增后，下单时可以直接选用。</small>
    </div>

    <!-- 地址列表 -->
    <div v-else class="address-list">
      <div 
        v-for="address in addresses" 
        :key="address.id"
        :class="['address-card', { default: address.is_default }]"
      >
        <div class="address-header">
          <div class="address-name">
            {{ address.name }}
            <span class="address-phone">{{ address.phone }}</span>
          </div>
          <span v-if="address.is_default" class="default-badge">默认</span>
        </div>
        <div class="address-detail">
          {{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}
        </div>
        <div class="address-actions">
          <button 
            v-if="!address.is_default"
            class="btn-action"
            @click="setAsDefault(address.id)"
          >
            设为默认
          </button>
          <button 
            class="btn-action"
            @click="editAddress(address)"
          >
            编辑
          </button>
          <button 
            class="btn-action btn-delete"
            @click="confirmDelete(address.id)"
          >
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑地址对话框 -->
    <div v-if="showDialog" class="dialog-overlay" @click="closeDialog">
      <div class="dialog-content" @click.stop>
        <h3 class="dialog-title">
          {{ editingAddress ? '编辑地址' : '添加地址' }}
        </h3>
        <form @submit.prevent="submitAddress" class="address-form">
          <div class="form-row">
            <div class="form-group">
              <label>收货人 *</label>
              <input 
                v-model="form.name" 
                type="text" 
                placeholder="请输入收货人姓名"
                required
              />
            </div>
            <div class="form-group">
              <label>联系电话 *</label>
              <input 
                v-model="form.phone" 
                type="tel" 
                placeholder="请输入手机号"
                required
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>省份 *</label>
              <input 
                v-model="form.province" 
                type="text" 
                placeholder="如：北京市"
                required
              />
            </div>
            <div class="form-group">
              <label>城市 *</label>
              <input 
                v-model="form.city" 
                type="text" 
                placeholder="如：北京市"
                required
              />
            </div>
            <div class="form-group">
              <label>区县 *</label>
              <input 
                v-model="form.district" 
                type="text" 
                placeholder="如：海淀区"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>详细地址 *</label>
            <textarea 
              v-model="form.detail" 
              placeholder="请输入详细地址，如街道、门牌号等"
              rows="3"
              required
            ></textarea>
          </div>

          <div class="form-checkbox">
            <label>
              <input v-model="form.is_default" type="checkbox" />
              设为默认地址
            </label>
          </div>

          <div class="dialog-actions">
            <button type="button" class="btn-cancel" @click="closeDialog">
              取消
            </button>
            <button type="submit" class="btn-submit">
              {{ editingAddress ? '保存' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { 
  getAddresses, 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '@/api/address'
import toast from '@/utils/toast'
import { showDeleteConfirm } from '@/utils/dialog'

const loading = ref(false)
const addresses = ref([])
const showDialog = ref(false)
const editingAddress = ref(null)

const form = ref({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false
})

// 获取地址列表
const fetchAddresses = async () => {
  try {
    loading.value = true
    const response = await getAddresses()
    addresses.value = response.data || []
  } catch (error) {
    console.error('获取地址列表失败:', error)
    addresses.value = []
  } finally {
    loading.value = false
  }
}

// 显示添加对话框
const showAddDialog = () => {
  editingAddress.value = null
  resetForm()
  showDialog.value = true
}

// 编辑地址
const editAddress = (address) => {
  editingAddress.value = address
  form.value = {
    name: address.name,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
    is_default: address.is_default
  }
  showDialog.value = true
}

// 提交地址
const submitAddress = async () => {
  try {
    if (editingAddress.value) {
      await updateAddress(editingAddress.value.id, form.value)
      toast.success('地址更新成功')
    } else {
      await createAddress(form.value)
      toast.success('地址添加成功')
    }
    closeDialog()
    await fetchAddresses()
  } catch (error) {
    console.error('操作失败:', error)
    toast.error(error.response?.data?.error || '操作失败')
  }
}

// 设为默认地址
const setAsDefault = async (addressId) => {
  try {
    await setDefaultAddress(addressId)
    await fetchAddresses()
    toast.success('已设为默认地址')
  } catch (error) {
    console.error('设置默认地址失败:', error)
    toast.error('操作失败')
  }
}

// 删除地址
const confirmDelete = async (addressId) => {
  const confirmed = await showDeleteConfirm('确定要删除这个地址吗？')
  
  if (!confirmed) return

  try {
    await deleteAddress(addressId)
    await fetchAddresses()
    toast.success('地址删除成功')
  } catch (error) {
    console.error('删除失败:', error)
    toast.error('删除失败')
  }
}

// 关闭对话框
const closeDialog = () => {
  showDialog.value = false
  editingAddress.value = null
  resetForm()
}

// 重置表单
const resetForm = () => {
  form.value = {
    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    is_default: false
  }
}

onMounted(() => {
  fetchAddresses()
})
</script>

<style scoped>
.address-management {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 新增：主操作 */
.btn-add-address {
  align-self: flex-start;
}

.btn-add-address .icon {
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
}

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

/* 空态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 58px 16px 50px;
  background: transparent;
  border: 0;
  text-align: center;
}

.empty-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  margin-bottom: 2px;
  color: var(--primary-2);
}

.empty-icon svg { width: 30px; height: 30px; }

.empty-state p {
  margin: 0;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
}

.empty-state small {
  color: var(--text-3);
  font-size: 12px;
}

/* 地址卡 */
.address-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.address-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  transition: transform 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.address-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-soft);
}

.address-card.default {
  background: var(--cream-1);
  border-color: var(--line-strong);
}

.address-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.address-name {
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
}

.address-phone {
  margin-left: 8px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.default-badge {
  padding: 2px 6px;
  background: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 2px;
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 600;
}

.address-detail {
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.7;
  word-break: break-word;
}

.address-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 11px;
  border-top: 1px solid var(--line);
}

.btn-action {
  min-height: 36px;
  padding: 6px 12px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-action:hover {
  border-color: var(--edge);
  color: var(--ink);
}

.btn-delete:hover {
  background: var(--danger);
  border-color: var(--edge);
  color: var(--on-primary);
}

/* 编辑弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--panel-deep) 62%, transparent);
}

.dialog-content {
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  padding: 22px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: var(--shadow-soft);
  animation: dialogIn 0.26s var(--fish-ease) both;
}

@keyframes dialogIn {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.dialog-title {
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 19px;
  font-weight: 700;
}

.address-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  gap: 10px;
}

.form-row .form-group { flex: 1; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  color: var(--ink);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.form-group input,
.form-group textarea {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.form-group input::placeholder,
.form-group textarea::placeholder { color: var(--text-4); }

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.form-group textarea {
  min-height: 76px;
  resize: vertical;
  line-height: 1.6;
}

.form-checkbox label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--primary);
  cursor: pointer;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.btn-cancel,
.btn-submit {
  flex: 1;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 3px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: var(--card);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
}

.btn-cancel:hover {
  background: var(--cream-2);
  color: var(--ink);
}

.btn-submit {
  background: var(--primary);
  border: 1px solid var(--primary);
  box-shadow: none;
  color: var(--on-primary);
}

.btn-submit:hover {
  background: var(--primary-2);
  transform: none;
}

@media (max-width: 767px) {
  .address-list { grid-template-columns: 1fr; gap: 10px; }
  .btn-add-address { width: 100%; justify-content: center; }
  .dialog-overlay { padding: 0; align-items: flex-end; }
  .dialog-content {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 6px 6px 0 0;
    border-bottom: none;
    box-shadow: 0 -10px 28px rgba(42,29,20,.10);
  }
  .form-row { flex-direction: column; }
}
</style>
