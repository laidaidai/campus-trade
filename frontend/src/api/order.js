import api from './request'

/**
 * 创建订单
 */
export const createOrder = (data) => {
  return api.post('/orders', data)
}

/**
 * 获取订单详情
 */
export const getOrderById = (orderId) => {
  return api.get(`/orders/${orderId}`)
}

/**
 * 获取我的订单列表
 * @param {string} role - 'buyer' 或 'seller'
 */
export const getMyOrders = (role = 'buyer') => {
  return api.get('/orders/my', { params: { role } })
}

/**
 * 更新订单状态
 */
export const updateOrderStatus = (orderId, status) => {
  return api.patch(`/orders/${orderId}/status`, { status })
}

/**
 * 取消订单
 */
export const cancelOrder = (orderId) => {
  return api.patch(`/orders/${orderId}/cancel`)
}

/**
 * 完成后评价对方
 */
export const createReview = (orderId, data) => {
  return api.post(`/orders/${orderId}/review`, data)
}

