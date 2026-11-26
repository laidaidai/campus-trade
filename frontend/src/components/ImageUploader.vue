<template>
  <div class="image-uploader">
    <div class="upload-list">
      <!-- 已上传的图片 -->
      <div 
        v-for="(image, index) in imageList" 
        :key="index" 
        class="upload-item"
      >
        <img 
          :src="getImageUrl(image)" 
          alt="商品图片" 
          loading="eager"
          @load="onImageLoad(image, index)"
          @error="onImageError(image, index)"
        />
        <div class="upload-item-actions">
          <button @click="previewImage(image)" class="btn-preview" title="预览">
            <Icon name="eye" />
          </button>
          <button @click="removeImage(index)" class="btn-remove" title="删除">
            <Icon name="trash" />
          </button>
        </div>
        <div v-if="image.uploading" class="upload-progress">
          <div class="progress-bar" :style="{ width: image.progress + '%' }"></div>
        </div>
      </div>

      <!-- 上传按钮 -->
      <div 
        v-if="imageList.length < maxCount" 
        class="upload-trigger"
        @click="triggerUpload"
      >
        <!-- 图片选择 -->
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          :multiple="multiple"
          @change="handleFileChange"
          style="display: none"
        />
        
        <div class="upload-content">
          <div class="upload-text">
            <Icon name="image" />
            <span>上传图片</span>
          </div>
          <div class="upload-hint">{{ imageList.length }}/{{ maxCount }}</div>
        </div>
      </div>
    </div>

    <!-- 图片预览弹窗 -->
    <transition name="fade">
      <div v-if="previewVisible" class="preview-modal" @click="closePreview">
        <div class="preview-content" @click.stop>
          <img :src="previewImageUrl" alt="预览" />
          <button class="btn-close" @click="closePreview">✕</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { uploadSingleImage, uploadMultipleImages, deleteImage } from '@/api/upload'
import { getImageUrl as getFullImageUrl } from '@/config'
import { smartCompress, createThumbnail } from '@/utils/imageCompress'
import Icon from './Icon.vue'
import toast from '@/utils/toast'
import { showDeleteConfirm } from '@/utils/dialog'

