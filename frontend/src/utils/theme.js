// Fish UI 主题表：id 对应 theme.css 里的 html[data-theme]
export const THEMES = [
  { id: 'tomato', name: '红黄汽水', bg: '#FFF4E4', primary: '#F2603C', ink: '#3D1F18' },
  { id: 'cream', name: '蜂蜜奶霜', bg: '#FBF3DF', primary: '#FFC94D', ink: '#4B3A2A' },
  { id: 'rose', name: '蜜桃雪酪', bg: '#FFF1F3', primary: '#FF9FB6', ink: '#4A2A31' },
  { id: 'sky', name: '晴空苏打', bg: '#EFF6FE', primary: '#5EB0E8', ink: '#1E3A52' },
  { id: 'sketch', name: '铅笔手绘', bg: '#F5F0E6', primary: '#7FA3BD', ink: '#3B3832' },
  { id: 'mint', name: '薄荷青瓷', bg: '#EAF6F2', primary: '#6ACFB4', ink: '#17403A' },
  { id: 'obsidian', name: '曜石鎏金', bg: '#12100C', primary: '#E7C066', ink: '#F0E2C0' }
]

const STORAGE_KEY = 'campus-trade-theme'
const DEFAULT_THEME = 'tomato'

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return THEMES.some((t) => t.id === saved) ? saved : DEFAULT_THEME
  } catch (e) {
    return DEFAULT_THEME
  }
}

export function applyTheme(id) {
  const theme = THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch (e) {
    /* 隐私模式下忽略 */
  }
  return theme
}

export function initTheme() {
  const theme = getSavedTheme()
  document.documentElement.dataset.theme = theme
  return theme
}
