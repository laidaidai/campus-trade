<template>
  <div class="waterfall-container">
    <div 
      class="waterfall-column" 
      v-for="(column, index) in columns" 
      :key="index"
    >
      <div 
        class="waterfall-item" 
        v-for="item in column" 
        :key="item.id"
      >
        <slot :item="item"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  columnCount: {
    type: Number,
    default: 5
  },
  gap: {
    type: Number,
    default: 20
  }
})

const columns = ref([])
const columnHeights = ref([])

// 初始化列
const initColumns = () => {
  columns.value = Array.from({ length: props.columnCount }, () => [])
  columnHeights.value = Array(props.columnCount).fill(0)
}

// 分配items到各列
const distributeItems = () => {
  initColumns()
  
  props.items.forEach(item => {
    // 找到最短的列
    const minHeight = Math.min(...columnHeights.value)
    const minIndex = columnHeights.value.indexOf(minHeight)
    
    // 将item添加到最短的列
    columns.value[minIndex].push(item)
    
    // 更新列高度（估算）
    // 图片高度 + 信息区域高度 + gap
    const estimatedHeight = 200 + 120 + props.gap
    columnHeights.value[minIndex] += estimatedHeight
  })
}

// 响应式列数调整
const updateColumnCount = () => {
  const width = window.innerWidth
  let newColumnCount = props.columnCount
  
  if (width < 640) {
    newColumnCount = 2
  } else if (width < 768) {
    newColumnCount = 3
  } else if (width < 1024) {
    newColumnCount = 4
  } else if (width < 1280) {
    newColumnCount = 5
  } else {
    newColumnCount = 6
  }
  
  // 如果列数改变，重新分配
  if (newColumnCount !== columns.value.length) {
    const tempColumnCount = props.columnCount
    props.columnCount = newColumnCount
    distributeItems()
  }
}

// 监听items变化
watch(() => props.items, () => {
  distributeItems()
}, { deep: true, immediate: true })

// 响应式处理
let resizeTimer = null
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    distributeItems()
  }, 200)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.waterfall-container {
  display: flex;
  gap: v-bind("`${gap}px`");
  align-items: flex-start;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: v-bind("`${gap}px`");
}

.waterfall-item {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* 响应式调整 */
@media (max-width: 1280px) {
  .waterfall-container {
    gap: 16px;
  }
  
  .waterfall-column {
    gap: 16px;
  }
}

@media (max-width: 767px) {
  .waterfall-container {
    gap: 12px;
  }
  
  .waterfall-column {
    gap: 12px;
  }
}
</style>
