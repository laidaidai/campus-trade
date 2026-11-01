<template>
  <div class="auth-container">
    <div class="auth-box" :class="modeClass">
      <!-- 人机验证弹窗 -->
      <CaptchaVerify
        :visible="showCaptcha"
        :type="captchaType"
        title="安全验证"
        @success="handleCaptchaSuccess"
        @close="showCaptcha = false"
      />

      <!-- 表单容器 -->
      <div class="forms-wrapper">
        <!-- 登录表单 -->
        <div class="form-panel login-panel">
          <h2>欢迎回来</h2>
          <p class="subtitle">登录以继续使用校园交易平台</p>
          
          <!-- 错误提示 -->
          <div v-if="errorMessage && isLogin" class="message error-message">
            {{ errorMessage }}
          </div>
          <!-- 成功提示 -->
          <div v-if="successMessage && isLogin" class="message success-message">
            {{ successMessage }}
          </div>
          
          <form @submit.prevent="onLogin">
            <div class="input-group">
              <input 
                v-model="loginForm.loginId" 
                type="text" 
                placeholder="邮箱或用户名" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="loginForm.password" 
                type="password" 
                placeholder="密码" 
                :disabled="loading"
                required 
              />
            </div>
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>
          <div class="footer-links">
            <p class="switch-text">
              还没有账号？<a @click="showRegister">立即注册</a>
            </p>
            <p class="forgot-password">
              <a @click="showReset">忘记密码?</a>
            </p>
          </div>
        </div>

        <!-- 注册表单 -->
        <div class="form-panel register-panel">
          <h2>创建账号</h2>
          <p class="subtitle">加入校园交易社区</p>
          
          <!-- 错误提示 -->
          <div v-if="errorMessage && !isLogin" class="message error-message">
            {{ errorMessage }}
          </div>
          <!-- 成功提示 -->
          <div v-if="successMessage && !isLogin" class="message success-message">
            {{ successMessage }}
          </div>
          
          <form @submit.prevent="onRegister">
            <div class="input-group">
              <input 
                v-model="regForm.username" 
                type="text" 
                placeholder="用户名" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="regForm.email" 
                type="email" 
                placeholder="邮箱" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="regForm.password" 
                type="password" 
                placeholder="密码 (至少6位)" 
                :disabled="loading"
                required 
              />
            </div>
            <div v-if="requireEmailVerification" class="input-group">
              <EmailCodeInput
                v-model="regForm.code"
                :email="regForm.email"
                type="register"
                :disabled="loading"
                @send="handleSendRegisterCode"
              />
            </div>
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? '注册中...' : '注册' }}
            </button>
          </form>
          <p class="switch-text">
            已有账号？<a @click="showLogin">立即登录</a>
          </p>
        </div>

        <!-- 找回密码表单 -->
        <div class="form-panel reset-panel">
          <h2>找回密码</h2>
          <p class="subtitle">通过邮箱验证码重置密码</p>
          
          <!-- 错误提示 -->
          <div v-if="errorMessage && isReset" class="message error-message">
            {{ errorMessage }}
          </div>
          <!-- 成功提示 -->
          <div v-if="successMessage && isReset" class="message success-message">
            {{ successMessage }}
          </div>
          
          <form @submit.prevent="onResetPassword">
            <div class="input-group">
              <input 
                v-model="resetForm.email" 
                type="email" 
                placeholder="请输入注册时的邮箱" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <EmailCodeInput
                v-model="resetForm.code"
                :email="resetForm.email"
                type="reset-password"
                placeholder="请输入6位验证码"
                :disabled="loading"
                @send="handleSendResetCode"
              />
            </div>
            <div class="input-group">
              <input 
                v-model="resetForm.newPassword" 
                type="password" 
                placeholder="请输入新密码 (至少6位)" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="resetForm.confirmPassword" 
                type="password" 
                placeholder="请再次输入新密码" 
                :disabled="loading"
                required 
              />
            </div>
            <button type="submit" class="submit-btn" :disabled="loading">
              {{ loading ? '重置中...' : '重置密码' }}
            </button>
          </form>
          <p class="switch-text">
            <a @click="showLogin">← 返回登录</a>
          </p>
        </div>
      </div>

      <!-- 滑动覆盖面板（图片卡片） - 仅在登录/注册模式显示 -->
      <div class="overlay-container" v-if="!isReset">
        <div class="overlay" :style="overlayStyle">
          <div class="overlay-panel overlay-left">
            <div class="overlay-content">
              <h2>已有账号？</h2>
              <p>登录以继续探索校园交易的精彩内容</p>
              <button class="ghost-btn" @click="showLogin">登录</button>
            </div>
          </div>
          <div class="overlay-panel overlay-right">
            <div class="overlay-content">
              <h2>第一次来？</h2>
              <p>注册账号，开启你的校园交易之旅</p>
              <button class="ghost-btn" @click="showRegister">注册</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthCard } from '@/composables/useAuthCard'