const props = defineProps({
  // 已上传的图片列表 (URL数组)
  modelValue: {
    type: Array,
    default: () => []
  },
  // 最大上传数量
  maxCount: {
    type: Number,
    default: 9
  },
  // 是否支持多选
  multiple: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const fileInput = ref(null)
const imageList = ref([])
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 初始化图片列表
const initImageList = () => {
  if (props.modelValue && props.modelValue.length > 0) {
    imageList.value = props.modelValue.map(url => ({
      url: typeof url === 'string' ? url : url.url || url,
      uploading: false,
      progress: 100
    }))
    console.log('初始化图片列表:', imageList.value)
  }
}

// 初始化
initImageList()

// 监听props.modelValue变化
watch(() => props.modelValue, (newValue) => {
  console.log('props.modelValue变化:', newValue)
  initImageList()
}, { deep: true })

// 获取图片完整URL
const getImageUrl = (image) => {
  let url = ''
  if (typeof image === 'string') {
    url = image
  } else if (image && typeof image === 'object') {
    url = image.url || image
  } else {
    url = image
  }
  
  const fullUrl = getFullImageUrl(url)
  console.log('构建图片URL:', { original: url, full: fullUrl })
  return fullUrl
}

// 触发文件选择
const triggerUpload = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileChange = async (event) => {
  const files = Array.from(event.target.files || [])
  
  if (files.length === 0) return
  
  // 检查数量限制
  const remainingSlots = props.maxCount - imageList.value.length
  if (files.length > remainingSlots) {
    toast.warning(`最多只能上传 ${props.maxCount} 张图片，还可以上传 ${remainingSlots} 张`)
    return
  }
  
  // 检查文件大小（提高限制，因为会自动压缩）
  const maxSize = 20 * 1024 * 1024
  const oversizedFiles = files.filter(file => file.size > maxSize)
  if (oversizedFiles.length > 0) {
    toast.warning('部分图片超过20MB限制，请压缩后上传')
    return
  }
  
  // 如果是多选，批量上传
  if (props.multiple && files.length > 1) {
    await uploadMultiple(files)
  } else {
    // 单张上传
    for (const file of files) {
      await uploadSingle(file)
    }
  }
  
  // 清空文件选择
  event.target.value = ''
}

// 上传单张图片
const uploadSingle = async (file) => {
  // 添加到列表显示
  const imageItem = {
    url: URL.createObjectURL(file),
    uploading: true,
    progress: 0,
    file
  }
  imageList.value.push(imageItem)
  
  try {
    // 智能压缩图片
    imageItem.progress = 20
    const compressedFile = await smartCompress(file)
    imageItem.progress = 40
    
    // 创建缩略图用于预览
    const thumbnail = await createThumbnail(compressedFile, { width: 200, height: 200 })
    imageItem.url = URL.createObjectURL(thumbnail)
    imageItem.progress = 60
    
    const response = await uploadSingleImage(compressedFile, 'products')
    
    if (response.success) {
      // 更新为服务器返回的URL
      imageItem.url = response.data.url
      imageItem.uploading = false
      imageItem.progress = 100
      
      console.log('单张图片上传成功:', response.data.url)
      updateModelValue()
    } else {
      throw new Error(response.message || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    toast.error('上传失败: ' + (error.response?.data?.message || error.message))
    // 移除失败的项
    const index = imageList.value.indexOf(imageItem)
    if (index > -1) {
      imageList.value.splice(index, 1)
    }
  }
}

// 批量上传
const uploadMultiple = async (files) => {
  // 创建临时预览
  const tempItems = files.map(file => ({
    url: URL.createObjectURL(file),
    uploading: true,
    progress: 0,
    file
  }))
  imageList.value.push(...tempItems)
  
  try {
    // 批量压缩图片
    tempItems.forEach((item, index) => {
      item.progress = 10 + (index * 5) // 分配进度
    })
    
    const compressedFiles = await Promise.all(
      files.map(file => smartCompress(file))
    )
    
    // 更新进度
    tempItems.forEach((item, index) => {
      item.progress = 30 + (index * 5)
    })
    
    const response = await uploadMultipleImages(compressedFiles, 'products')
    
    if (response.success) {
      // 更新为服务器返回的URL
      response.data.forEach((uploadedImage, index) => {
        const item = tempItems[index]
        if (item) {
          item.url = uploadedImage.url
          item.uploading = false
          item.progress = 100
          console.log('批量上传图片成功:', uploadedImage.url)
        }
      })
      
      updateModelValue()
    } else {
      throw new Error(response.message || '上传失败')
    }
  } catch (error) {
    console.error('批量上传失败:', error)
    toast.error('上传失败: ' + (error.response?.data?.message || error.message))
    // 移除失败的项
    tempItems.forEach(item => {
      const index = imageList.value.indexOf(item)
      if (index > -1) {
        imageList.value.splice(index, 1)
      }
    })
  }
}

// 移除图片
const removeImage = async (index) => {
  const image = imageList.value[index]
  
  const confirmed = await showDeleteConfirm('确定要删除这张图片吗？')
  
  if (!confirmed) return
  
  try {
    // 如果是服务器上的图片，调用删除接口
    if (image.url && image.url.includes('/uploads/')) {
      const filename = image.url.split('/').pop()
      await deleteImage(filename, 'products')
    }
    
    imageList.value.splice(index, 1)
    updateModelValue()
  } catch (error) {
    console.error('删除图片失败:', error)
    // 即使删除接口失败，也从列表移除
    imageList.value.splice(index, 1)
    updateModelValue()
  }
}

// 预览图片
const previewImage = (image) => {
  previewImageUrl.value = getImageUrl(image)
  previewVisible.value = true
}

// 关闭预览
const closePreview = () => {
  previewVisible.value = false
  previewImageUrl.value = ''
}

// 图片加载成功
const onImageLoad = (image, index) => {
  console.log('图片加载成功:', { image, index, url: getImageUrl(image) })
}

// 图片加载失败
const onImageError = (image, index) => {
  console.error('图片加载失败:', { image, index, url: getImageUrl(image) })
}

// 更新 v-model
const updateModelValue = () => {
  const urls = imageList.value
    .filter(item => !item.uploading)
    .map(item => {
      // 确保返回的是字符串URL
      const url = typeof item.url === 'string' ? item.url : item.url?.url || item.url
      console.log('更新图片URL:', url)
      return url
    })
  console.log('最终图片URL数组:', urls)
  emit('update:modelValue', urls)
  emit('change', urls)
}
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

.upload-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px;
}

/* 已上传：方形纸片 */
.upload-item {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 16px;
}

.upload-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 悬浮操作：纸片钮 */
.upload-item-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s var(--fish-ease);
}

@media (hover: hover) and (pointer: fine) {
  .upload-item:hover .upload-item-actions { opacity: 1; }
}

@media (hover: none) or (pointer: coarse) {
  .upload-item-actions { opacity: 1; }
}

.btn-preview,
.btn-remove {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease),
              border-color 0.2s var(--fish-ease),
              color 0.2s var(--fish-ease);
}

.btn-preview :deep(svg),
.btn-remove :deep(svg) {
  width: 15px;
  height: 15px;
}

.btn-preview:hover {
  background: var(--primary);
  border-color: var(--edge);
  color: var(--on-primary);
}

.btn-remove:hover {
  background: var(--danger);
  border-color: var(--edge);
  color: var(--on-primary);
}

/* 上传进度：实线槽 */
.upload-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  background: var(--cream-1);
  border-top: 1px solid var(--line);
}

.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.2s linear;
}

/* 上传入口：实线纸片，不用虚线 */
.upload-trigger {
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  cursor: pointer;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease);
}

.upload-trigger:hover {
  background: var(--card);
  border-color: var(--primary);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  text-align: center;
}

.upload-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 800;
}

.upload-text :deep(svg) {
  width: 26px;
  height: 26px;
  color: var(--text-3);
}

.upload-trigger:hover .upload-text {
  color: var(--ink);
}

.upload-hint {
  color: var(--text-4);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

/* 预览：深色台 */
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: color-mix(in srgb, var(--panel-deep) 82%, transparent);
}

.preview-content {
  position: relative;
  max-width: min(88vw, 720px);
  max-height: 88vh;
  padding: 6px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: var(--shadow-soft);
}

.preview-content img {
  display: block;
  max-width: 100%;
  max-height: calc(88vh - 12px);
  object-fit: contain;
  border-radius: 14px;
}

.btn-close {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  color: var(--on-primary);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.btn-close:hover {
  background: var(--danger);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s var(--fish-ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .upload-list { grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
  .preview-modal { padding: 16px; }
  .btn-close { top: -10px; right: -10px; width: 34px; height: 34px; }
}

@media (max-width: 380px) {
  .upload-list { gap: 6px; }
  .upload-text { font-size: 11px; }
  .upload-text :deep(svg) { width: 22px; height: 22px; }
}
</style>
