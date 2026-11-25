/**
 * 展示价格：整数不补 .00，小数最多保留两位且去掉无意义的结尾 0。
 */
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return ''
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}
