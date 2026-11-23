import { getImageUrl } from '../config'

const INK = '#2b1d16'

const PALETTES = [
  { bg: '#fff1df', accent: '#ff6b4a', shirt: '#ff6b4a', hair: '#2b1d16', skin: '#f3c6a5' },
  { bg: '#e8f3ec', accent: '#7e9e62', shirt: '#7e9e62', hair: '#563a2b', skin: '#eab894' },
  { bg: '#e7effa', accent: '#6f93b8', shirt: '#6f93b8', hair: '#2b1d16', skin: '#f6d0b2' },
  { bg: '#f7e9ef', accent: '#d77b8d', shirt: '#d77b8d', hair: '#4a2c25', skin: '#efc09d' },
  { bg: '#fff0c9', accent: '#e6973f', shirt: '#e6973f', hair: '#2b1d16', skin: '#e8b58c' },
  { bg: '#efe9f6', accent: '#8b78b8', shirt: '#8b78b8', hair: '#3b2635', skin: '#f2c6a8' }
]

const HAIR_COLORS = ['#2b1d16', '#4a2c25', '#6b4430', '#3b2635', '#7b3f2e']
const SKIN_COLORS = ['#f6d0b2', '#efc09d', '#e8b58c', '#d99c78']

function hashString(value) {
  let hash = 0
  const text = String(value || '用户')
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return Math.abs(hash)
}

function hairStyle(style, color) {
  if (style === 0) {
    return `
      <path d="M24 49 C20 31 32 14 49 14 C67 14 77 27 72 51 C69 45 66 42 64 37 C60 27 52 24 45 25 C37 26 32 32 31 44 Z" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M29 42 C30 30 36 24 45 22" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".35"/>
    `
  }
  if (style === 1) {
    return `
      <path d="M25 47 C22 31 33 16 49 16 C66 16 75 28 71 47 C68 39 62 33 54 31 C48 38 40 42 31 43 Z" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M35 27 C43 22 54 22 61 26" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".35"/>
      <path d="M30 43 C27 50 27 58 29 64" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M70 43 C73 50 73 57 71 63" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
    `
  }
  return `
    <circle cx="48" cy="15" r="9" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M25 48 C23 32 33 19 49 19 C65 19 74 29 71 48 C66 38 58 33 49 32 C40 32 33 38 29 47 Z" fill="${color}" stroke="${INK}" stroke-width="2.2"/>
    <path d="M30 40 C32 31 38 25 46 23" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".35"/>
  `
}

function accessory(kind, palette) {
  if (kind === 1) {
    return `
      <g fill="none" stroke="${INK}" stroke-width="1.8">
        <circle cx="39" cy="51" r="7.5"/>
        <circle cx="58" cy="51" r="7.5"/>
        <path d="M46.5 51 L50.5 51"/>
        <path d="M31.5 49 L27 47"/>
        <path d="M65.5 49 L70 47"/>
      </g>
    `
  }
  if (kind === 2) {
    return `
      <g>
        <path d="M29 34 l6 -3 l4 5 l-6 4 z" fill="${palette.accent}" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="32" cy="35" r="1.4" fill="${INK}"/>
      </g>
    `
  }
  if (kind === 3) {
    return `
      <g>
        <path d="M72 46 q5 -1 6 4 q1 5 -4 6" fill="${palette.accent}" stroke="${INK}" stroke-width="1.4"/>
        <circle cx="72" cy="44" r="1.5" fill="${INK}"/>
      </g>
    `
  }
  return ''
}

function expression(kind) {
  if (kind === 1) {
    return `<path d="M45 62 Q50 64 55 62" fill="none" stroke="${INK}" stroke-width="1.7"/>`
  }
  if (kind === 2) {
    return `
      <path d="M43 59 Q50 68 57 59 Q50 63 43 59 Z" fill="${INK}" opacity=".9"/>
      <path d="M47 64 Q50 66 53 64" fill="none" stroke="#ff8f7a" stroke-width="1.4"/>
    `
  }
  return `<path d="M44 60 Q50 65 56 60" fill="none" stroke="${INK}" stroke-width="1.8"/>`
}

/**
 * 根据用户名生成稳定的纸雕风头像，颜色和发型在同一用户名下不会变化。
 * 返回 data URI，可直接用于 <img src>。
 */
export function generateAvatar(name) {
  const hash = hashString(name)
  const palette = PALETTES[hash % PALETTES.length]
  const hair = hairStyle((hash >> 2) % 3, HAIR_COLORS[(hash >> 4) % HAIR_COLORS.length])
  const skin = SKIN_COLORS[(hash >> 6) % SKIN_COLORS.length]
  const accessoryMarkup = accessory((hash >> 8) % 4, palette)
  const mouth = expression((hash >> 11) % 3)
  const blush = (hash >> 13) % 2 === 0

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <rect width="96" height="96" fill="${palette.bg}"/>
      <g opacity=".33" fill="${palette.accent}">
        <circle cx="16" cy="20" r="2.2"/>
        <circle cx="82" cy="24" r="1.5"/>
        <path d="M12 74 q4 -3 8 0" fill="none" stroke="${palette.accent}" stroke-width="1.4"/>
        <path d="M77 78 q4 -3 8 0" fill="none" stroke="${palette.accent}" stroke-width="1.4"/>
      </g>
      <g>
        <path d="M26 88 Q28 74 48 73 Q68 74 70 88 Z" fill="${palette.shirt}" stroke="${INK}" stroke-width="2.2"/>
        <path d="M35 75 L48 82 L61 75" fill="none" stroke="${INK}" stroke-width="1.6"/>
        <path d="M42 72 L42 78 M54 72 L54 78" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>
        <path d="M25 51 Q25 73 48 74 Q71 73 71 51 Q69 36 59 26 Q53 21 48 21 Q43 21 37 26 Q27 36 25 51 Z" fill="${skin}" stroke="${INK}" stroke-width="2.2"/>
        <circle cx="24" cy="49" r="4" fill="${skin}" stroke="${INK}" stroke-width="1.8"/>
        <circle cx="72" cy="49" r="4" fill="${skin}" stroke="${INK}" stroke-width="1.8"/>
        ${hair}
        <path d="M38 35 q2 -2 4 0 M55 35 q2 -2 4 0" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".7"/>
        <circle cx="40" cy="46" r="2.3" fill="${INK}"/>
        <circle cx="58" cy="46" r="2.3" fill="${INK}"/>
        <circle cx="40.8" cy="45.3" r=".8" fill="#fff"/>
        <circle cx="58.8" cy="45.3" r=".8" fill="#fff"/>
        <path d="M48 50 q-1 4 0 5" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".55"/>
        ${blush ? `<ellipse cx="34" cy="55" rx="5" ry="2.6" fill="${palette.accent}" opacity=".2"/><ellipse cx="64" cy="55" rx="5" ry="2.6" fill="${palette.accent}" opacity=".2"/>` : ''}
        ${mouth}
        ${accessoryMarkup}
      </g>
    </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/**
 * 有真实头像时优先使用；没有则生成稳定的本地头像，不依赖外部头像服务。
 */
export function resolveAvatar(avatar, name) {
  if (avatar) {
    const url = getImageUrl(avatar)
    if (url) return url
  }
  return generateAvatar(name)
}
