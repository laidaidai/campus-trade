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
          <p class="form-subtitle">登录后，继续发现校园里的好物。</p>
          
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
                autocomplete="username"
                autocapitalize="off"
                spellcheck="false"
                aria-label="邮箱或用户名"
                placeholder="邮箱或用户名" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="loginForm.password" 
                type="password" 
                autocomplete="current-password"
                aria-label="密码"
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
          <p class="form-subtitle">一分钟加入，把闲置交给下一位同学。</p>
          
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
                autocomplete="nickname"
                autocapitalize="off"
                spellcheck="false"
                aria-label="用户名"
                placeholder="用户名" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="regForm.email" 
                type="email" 
                autocomplete="email"
                autocapitalize="off"
                spellcheck="false"
                aria-label="邮箱"
                placeholder="邮箱" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="regForm.password" 
                type="password" 
                autocomplete="new-password"
                aria-label="密码，至少六位"
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
                autocomplete="email"
                autocapitalize="off"
                spellcheck="false"
                aria-label="注册邮箱"
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
                aria-label="新密码，至少六位"
                placeholder="请输入新密码 (至少6位)" 
                :disabled="loading"
                required 
              />
            </div>
            <div class="input-group">
              <input 
                v-model="resetForm.confirmPassword" 
                type="password" 
                aria-label="再次输入新密码"
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
              <p>登录后继续收藏、聊天和发布闲置。</p>
              <button class="ghost-btn" @click="showLogin">去登录</button>
            </div>
            <span class="overlay-stamp">同校面交 · 当面验货</span>
          </div>
          <div class="overlay-panel overlay-right">
            <div class="overlay-content">
              <h2>第一次来？</h2>
              <p>注册后可以发布闲置、联系卖家。</p>
              <button class="ghost-btn" @click="showRegister">创建账号</button>
            </div>
            <span class="overlay-stamp">同校面交 · 当面验货</span>
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
.auth-container {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
}

/* 纸卡：墨线 + 硬影，唯一的舞台 */
.auth-container .auth-box {
  position: relative;
  width: 100%;
  min-height: 480px;
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  box-shadow: 6px 7px 0 rgba(63, 61, 86, 0.055);
}


.forms-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
}

.form-panel {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 48px;
  transition: left 0.5s var(--fish-ease), opacity 0.4s var(--fish-ease);
}

.login-panel { left: 0; }
.register-panel { left: 100%; opacity: 0; }

.auth-box.register-mode .login-panel { left: -100%; opacity: 0; }
.auth-box.register-mode .register-panel { left: 50%; opacity: 1; }

h2 {
  margin: 0 0 26px;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.subtitle { display: none; }

.form-subtitle {
  margin: -14px 0 20px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.6;
}

form { width: 100%; }

.input-group { margin-bottom: 14px; }

input {
  width: 100%;
  min-height: 46px;
  padding: 11px 14px;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  color: var(--ink);
  font-size: 15px;
  font-family: inherit;
  transition: border-color 0.26s var(--fish-ease),
              box-shadow 0.26s var(--fish-ease),
              background-color 0.26s var(--fish-ease);
}

input::placeholder { color: var(--text-4); }

input:focus {
  outline: none;
  background: var(--card);
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(184, 68, 97, 0.12);
}

input:disabled {
  background: rgba(244, 251, 248, 0.7);
  color: var(--text-3);
  cursor: not-allowed;
}

.submit-btn {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 12px;
  background: var(--primary);
  border: 1px solid var(--primary-2);
  border-radius: 6px;
  box-shadow: 3px 3px 0 rgba(168, 58, 87, 0.18);
  box-shadow: none;
  color: var(--on-primary);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.submit-btn:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 rgba(168, 58, 87, 0.22);
}

.submit-btn:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 rgba(168, 58, 87, 0.18);
}

.submit-btn:disabled {
  opacity: 0.55;
  box-shadow: none;
  cursor: not-allowed;
}

/* 提示：实线语义色，不做渐变 */
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

.footer-links { margin-top: 18px; }

