<template>
  <div class="user-profile">
    <form @submit.prevent="handleSubmit" class="profile-form">
      <!-- 头像上传 -->
      <div class="form-section avatar-section">
        <label class="section-label">头像</label>
        <div class="avatar-upload">
          <div class="avatar-preview">
            <img :src="avatarUrl" :alt="form.username" />
            <div class="avatar-overlay">
              <input 
                ref="avatarInput"
                type="file" 
                accept="image/*"
                capture="user"
                @change="handleAvatarChange"
                style="display: none;"
              />
              <button 
                type="button"
                class="btn-upload"
                @click="$refs.avatarInput.click()"
              >
                更换头像
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="form-section">
        <label class="section-label">基本信息</label>
        
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="form.username" 
            type="text" 
            placeholder="请输入用户名"
            required
          />
        </div>

        <div class="form-group">
          <label>邮箱 <span class="label-note">不可修改</span></label>
          <input 
            v-model="form.email" 
            type="email" 
            placeholder="请输入邮箱"
            required
            disabled
          />
        </div>

        <div class="form-group">
          <label>手机号</label>
          <input 
            v-model="form.phone" 
            type="tel" 
            placeholder="请输入手机号"
          />
        </div>
      </div>

      <!-- 密码修改 -->
      <div class="form-section">
        <label class="section-label">修改密码</label>
        
        <div class="form-group">
          <label>当前密码</label>
          <input 
            v-model="passwordForm.currentPassword" 
            type="password" 
            placeholder="请输入当前密码"
          />
        </div>

        <div class="form-group">
          <label>新密码</label>
          <input 
            v-model="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码"
          />
        </div>

        <div class="form-group">
          <label>确认新密码</label>
          <input 
            v-model="passwordForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码"
          />
        </div>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <button type="submit" class="btn-submit" :disabled="submitting">
          {{ submitting ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { uploadSingleImage } from '@/api/upload'
import { changePassword } from '@/api/user'
import { resolveAvatar } from '@/utils/avatar'
import toast from '@/utils/toast'

const userStore = useUserStore()
const avatarInput = ref(null)
const submitting = ref(false)

const form = ref({
  username: '',
  email: '',
  phone: '',
  avatar: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const avatarUrl = computed(() => resolveAvatar(form.value.avatar, form.value.username))

// 初始化表单
const initForm = () => {
  const userInfo = userStore.userInfo
  if (userInfo) {
    form.value = {
      username: userInfo.username || '',
      email: userInfo.email || '',
      phone: userInfo.phone || '',
      avatar: userInfo.avatar || ''
    }
  }
}

// 处理头像上传
const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }

  // 验证文件大小 (限制5MB)
  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片大小不能超过5MB')
    return
  }

  try {
    // 显示上传中提示
    console.log('正在上传头像...')
    
    // 上传文件
    const response = await uploadSingleImage(file, 'avatars')
    console.log('头像上传响应:', response)
    
    // 处理响应数据 - 兼容不同的响应格式
    let avatarUrl = null
    if (response.data && response.data.url) {
      // 格式: { success: true, data: { url: '/uploads/avatars/xxx.jpg' } }
      avatarUrl = response.data.url
    } else if (response.url) {
      // 格式: { url: '/uploads/avatars/xxx.jpg' }
      avatarUrl = response.url
    }
    
    console.log('解析后的头像URL:', avatarUrl)
    
    if (avatarUrl) {
      // 更新表单中的头像
      form.value.avatar = avatarUrl
      
      // 立即保存到后端和store
      const result = await userStore.updateProfile({
        username: form.value.username,
        phone: form.value.phone,
        avatar: avatarUrl
      })
      
      if (result.success) {
        toast.success('头像更换成功！')
      } else {
        toast.error('头像上传成功，但保存失败: ' + result.message)
      }
    } else {
      console.error('无效的响应数据:', response)
      toast.error('上传失败：未获取到头像URL')
    }
  } catch (error) {
    console.error('上传头像失败:', error)
    toast.error('上传失败: ' + (error.message || '请稍后重试'))
  } finally {
    // 清空 input，允许重复选择同一文件
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  try {
    submitting.value = true

    // 验证密码
    if (passwordForm.value.newPassword) {
      if (!passwordForm.value.currentPassword) {
        toast.warning('请输入当前密码')
        return
      }
      if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        toast.warning('两次输入的新密码不一致')
        return
      }
      if (passwordForm.value.newPassword.length < 6) {
        toast.warning('密码长度不能少于6位')
        return
      }
    }

    // 1) 若填写了新密码，先调用修改密码接口
    if (passwordForm.value.newPassword) {
      try {
        await changePassword({
          current_password: passwordForm.value.currentPassword,
          new_password: passwordForm.value.newPassword
        })
        toast.success('密码修改成功')
      } catch (error) {
        toast.error(error.response?.data?.error || '修改密码失败')
        return
      }
    }

    // 2) 更新基本资料
    const result = await userStore.updateProfile({
      username: form.value.username,
      phone: form.value.phone,
      avatar: form.value.avatar
    })

    if (!result.success) {
      toast.error(result.message || '保存失败')
      return
    }

    toast.success('保存成功!')
    
    // 清空密码表单
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    console.error('保存失败:', error)
    toast.error(error.response?.data?.error || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 监听 userStore.userInfo 的变化，自动更新表单
watch(() => userStore.userInfo, (newUserInfo) => {
  if (newUserInfo) {
    form.value = {
      username: newUserInfo.username || '',
      email: newUserInfo.email || '',
      phone: newUserInfo.phone || '',
      avatar: newUserInfo.avatar || ''
    }
  }
}, { deep: true, immediate: true })

onMounted(() => {
  initForm()
})
</script>

<style scoped>
.user-profile {
  width: 100%;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.form-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.section-label {
  color: var(--text-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.section-hint {
  margin: -4px 0 0;
  color: var(--text-4);
  font-size: 12px;
}

/* 头像：墨线圆 + 悬浮换头像 */
.avatar-section {
  flex-direction: row;
  align-items: center;
  gap: 20px;
}

.avatar-upload {
  flex-shrink: 0;
}

.avatar-preview {
  position: relative;
  width: 96px;
  height: 96px;
  overflow: hidden;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--panel);
  opacity: 0;
  transition: opacity 0.2s var(--fish-ease);
}

.avatar-preview:hover .avatar-overlay { opacity: 1; }

.btn-upload {
  min-height: 32px;
  padding: 4px 12px;
  background: transparent;
  border: 2px solid var(--on-panel);
  border-radius: 999px;
  color: var(--on-panel);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.btn-upload:hover {
  background: var(--primary);
  border-color: var(--primary);
}

/* 输入 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.label-note {
  margin-left: 5px;
  color: var(--text-4);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.form-group input {
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  color: var(--ink);
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.form-group input::placeholder { color: var(--text-4); }

.form-group input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.form-group input:disabled {
  background: var(--cream-2);
  color: var(--text-3);
  cursor: not-allowed;
}

.form-hint {
  color: var(--text-4);
  font-size: 11px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-submit {
  min-width: 160px;
  min-height: 46px;
  padding: 10px 28px;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.btn-submit:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .avatar-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .avatar-preview { width: 80px; height: 80px; }
  .form-actions { justify-content: stretch; }
  .btn-submit { width: 100%; }
}
</style>
