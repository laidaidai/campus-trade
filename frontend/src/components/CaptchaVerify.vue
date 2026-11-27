<template>
  <div class="captcha-modal" v-if="visible" @click="handleClose">
    <div class="captcha-box" @click.stop>
      <div class="captcha-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="handleClose" aria-label="关闭验证">&times;</button>
      </div>
      
      <div class="captcha-content">
        <!-- 滑块验证 -->
        <div v-if="type === 'slider'" class="slider-captcha">
          <div class="puzzle-container">
            <canvas ref="canvasRef" class="background-canvas"></canvas>
            <canvas ref="blockRef" class="block-canvas" :style="blockStyle"></canvas>
          </div>
          
          <div class="slider-tip">
            <span v-if="!verified && !failed">拖动滑块，将拼图块对齐缺口</span>
            <span v-if="verified" class="tip-success">✓ 验证成功</span>
            <span v-if="failed" class="tip-failed">✗ 验证失败，请重试</span>
          </div>
          
          <div class="slider-container" :class="{ success: verified, failed: failed }">
            <div class="slider-mask" :style="sliderMaskStyle">
              <span v-if="!verified && !failed">{{ sliderText }}</span>
              <span v-if="verified">✓ 验证成功</span>
              <span v-if="failed">✗ 验证失败，请重试</span>
            </div>
            <div 
              class="slider-button"
              :style="sliderButtonStyle"
              @mousedown="handleDragStart"
              @touchstart="handleDragStart"
            >
              <i class="arrow">→</i>
            </div>
          </div>
        </div>

        <!-- 拼图验证 -->
        <div v-if="type === 'puzzle'" class="puzzle-captcha">
          <div class="puzzle-container">
            <canvas ref="puzzleCanvasRef" class="background-canvas"></canvas>
            <div class="puzzle-pieces">
              <div 
                v-for="(piece, index) in puzzlePieces" 
                :key="index"
                class="puzzle-piece"
                :class="{ placed: piece.placed, correct: piece.correct }"
                :style="piece.style"
                @mousedown="(e) => startDragPiece(e, index)"
                @touchstart="(e) => startDragPiece(e, index)"
              >
                <canvas :ref="el => setPieceCanvas(el, index)"></canvas>
              </div>
            </div>
          </div>
          
          <div class="puzzle-status">
            <span v-if="!verified && !failed">拖动拼图块到正确位置</span>
            <span v-if="verified" class="success">验证成功</span>
            <span v-if="failed" class="failed">验证失败，请重试</span>
          </div>
        </div>

        <div class="captcha-footer">
          <button class="refresh-btn" @click="refresh">
            <Icon name="refresh" /> 刷新
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  type: { type: String, default: 'slider' }, // 'slider' | 'puzzle'
  title: { type: String, default: '安全验证' }
})

const emit = defineEmits(['close', 'success'])

// 滑块验证相关
const canvasRef = ref(null)
const blockRef = ref(null)
const sliderX = ref(0)
const blockX = ref(0)
const isDragging = ref(false)
const verified = ref(false)
const failed = ref(false)
const puzzleX = ref(0)

// 拼图验证相关
const puzzleCanvasRef = ref(null)
const puzzlePieces = ref([])
const currentPiece = ref(null)

const sliderText = computed(() => '向右滑动完成验证')

const sliderMaskStyle = computed(() => ({
  width: `${sliderX.value}px`
}))

const sliderButtonStyle = computed(() => ({
  left: `${sliderX.value}px`
}))

const blockStyle = computed(() => {
  // 拼图块直接跟随滑块的像素位置移动
  return { 
    left: `${blockX.value}px`,
    top: '0px'
  }
})

