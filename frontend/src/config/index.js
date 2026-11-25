// 环境配置
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
// 图片基础URL，用于访问上传的文件
// 在生产环境中使用相对路径，让Vite代理处理
const isProd = import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
export const BASE_URL = import.meta.env.VITE_BASE_URL || (isProd ? '' : 'http://localhost:3000')

/**
 * 获取完整的图片URL
 * @param {string} url - 图片路径（可能是相对路径或完整URL）
 * @param {Object} options - 优化选项
 * @param {number} options.quality - 图片质量 (1-100)
 * @param {number} options.width - 图片宽度
 * @param {number} options.height - 图片高度
 * @param {boolean} options.webp - 是否使用WebP格式
 * @returns {string} 完整的图片URL
 */
export const getImageUrl = (url, options = {}) => {
  if (!url) return ''
  
  // 如果已经是完整的 http/https URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 本地生成头像、blob 预览不应再拼接服务端地址
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  
  // 检查是否为生产环境
  const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost'
  
  let fullUrl = ''
  
  if (isProd) {
    // 生产环境：使用相对路径，让nginx代理处理
    if (url.startsWith('/')) {
      fullUrl = url
    } else {
      fullUrl = `/${url}`
    }
  } else {
    // 开发环境：使用BASE_URL
    if (url.startsWith('/')) {
      fullUrl = `${BASE_URL}${url}`
    } else {
      fullUrl = `${BASE_URL}/${url}`
    }
  }
  
  return fullUrl
}

/**
 * 获取优化的图片URL（带默认优化参数）
 * @param {string} url - 图片路径
 * @param {number} quality - 图片质量
 * @param {number} maxWidth - 最大宽度
 * @returns {string} 优化的图片URL
 */
export const getOptimizedImageUrl = (url, quality = 80, maxWidth = 800) => {
  return getImageUrl(url, {
    quality,
    width: maxWidth,
    webp: true
  })
}

/**
 * 获取API完整URL
 * @param {string} path - API路径
 * @returns {string} 完整的API URL
 */
export const getApiUrl = (path) => {
  if (path.startsWith('/')) {
    return `${API_BASE_URL}${path}`
  }
  return `${API_BASE_URL}/${path}`
}