.switch-text {
  margin: 0 0 10px;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

.forgot-password {
  margin: 0;
  font-size: 12px;
  text-align: center;
}

.forgot-password a,
.back-to-login a {
  color: var(--text-3);
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s var(--fish-ease);
}

.switch-text a {
  color: var(--primary-2);
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s var(--fish-ease);
}

.switch-text a:hover,
.forgot-password a:hover,
.back-to-login a:hover {
  color: var(--ink);
  border-bottom: 2px solid var(--primary-2);
}

/* 覆盖面板：深色品牌面，只有单色大图形 */
.overlay-container {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 100%;
  overflow: hidden;
  z-index: 100;
  border-left: 1px solid var(--line);
  transition: left 0.5s var(--fish-ease);
}

.auth-box.register-mode .overlay-container { left: 0; border-left: none; border-right: 1px solid var(--line); }

.overlay {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cream-1);
  overflow: hidden;
}

.overlay-panel {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-align: left;
  color: var(--on-panel);
  transition: opacity 0.4s var(--fish-ease);
}

.overlay-left { opacity: 0; pointer-events: none; }
.overlay-right { opacity: 1; }

.auth-box.register-mode .overlay-left { opacity: 1; pointer-events: auto; }
.auth-box.register-mode .overlay-right { opacity: 0; pointer-events: none; }

.overlay-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 22px;
  padding: 40px;
}

.overlay-content h2 {
  margin: 0;
  color: var(--on-panel);
  font-size: 30px;
  font-weight: 700;
}

.overlay-content p {
  max-width: 30ch;
  margin-top: -8px;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1.7;
}

.overlay-stamp {
  position: absolute;
  right: 28px;
  bottom: 24px;
  padding: 7px 11px;
  border: 1px solid color-mix(in srgb, var(--primary) 55%, transparent);
  border-radius: 2px;
  color: color-mix(in srgb, var(--primary) 72%, transparent);
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.1em;
  transform: rotate(-5deg);
  pointer-events: none;
}

.ghost-btn {
  min-height: 46px;
  padding: 10px 34px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(63, 61, 86, 0.16);
  border-radius: 14px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease),
              color 0.26s var(--fish-ease);
}

.ghost-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: var(--on-primary);
  box-shadow: 0 8px 20px rgba(184, 68, 97, 0.24);
}

.ghost-btn:active { transform: translateY(2px); }

/* 找回密码：单栏居中 */
.reset-panel { left: 100%; opacity: 0; width: 50%; }

.auth-box.reset-mode .reset-panel { left: 25%; opacity: 1; }
.auth-box.reset-mode .login-panel { left: -100%; opacity: 0; }
.auth-box.reset-mode .register-panel { left: 100%; opacity: 0; }

@media (min-width: 769px) {
  .auth-box.reset-mode .reset-panel {
    left: 50%;
    transform: translateX(-50%);
  }
}

.back-to-login {
  margin-top: 18px;
  font-size: 13px;
  text-align: center;
}

/* 手机：单栏，覆盖面板隐藏 */
@media (max-width: 767px) {
  .auth-container { max-width: 100%; }

  .auth-container .auth-box {
    min-height: 470px;
    border-radius: 28px;
  }

  .overlay-container { display: none; }

  .form-panel {
    width: 100%;
    padding: 26px 28px;
  }

  .login-panel { left: 0; opacity: 1; }
  .register-panel { left: 100%; opacity: 0; }
  .auth-box.register-mode .register-panel { left: 0; opacity: 1; }
  .auth-box.register-mode .login-panel { left: -100%; opacity: 0; }

  .reset-panel { left: 100%; opacity: 0; width: 100%; }
  .auth-box.reset-mode .reset-panel { left: 0; opacity: 1; transform: none; }
  .auth-box.reset-mode .login-panel { left: -100%; opacity: 0; }

  h2 { font-size: 25px; margin-bottom: 20px; }
}

@media (max-width: 480px) {
  .auth-container .auth-box {
    min-height: 430px;
    border-radius: 24px;
    box-shadow: var(--shadow-soft);
  }
  .form-panel { padding: 22px 20px; }
  h2 { font-size: 22px; }
  input { min-height: 44px; padding: 10px 12px; font-size: 14px; }
  .input-group { margin-bottom: 12px; }
  .submit-btn { min-height: 44px; font-size: 14px; }
}

/* iPad 竖屏 */
@media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
  .auth-container { max-width: 760px; }
  .auth-box { min-height: 620px; }
  .form-panel { padding: 0 40px; }
  .reset-panel { left: 100%; width: 100%; }
  .auth-box.reset-mode .reset-panel {
    left: 50%;
    transform: translateX(-50%);
    width: 80%;
    max-width: 620px;
  }
  .overlay-container { left: 50%; width: 50%; }
  .auth-box.register-mode .overlay-container { left: 0; }
}
</style>
