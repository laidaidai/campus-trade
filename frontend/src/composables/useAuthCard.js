import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { sendVerificationCode, resetPassword, getAuthConfig } from '@/api/auth'

export function useAuthCard() {
  const userStore = useUserStore()
  const router = useRouter()
  
  const mode = ref('login') // 'login' | 'register' | 'reset'
  const errorMessage = ref('')
  const successMessage = ref('')

  // 是否需要邮箱验证（由后端配置决定，未获取到前默认不需要，避免阻碍注册）
  const requireEmailVerification = ref(false)

  const loginForm = ref({ loginId: '', password: '' })
  const regForm = ref({ username: '', email: '', password: '', code: '' })
  const resetForm = ref({ 
    email: '', 
    code: '', 
    newPassword: '', 
    confirmPassword: '' 
  })

  // 启动时拉取后端配置
  onMounted(async () => {
    try {
      const res = await getAuthConfig()
      const data = res?.data ?? res
      requireEmailVerification.value = Boolean(data?.requireEmailVerification)
    } catch (error) {
      // 获取失败时降级为不需要验证码，不阻碍用户注册
      requireEmailVerification.value = false
    }
  })

  // 人机验证
  const showCaptcha = ref(false)
  const captchaType = ref('slider')
  const captchaPendingAction = ref(null)

  const isLogin = computed(() => mode.value === 'login')
  const isReset = computed(() => mode.value === 'reset')

  function showRegister() {
    mode.value = 'register'
    errorMessage.value = ''
    successMessage.value = ''
    regForm.value = { username: '', email: '', password: '', code: '' }
  }

  function showLogin() {
    mode.value = 'login'
    errorMessage.value = ''
    successMessage.value = ''
  }

  function showReset() {
    mode.value = 'reset'
    errorMessage.value = ''
    successMessage.value = ''
    // 清空重置表单
    resetForm.value = { 
      email: '', 
      code: '', 
      newPassword: '', 
      confirmPassword: '' 
    }
  }

  async function onLogin() {
    errorMessage.value = ''
    successMessage.value = ''

    // 验证
    if (!loginForm.value.loginId || !loginForm.value.password) {
      errorMessage.value = '请填写完整的登录信息'
      return
    }

    const result = await userStore.login({
      loginId: loginForm.value.loginId,
      password: loginForm.value.password
    })

    if (result.success) {
      successMessage.value = '登录成功！'
      // 使用 router.replace 而不是 push，并移除延迟
      // 确保状态已更新后立即跳转
      await router.replace('/')
    } else {
      errorMessage.value = result.message
    }
  }

  async function onRegister() {
    errorMessage.value = ''
    successMessage.value = ''

    // 验证
    if (!regForm.value.username || !regForm.value.email || !regForm.value.password) {
      errorMessage.value = '请填写完整的注册信息'
      return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(regForm.value.email)) {
      errorMessage.value = '请输入有效的邮箱地址'
      return
    }

    // 验证密码长度
    if (regForm.value.password.length < 6) {
      errorMessage.value = '密码长度至少为6位'
      return
    }

    // 验证邮箱验证码（后端要求时）
    if (requireEmailVerification.value && !regForm.value.code) {
      errorMessage.value = '请先获取邮箱验证码'
      return
    }

    const result = await userStore.register({
      username: regForm.value.username,
      email: regForm.value.email,
      password: regForm.value.password,
      code: regForm.value.code
    })

    if (result.success) {
      successMessage.value = '注册成功！正在跳转...'
      // 使用 router.replace 而不是 push，并移除延迟
      await router.replace('/')
    } else {
      errorMessage.value = result.message
    }
  }

  // 人机验证成功处理
  function handleCaptchaSuccess() {
    showCaptcha.value = false
    if (captchaPendingAction.value) {
      captchaPendingAction.value()
      captchaPendingAction.value = null
    }
  }

  // 发送重置密码验证码（直接发送，无需人机验证）
  async function handleSendResetCode() {
    return sendCodeTo('reset-password')
  }

  // 发送注册验证码
  async function handleSendRegisterCode() {
    return sendCodeTo('register')
  }

  /**
   * 统一的验证码发送逻辑
   * @param {'register'|'reset-password'} type
   */
  async function sendCodeTo(type) {
    errorMessage.value = ''

    // 注册与找回密码分别读各自的表单
    const email = type === 'register' ? regForm.value.email : resetForm.value.email

    if (!email) {
      errorMessage.value = '请输入邮箱'
      throw new Error('请输入邮箱')
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errorMessage.value = '请输入有效的邮箱地址'
      throw new Error('请输入有效的邮箱地址')
    }

    try {
      await sendVerificationCode({ email, type })
      successMessage.value = '验证码已发送到您的邮箱'
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } catch (error) {
      let errorMsg = '发送验证码失败'

      if (error.code === 'ECONNABORTED') {
        errorMsg = '请求超时，请检查后端服务是否正常运行'
      } else if (error.response) {
        const status = error.response.status
        const data = error.response.data

        if (status === 404) {
          errorMsg = '该邮箱未注册，请先注册账号'
        } else if (status === 429) {
          errorMsg = data.error || '请求过于频繁，请稍后再试'
        } else if (status === 400 && data?.error) {
          errorMsg = data.error
        } else if (status === 500) {
          errorMsg = '邮件服务暂时不可用，请联系管理员或稍后重试'
        } else if (data && (data.error || data.message)) {
          errorMsg = data.error || data.message
        }
      } else if (error.request) {
        errorMsg = '网络连接失败，请确保后端服务已启动（localhost:3000）'
      }

      errorMessage.value = errorMsg
      throw error  // 抛出错误让EmailCodeInput知道发送失败
    }
  }

  // 重置密码
  async function onResetPassword() {
    errorMessage.value = ''
    successMessage.value = ''

    // 验证表单
    if (!resetForm.value.email || !resetForm.value.code || !resetForm.value.newPassword || !resetForm.value.confirmPassword) {
      errorMessage.value = '请填写完整的重置信息'
      return
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(resetForm.value.email)) {
      errorMessage.value = '请输入有效的邮箱地址'
      return
    }

    // 验证密码长度
    if (resetForm.value.newPassword.length < 6) {
      errorMessage.value = '密码长度至少为6位'
      return
    }

    // 验证两次密码是否一致
    if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
      errorMessage.value = '两次输入的密码不一致'
      return
    }

    try {
      await resetPassword({
        email: resetForm.value.email,
        code: resetForm.value.code,
        newPassword: resetForm.value.newPassword
      })

      successMessage.value = '密码重置成功！正在跳转到登录...'
      
      // 清空表单
      resetForm.value = { 
        email: '', 
        code: '', 
        newPassword: '', 
        confirmPassword: '' 
      }

      // 1.5秒后切换到登录模式
      setTimeout(() => {
        mode.value = 'login'
        successMessage.value = ''
      }, 1500)
    } catch (error) {
      errorMessage.value = error.response?.data?.message || '密码重置失败'
    }
  }

  return {
    mode,
    isLogin,
    isReset,
    requireEmailVerification,
    loginForm,
    regForm,
    resetForm,
    errorMessage,
    successMessage,
    loading: computed(() => userStore.loading),
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
  }
}