// 初始化滑块验证
const initSlider = async () => {
  await nextTick()
  
  if (!canvasRef.value || !blockRef.value) return

  const canvas = canvasRef.value
  const block = blockRef.value
  const ctx = canvas.getContext('2d')
  const blockCtx = block.getContext('2d')

  // 设置canvas尺寸 - 使用容器宽度
  const containerWidth = canvas.parentElement.clientWidth
  const canvasWidth = Math.min(containerWidth, 300)
  const canvasHeight = Math.floor(canvasWidth / 2) // 保持2:1比例
  
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  
  // block canvas设置为和主canvas一样的大小（会被CSS缩放）
  block.width = canvasWidth
  block.height = canvasHeight

  // 先绘制一个占位背景
  ctx.fillStyle = 'var(--primary-3)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // 添加加载提示
  ctx.fillStyle = 'var(--text-3)'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('加载中...', canvas.width / 2, canvas.height / 2)

  // 生成随机背景图 - 使用更可靠的图片源
  const img = new Image()
  img.crossOrigin = "anonymous"
  
  // 使用多个备选图片源
  const imageUrls = [
    `https://picsum.photos/${canvasWidth}/${canvasHeight}?random=${Date.now()}`,
    `https://source.unsplash.com/random/${canvasWidth}x${canvasHeight}?sig=${Date.now()}`,
  ]
  
  let currentUrlIndex = 0
  
  const tryLoadImage = () => {
    if (currentUrlIndex >= imageUrls.length) {
      // 如果所有图片源都失败，使用纯色背景
      drawWithColorBackground(ctx, blockCtx, canvas.width, canvas.height)
      return
    }
    
    img.src = imageUrls[currentUrlIndex]
  }
  
  img.onload = () => {
    // 清除加载提示
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // 生成随机拼图位置
    const puzzleSize = Math.floor(canvas.width / 6) // 动态计算拼图大小
    puzzleX.value = Math.floor(Math.random() * (canvas.width - puzzleSize - 50)) + 50
    const puzzleY = Math.floor(Math.random() * (canvas.height - puzzleSize - 30)) + 20
    
    // 绘制拼图形状
    const r = Math.floor(puzzleSize / 5) // 拼图凸起半径
    
    // 在主画布上绘制拼图缺口（暗色阴影）
    ctx.save()
    drawPuzzlePath(ctx, puzzleX.value, puzzleY, puzzleSize, r)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fill()
    ctx.restore()
    
    // 绘制缺口边框，使其更明显
    ctx.save()
    drawPuzzlePath(ctx, puzzleX.value, puzzleY, puzzleSize, r)
    ctx.strokeStyle = 'var(--ink)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    // 绘制拼图块到单独的canvas - 只绘制拼图块部分
    blockCtx.clearRect(0, 0, block.width, block.height)
    
    // 创建拼图路径并裁剪
    blockCtx.save()
    // 在0位置绘制（因为这个canvas会通过CSS移动）
    drawPuzzlePath(blockCtx, 0, puzzleY, puzzleSize, r)
    blockCtx.clip()
    
    // 绘制对应的图片部分
    blockCtx.drawImage(
      img,
      puzzleX.value, 0,  // 从puzzleX位置截取
      puzzleSize + 20, canvas.height,  // 截取的大小
      0, 0,  // 绘制到canvas的0位置
      puzzleSize + 20, canvas.height
    )
    blockCtx.restore()
    
    // 添加拼图块边框
    blockCtx.save()
    drawPuzzlePath(blockCtx, 0, puzzleY, puzzleSize, r)
    blockCtx.strokeStyle = 'var(--card)'
    blockCtx.lineWidth = 3
    blockCtx.stroke()
    blockCtx.restore()
  }
  
  img.onerror = () => {
    currentUrlIndex++
    tryLoadImage()
  }
  
  tryLoadImage()
}

// 使用纯色背景作为后备方案
const drawWithColorBackground = (ctx, blockCtx, canvasWidth, canvasHeight) => {
  const width = canvasWidth
  const height = canvasHeight
  // 纸底背景
  ctx.fillStyle = 'var(--primary-3)'
  ctx.fillRect(0, 0, width, height)
  
  // 添加一些装饰图案
  ctx.fillStyle = 'rgba(184,68,97,0.16)'
  for (let i = 0; i < 20; i++) {
    ctx.beginPath()
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 30 + 10,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }
  
  // 生成拼图位置
  const puzzleSize = Math.floor(width / 6)
  puzzleX.value = Math.floor(Math.random() * (width - puzzleSize - 50)) + 50
  const puzzleY = Math.floor(Math.random() * (height - puzzleSize - 30)) + 20
  const r = Math.floor(puzzleSize / 5)
  
  // 在主画布上绘制拼图缺口（暗色阴影）
  ctx.save()
  drawPuzzlePath(ctx, puzzleX.value, puzzleY, puzzleSize, r)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fill()
  ctx.restore()
  
  // 绘制缺口边框，使其更明显
  ctx.save()
  drawPuzzlePath(ctx, puzzleX.value, puzzleY, puzzleSize, r)
  ctx.strokeStyle = 'var(--ink)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
  
  // 复制背景到拼图块
  const imageData = ctx.getImageData(0, 0, width, height)
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = width
  tempCanvas.height = height
  const tempCtx = tempCanvas.getContext('2d')
  tempCtx.fillStyle = 'var(--primary-3)'
  tempCtx.fillRect(0, 0, width, height)
  
  tempCtx.fillStyle = 'rgba(184,68,97,0.16)'
  for (let i = 0; i < 20; i++) {
    tempCtx.beginPath()
    tempCtx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 30 + 10,
      0,
      Math.PI * 2
    )
    tempCtx.fill()
  }
  
  // 绘制拼图块到单独的canvas - 只绘制拼图块部分
  blockCtx.clearRect(0, 0, width, height)
  
  // 创建拼图路径并裁剪
  blockCtx.save()
  // 在0位置绘制（因为这个canvas会通过CSS移动）
  drawPuzzlePath(blockCtx, 0, puzzleY, puzzleSize, r)
  blockCtx.clip()
  
  // 绘制对应的图片部分
  blockCtx.drawImage(
    tempCanvas,
    puzzleX.value, 0,  // 从puzzleX位置截取
    puzzleSize + 20, height,  // 截取的大小
    0, 0,  // 绘制到canvas的0位置
    puzzleSize + 20, height
  )
  blockCtx.restore()
  
  // 添加拼图块边框
  blockCtx.save()
  drawPuzzlePath(blockCtx, 0, puzzleY, puzzleSize, r)
  blockCtx.strokeStyle = 'var(--card)'
  blockCtx.lineWidth = 3
  blockCtx.stroke()
  blockCtx.restore()
}