import CaptchaVerify from './CaptchaVerify.vue'
import EmailCodeInput from './EmailCodeInput.vue'

const { 
  mode,
  isLogin,
  isReset,
  requireEmailVerification,
  loginForm, 
  regForm,
  resetForm,
  errorMessage, 
  successMessage, 
  loading,
  showCaptcha,
  captchaType,
  showRegister, 
  showLogin,
  showReset,
  onLogin, 
  onRegister,
  onResetPassword,
  handleSendResetCode,
  handleSendRegisterCode,
  handleCaptchaSuccess
} = useAuthCard()

// 动态class
const modeClass = computed(() => {
  if (mode.value === 'register') return 'register-mode'
  if (mode.value === 'reset') return 'reset-mode'
  return ''
})

// Provide CSS variable for background image to avoid CSS url() resolution in stylesheet
const overlayStyle = { '--auth-login-image': "url('/images/login.png')" }
</script>

<style scoped>
/* Styles for AuthCard (moved from src/css/AuthCard.css) */
.auth-container { width: 100%; max-width: 900px; }
.auth-container .auth-box { position: relative; width: 100%; min-height: 550px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12); overflow: hidden; border: 1px solid rgba(0, 0, 0, 0.05); }
.forms-wrapper { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; }
.form-panel { position: absolute; width: 50%; height: 100%; display: flex; flex-direction: column; justify-content: center; padding: 0 60px; transition: left 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.login-panel { left: 0; }
.register-panel { left: 100%; opacity: 0; }
.auth-box.register-mode .login-panel { left: -100%; opacity: 0; }
.auth-box.register-mode .register-panel { left: 50%; opacity: 1; }
h2 { font-size: 32px; font-weight: 700; margin: 0 0 10px; color: var(--text-primary); }
.subtitle { font-size: 14px; color: var(--text-secondary); margin: 0 0 30px; }
form { width: 100%; }
.input-group { margin-bottom: 20px; }
input { width: 100%; padding: 14px 18px; border: 2px solid #e8e8e8; border-radius: 10px; font-size: 15px; transition: all var(--transition-base) var(--ease-in-out); background: #f9f9f9; }
input:focus { outline: none; border-color: var(--primary-color); background: var(--bg-white); }
.submit-btn { width: 100%; padding: 14px; border: none; border-radius: 12px; background: linear-gradient(135deg, #ff2442 0%, #ff4757 100%); color: #fff; font-size: 16px; font-weight: 600; letter-spacing: 0.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-top: 10px; box-shadow: 0 4px 12px rgba(255, 36, 66, 0.25); }
.submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255, 36, 66, 0.4); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
input:disabled { background: var(--bg-dark); cursor: not-allowed; }
.message { padding: 12px 16px; border-radius: var(--radius-sm); margin-bottom: 20px; font-size: 14px; animation: slideDown 0.3s ease-out; }
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.error-message { background-color: #fee; color: #c33; border: 1px solid #fcc; }
.success-message { background-color: #efe; color: #3c3; border: 1px solid #cfc; }
.footer-links { margin-top: 20px; }
.switch-text { text-align: center; font-size: 14px; color: var(--text-secondary); margin: 0 0 10px 0; }
.forgot-password { text-align: center; font-size: 13px; margin: 0; }
.forgot-password a { color: var(--text-tertiary); text-decoration: none; transition: color 0.2s; }
.forgot-password a:hover { color: var(--primary-color); }
.switch-text a { color: var(--primary-color); font-weight: 600; cursor: pointer; text-decoration: none; transition: color var(--transition-base) var(--ease-in-out); }
.switch-text a:hover { color: var(--primary-light); text-decoration: underline; }
.overlay-container { position: absolute; top: 0; left: 50%; width: 50%; height: 100%; overflow: hidden; transition: left 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94); z-index: 100; }
.auth-box.register-mode .overlay-container { left: 0; }
.overlay { position: relative; width: 100%; height: 100%; background: linear-gradient(135deg, rgba(255, 36, 66, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%), var(--auth-login-image); background-position: center center; background-size: cover; background-repeat: no-repeat; display: flex; align-items: center; justify-content: center; }
.overlay-panel { position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: #fff; transition: opacity 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.overlay-left { opacity: 0; pointer-events: none; }
.overlay-right { opacity: 1; }
.auth-box.register-mode .overlay-left { opacity: 1; pointer-events: auto; }
.auth-box.register-mode .overlay-right { opacity: 0; pointer-events: none; }
.overlay-content { padding: 40px; }
.overlay-content h2 { color: #fff; font-size: 28px; margin-bottom: 15px; }
.overlay-content p { font-size: 15px; line-height: 1.6; margin-bottom: 30px; opacity: 0.9; }
.ghost-btn { padding: 12px 40px; border: 2px solid #fff; border-radius: 25px; background: transparent; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: all var(--transition-slow) var(--ease-in-out); }
.ghost-btn:hover { background: var(--bg-white); color: var(--primary-color); }
.reset-panel { left: 100%; opacity: 0; width: 50%; }
.auth-box.reset-mode .reset-panel { left: 25%; opacity: 1; }
.auth-box.reset-mode .login-panel { left: -100%; opacity: 0; }
.auth-box.reset-mode .register-panel { left: 100%; opacity: 0; }
/* 桌面端保持居中对齐 */
@media (min-width: 769px) {
  .auth-box.reset-mode .reset-panel {
    left: 50%;
    transform: translateX(-50%);
  }
}
.back-to-login { text-align: center; font-size: 14px; margin-top: 20px; }
.back-to-login a { color: var(--primary-color); font-weight: 600; cursor: pointer; text-decoration: none; transition: color var(--transition-base) var(--ease-in-out); }
.back-to-login a:hover { color: var(--primary-light); text-decoration: underline; }
@media (max-width: 768px) { 
  .auth-container { 
    max-width: 100%; 
    padding: 0 16px; 
  }
  .auth-box { 
    min-height: 600px; 
    border-radius: 16px; 
    margin: 0; 
  } 
  .overlay-container { 
    display: none; 
  } 
  .form-panel { 
    width: 100%; 
    padding: 0 30px; 
  } 
  .login-panel { 
    left: 0; 
    opacity: 1; 
  } 
  .register-panel { 
    left: 100%; 
    opacity: 0; 
  } 
  .auth-box.register-mode .register-panel { 
    left: 0; 
    opacity: 1; 
  } 
  .auth-box.register-mode .login-panel { 
    left: -100%; 
    opacity: 0; 
  } 
  .reset-panel { 
    left: 100%; 
    opacity: 0;
    width: 100%;
  }
  .auth-box.reset-mode .reset-panel { 
    left: 0; 
    opacity: 1;
    transform: none;
  }
  .auth-box.reset-mode .login-panel { 
    left: -100%; 
    opacity: 0; 
  }
  h2 { 
    font-size: 26px; 
  } 
  .subtitle { 
    font-size: 13px; 
  } 
}
@media (max-width: 480px) { 
  .auth-container { 
    padding: 0 8px; 
  }
  .auth-box { 
    margin: 0; 
    min-height: 500px; 
    border-radius: 12px;
  } 
  .form-panel { 
    padding: 0 20px; 
  } 
  h2 { 
    font-size: 22px; 
  } 
  .subtitle { 
    font-size: 12px; 
    margin-bottom: 20px; 
  } 
  input { 
    padding: 12px 16px; 
    font-size: 14px; 
  } 
  .submit-btn { 
    padding: 12px; 
    font-size: 15px; 
  }
  .input-group {
    margin-bottom: 16px;
  }
}

/* iPad竖屏优化 */
@media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
  .auth-container {
    max-width: 700px;
    width: 100%;
    margin: 0 auto;
  }
  
  .auth-box {
    min-height: 600px;
    margin: 0 auto;
  }
  
  .form-panel {
    padding: 0 50px;
  }
  
  .login-panel {
    left: 0;
    width: 50%;
  }
  
  .register-panel {
    left: 100%;
    width: 50%;
  }
  
  .auth-box.register-mode .register-panel {
    left: 50%;
  }
  
  .reset-panel {
    left: 100%;
    width: 100%;
  }
  
  .auth-box.reset-mode .reset-panel {
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 600px;
  }
  
  .overlay-container {
    left: 50%;
    width: 50%;
  }
  
  .auth-box.register-mode .overlay-container {
    left: 0;
  }
}

/* iPad Pro竖屏特殊优化 */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: portrait) {
  .auth-container {
    max-width: 750px;
  }
  
  h2 {
    font-size: 30px;
  }
  
  .subtitle {
    font-size: 15px;
  }
  
  input {
    padding: 15px 20px;
    font-size: 16px;
  }
  
  .submit-btn {
    padding: 15px;
    font-size: 17px;
  }
}
</style>
