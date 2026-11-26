<template>
  <div class="reset-password-page">
    <div class="container">
      <div class="reset-box">
        <div class="reset-header">
          <h2>找回密码</h2>
        </div>

        <!-- 错误提示 -->
        <div v-if="errorMessage" class="message error-message">
          {{ errorMessage }}
        </div>

        <!-- 成功提示 -->
        <div v-if="successMessage" class="message success-message">
          {{ successMessage }}
        </div>

        <form @submit.prevent="handleSubmit" class="reset-form">
          <!-- 邮箱输入 -->
          <div class="input-group">
            <label>邮箱地址</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="请输入注册时的邮箱"
              :disabled="loading"
              required
            />
          </div>

          <!-- 验证码输入 -->
          <div class="input-group">
            <label>邮箱验证码</label>
            <EmailCodeInput
              v-model="form.code"
              :email="form.email"
              type="reset-password"
              placeholder="请输入6位验证码"
              :disabled="loading"
              @send="handleSendCode"
            />
          </div>

          <!-- 新密码 -->
          <div class="input-group">
            <label>新密码</label>
            <input
              v-model="form.newPassword"
              type="password"
              placeholder="请输入新密码 (至少6位)"
              :disabled="loading"
              required
            />
          </div>

          <!-- 确认密码 -->
          <div class="input-group">
            <label>确认密码</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              :disabled="loading"
              required
            />
          </div>

          <!-- 提交按钮 -->
          <button type="submit" class="submit-btn" :disabled="loading">
            {{ loading ? '重置中...' : '重置密码' }}
          </button>

          <!-- 返回登录 -->
          <div class="back-to-login">
            <router-link to="/auth">← 返回登录</router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import EmailCodeInput from '@/components/EmailCodeInput.vue'
import * as authApi from '@/api/auth'

const router = useRouter()

const form = ref({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// 直接发送验证码（无需人机验证）
const handleSendCode = async (email, type) => {
  errorMessage.value = ''
  
  if (!email) {
    errorMessage.value = '请先输入邮箱地址'
    throw new Error('请先输入邮箱地址')
  }

  try {
    await authApi.sendVerificationCode({
      email: email,
      type: type
    })
    successMessage.value = '验证码已发送到您的邮箱,请查收'
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('发送验证码错误:', error)
    
    // 根据错误类型给出不同提示
    let errorMsg = '发送失败,请稍后重试'
    
    if (error.code === 'ECONNABORTED') {
      errorMsg = '请求超时，请检查后端服务是否正常运行'
    } else if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      if (status === 404) {
        errorMsg = '该邮箱未注册，请先注册账号'
      } else if (status === 429) {
        errorMsg = data.error || '请求过于频繁，请稍后再试'
      } else if (status === 500) {
        errorMsg = '邮件服务暂时不可用，请联系管理员或稍后重试'
      } else if (data && data.error) {
        errorMsg = data.error
      }
    } else if (error.request) {
      errorMsg = '网络连接失败，请确保后端服务已启动（localhost:3000）'
    }
    
    errorMessage.value = errorMsg
    throw error  // 抛出错误让EmailCodeInput知道发送失败
  }
}

// 提交重置密码
const handleSubmit = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  // 验证
  if (!form.value.email || !form.value.code || !form.value.newPassword || !form.value.confirmPassword) {
    errorMessage.value = '请填写完整信息'
    return
  }

  if (form.value.newPassword.length < 6) {
    errorMessage.value = '密码长度至少为6位'
    return
  }

  if (form.value.newPassword !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return
  }

  loading.value = true

  try {
    await authApi.resetPassword({
      email: form.value.email,
      code: form.value.code,
      newPassword: form.value.newPassword
    })

    successMessage.value = '密码重置成功!正在跳转到登录页...'
    
    setTimeout(() => {
      router.push('/auth')
    }, 2000)
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '重置失败,请检查验证码是否正确'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password-page {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.container {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.reset-box {
  padding: 34px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 24px;
  box-shadow: var(--shadow-soft);
}

.reset-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.reset-header h2 {
  margin: 0;
  color: var(--ink);
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.subtitle { display: none; }

.message {
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  font-size: 13px;
  font-weight: 700;
  animation: messageIn 0.26s var(--fish-ease) both;
}

@keyframes messageIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.error-message {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}

.success-message {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-group label {
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.input-group input {
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  color: var(--ink);
  font-size: 15px;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

.input-group input::placeholder { color: var(--text-4); }

.input-group input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: var(--shadow-soft);
}

.input-group input:disabled {
  background: var(--cream-2);
  color: var(--text-3);
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  padding: 12px;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-soft);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: var(--shadow-soft);
}

.submit-btn:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

.back-to-login {
  margin-top: 2px;
  text-align: center;
  font-size: 13px;
}

.back-to-login a {
  color: var(--text-3);
  font-weight: 700;
  text-decoration: none;
}

.back-to-login a:hover {
  color: var(--ink);
  border-bottom: 2px solid var(--primary-2);
}

@media (max-width: 767px) {
  .reset-password-page { padding: 16px 12px 32px; align-items: flex-start; }
  .reset-box { padding: 24px 18px; border-radius: 20px; }
  .reset-header h2 { font-size: 24px; }
}

@media (max-width: 480px) {
  .reset-password-page { padding: 12px 8px 24px; }
  .reset-box { padding: 20px 16px; box-shadow: var(--shadow-soft); }
  .input-group input { min-height: 44px; padding: 10px 12px; font-size: 14px; }
  .submit-btn { min-height: 44px; font-size: 14px; }
}
</style>