// 绘制拼图路径
const drawPuzzlePath = (ctx, x, y, size, r) => {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size / 2 - r, y)
  ctx.arc(x + size / 2, y, r, Math.PI, 0, false)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x + size, y + size / 2 - r)
  ctx.arc(x + size, y + size / 2, r, -Math.PI / 2, Math.PI / 2, false)
  ctx.lineTo(x + size, y + size)
  ctx.lineTo(x + size / 2 + r, y + size)
  ctx.arc(x + size / 2, y + size, r, 0, Math.PI, true)
  ctx.lineTo(x, y + size)
  ctx.closePath()
}

// 拖拽开始
const handleDragStart = (e) => {
  if (verified.value || failed.value) return
  isDragging.value = true
  failed.value = false
}

// 拖拽中
const handleDrag = (e) => {
  if (!isDragging.value) return
  
  e.preventDefault()
  
  const event = e.touches ? e.touches[0] : e
  const container = document.querySelector('.slider-container')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const buttonWidth = 45 // 滑块按钮宽度
  let x = event.clientX - rect.left - (buttonWidth / 2)
  
  if (x < 0) x = 0
  if (x > rect.width - buttonWidth) x = rect.width - buttonWidth
  
  sliderX.value = x
  blockX.value = x
}

// 拖拽结束
const handleDragEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  // 验证位置
  const canvas = canvasRef.value
  const puzzleContainer = canvas?.parentElement
  
  if (!canvas || !puzzleContainer) {
    failed.value = true
    setTimeout(reset, 1000)
    return
  }
  
  // 获取canvas实际宽度和容器显示宽度
  const canvasWidth = canvas.width  // canvas实际像素宽度
  const containerWidth = puzzleContainer.clientWidth  // 容器显示宽度
  
  // 拼图在容器坐标系中的位置（考虑缩放）
  const puzzleDisplayX = (puzzleX.value / canvasWidth) * containerWidth
  
  // blockX是滑块移动的距离（容器坐标系）
  const tolerance = 10 // 容差（像素）
  
  if (Math.abs(blockX.value - puzzleDisplayX) < tolerance) {
    verified.value = true
    setTimeout(() => {
      emit('success')
      handleClose()
    }, 1000)
  } else {
    failed.value = true
    setTimeout(reset, 1000)
  }
}

// 重置
const reset = () => {
  sliderX.value = 0
  blockX.value = 0
  verified.value = false
  failed.value = false
  setTimeout(() => {
    initSlider()
  }, 100)
}

// 刷新
const refresh = () => {
  reset()
}

// 关闭
const handleClose = () => {
  if (!verified.value) {
    reset()
  }
  emit('close')
}

// 初始化拼图验证
const initPuzzle = async () => {
  await nextTick()
  
  if (!puzzleCanvasRef.value) return

  const canvas = puzzleCanvasRef.value
  const ctx = canvas.getContext('2d')
  
  canvas.width = 300
  canvas.height = 300

  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = `https://picsum.photos/300/300?random=${Math.random()}`
  
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    
    // 生成拼图块
    createPuzzlePieces(canvas, img)
  }
}

// 创建拼图块
const createPuzzlePieces = (canvas, img) => {
  const pieceSize = 100
  const cols = 3
  const rows = 3
  const pieces = []
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = row * cols + col
      pieces.push({
        id: index,
        correctX: col * pieceSize,
        correctY: row * pieceSize,
        currentX: Math.random() * 200,
        currentY: 300 + Math.random() * 50,
        placed: false,
        correct: false,
        style: computed(() => ({
          left: `${pieces[index]?.currentX || 0}px`,
          top: `${pieces[index]?.currentY || 0}px`,
          width: `${pieceSize}px`,
          height: `${pieceSize}px`
        }))
      })
    }
  }
  
  // 打乱顺序
  pieces.sort(() => Math.random() - 0.5)
  puzzlePieces.value = pieces
  
  // 绘制每个拼图块
  nextTick(() => {
    pieces.forEach((piece, index) => {
      const pieceCanvas = document.querySelectorAll('.puzzle-piece canvas')[index]
      if (pieceCanvas) {
        const ctx = pieceCanvas.getContext('2d')
        pieceCanvas.width = pieceSize
        pieceCanvas.height = pieceSize
        
        const row = Math.floor(piece.id / cols)
        const col = piece.id % cols
        
        ctx.drawImage(
          img,
          col * pieceSize, row * pieceSize, pieceSize, pieceSize,
          0, 0, pieceSize, pieceSize
        )
      }
    })
  })
}

const setPieceCanvas = (el, index) => {
  // Canvas ref 设置
}

const startDragPiece = (e, index) => {
  // 拼图块拖拽逻辑 (简化版,完整实现较复杂)
  currentPiece.value = index
}

// 监听visible变化，重新初始化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      if (props.type === 'slider') {
        initSlider()
      } else {
        initPuzzle()
      }
    }, 100)
  }
})

// 生命周期
onMounted(() => {
  if (props.visible) {
    if (props.type === 'slider') {
      initSlider()
    } else {
      initPuzzle()
    }
  }
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', handleDragEnd)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', handleDragEnd)
})
</script>

<style scoped>
.captcha-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--panel-deep) 68%, transparent);
  animation: fadeIn 0.2s var(--fish-ease) both;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.captcha-box {
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 6px;
  box-shadow: var(--shadow-soft);
  animation: slideUp 0.26s var(--fish-ease) both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.captcha-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}

.captcha-header h3 {
  margin: 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--on-panel);
}

.captcha-content {
  padding: 18px 20px;
}

/* 拼图台 */
.slider-captcha,
.puzzle-captcha {
  width: 100%;
}

.puzzle-container {
  position: relative;
  margin-bottom: 12px;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--cream-2);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.background-canvas {
  display: block;
  width: 100%;
  height: auto;
  background: var(--cream-2);
}

.block-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: auto;
  pointer-events: none;
}

/* 提示 */
.slider-tip {
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--cream-1);
  border: 1px solid var(--line);
  border-radius: 3px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.slider-tip .tip-success { color: var(--success); }
.slider-tip .tip-failed { color: var(--danger); }

/* 滑块 */
.slider-container {
  position: relative;
  height: 44px;
  line-height: 44px;
  text-align: center;
  background: var(--cream-1);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  user-select: none;
  overflow: visible;
  z-index: 1;
}

.slider-container.success {
  background: var(--success-bg);
  border-color: var(--success);
  color: var(--success);
}

.slider-container.failed {
  background: var(--danger-bg);
  border-color: var(--danger);
  color: var(--danger);
}

.slider-mask {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--primary-3);
  border-radius: 999px;
  color: var(--primary-2);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
  transition: width 0.2s linear;
}

.slider-button {
  position: absolute;
  top: -2px;
  left: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border: 1px solid var(--line);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
  cursor: grab;
  z-index: 10;
}

.slider-button:active { cursor: grabbing; }

.slider-button .arrow {
  color: var(--on-primary);
  font-size: 18px;
  font-style: normal;
  font-weight: 700;
}

/* 拼图块 */
.puzzle-pieces {
  position: absolute;
  inset: 0;
}

.puzzle-piece {
  position: absolute;
  cursor: grab;
  border: 1px solid transparent;
  border-radius: 10px;
  overflow: hidden;
}

.puzzle-piece:hover { border-color: var(--primary); }

.puzzle-piece.placed {
  border-color: var(--success);
}

.puzzle-piece canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.puzzle-status {
  margin-top: 10px;
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}

.puzzle-status .success { color: var(--success); }
.puzzle-status .failed { color: var(--danger); }

.captcha-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 38px;
  padding: 7px 18px;
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 3px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.refresh-btn:hover {
  border-color: var(--edge);
  color: var(--ink);
}

.refresh-btn :deep(svg) {
  width: 14px;
  height: 14px;
}

@media (max-width: 480px) {
  .captcha-modal { padding: 12px; }
  .captcha-header { padding: 14px 16px; }
  .captcha-content { padding: 14px 16px; }
}
</style>
