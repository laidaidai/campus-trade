<template>
  <div class="messages-container" :class="{ 'mobile': isMobile, 'chat-open': isMobile && currentConversation }">
    <!-- 左侧会话列表 -->
    <div class="conversations-sidebar" :class="{ 'hidden': isMobile && currentConversation }">
      <div class="sidebar-header">
        <h2>消息</h2>
        <div v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</div>
      </div>
      
      <div class="conversations-list" :class="{ 'is-empty': conversations.length === 0 }">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: currentConversation?.id === conv.id }"
          @click="selectConversation(conv)"
        >
          <div class="avatar">
            <img :src="getAvatarUrl(conv.other_user_avatar, conv.other_user_name)" :alt="conv.other_user_name" />
          </div>
          <div class="conversation-info">
            <div class="top-row">
              <div class="user-name">{{ conv.other_user_name }}</div>
              <div class="time">{{ formatTime(conv.last_message_time) }}</div>
            </div>
            <div class="bottom-row">
              <div class="last-message">{{ formatLastMessage(conv) }}</div>
              <div v-if="getUnreadCountForConv(conv) > 0" class="unread-count">
                {{ getUnreadCountForConv(conv) }}
              </div>
            </div>
            <div class="product-info">
              <img v-if="conv.product_image" :src="getImageUrl(conv.product_image)" alt="" class="product-thumb" />
              <span class="product-title">{{ conv.product_title }}</span>
            </div>
          </div>
          <button 
            class="delete-conversation-btn" 
            @click.stop="handleDeleteConversation(conv)"
            title="删除会话"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
        
        <div v-if="conversations.length === 0" class="empty-state">
          <div class="empty-list-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <p>暂无消息</p>
          <span class="empty-caption">收到买卖咨询后，会话会出现在这里</span>
          <button type="button" class="btn btn-primary empty-action" @click="$router.push('/')">去逛逛</button>
        </div>
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div class="chat-area" :class="{ 'show': isMobile && currentConversation }">
      <div v-if="!currentConversation" class="empty-chat">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <p>{{ conversations.length ? '从左侧选择一个会话' : '还没有会话' }}</p>
        <span v-if="!conversations.length" class="empty-caption">找到心仪的商品后，点击“我想要”和卖家聊聊</span>
        <button v-if="!conversations.length" type="button" class="btn btn-primary empty-action" @click="$router.push('/')">去逛逛</button>
      </div>

      <template v-else>
        <!-- 聊天头部 -->
        <div class="chat-header">
          <!-- 移动端返回按钮 -->
          <button v-if="isMobile" @click="backToList" class="btn-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="user-info">
            <img :src="getAvatarUrl(currentConversation.other_user_avatar, currentConversation.other_user_name)" alt="" class="avatar" />
            <div class="info">
              <div class="name">{{ currentConversation.other_user_name }}</div>
              <div class="product-name">
                关于: {{ currentConversation.product_title }}
              </div>
            </div>
          </div>
          <div class="header-actions">
            <button @click="viewProduct" class="btn-link">查看商品</button>
          </div>
        </div>

        <!-- 消息列表 -->
        <div ref="messagesContainer" class="messages-list">
          <div v-if="isLoadingMessages" class="loading">加载中...</div>
          
          <div
            v-for="(message, index) in messages"
            :key="message.id"
            class="message-item"
            :class="{ 'is-mine': message.sender_id === currentUserId }"
          >
            <!-- 文本消息 -->
            <template v-if="message.type === 'text'">
              <div class="message-avatar">
                <img :src="getAvatarUrl(message.sender_avatar, message.sender_name)" alt="" />
              </div>
              <div class="message-content">
                <div class="message-bubble">
                  {{ message.content }}
                </div>
                <div class="message-footer">
                  <div class="message-time">{{ formatMessageTime(message.created_at) }}</div>
                  <div v-if="message.sender_id === currentUserId" class="read-status">
                    <span v-if="message.is_read" class="read">已读</span>
                    <span v-else class="unread">未读</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- 订单消息 -->
            <OrderMessage
              v-else-if="message.type === 'order'"
              :order-data="JSON.parse(message.content)"
              :is-mine="message.sender_id === currentUserId"
              :is-seller="isSeller"
              :is-latest-order="isLatestOrder(message, index)"
              @modify-price="handleModifyPrice"
              @confirm="handleSellerConfirm"
              @cancel="handleCancelOrder"
              @buyer-confirm="handleBuyerConfirm"
              @view-order="handleViewOrder"
            />
          </div>

          <div v-if="isTyping" class="typing-indicator">
            {{ currentConversation.other_user_name }} 正在输入...
          </div>
        </div>

        <!-- 输入框 -->
        <div class="chat-input-area">
          <!-- 发起订单按钮 (只有买家且商品在售) -->
          <div v-if="currentConversation && !isSeller" class="order-button-wrapper">
            <button 
               class="create-order-btn"
               :disabled="currentConversation.product_status === 'sold'"
               @click="handleCreateOrderClick"
            >
               {{ currentConversation.product_status === 'sold' ? '已售出，无法下单' : '发起订单' }}
            </button>
          </div>
          <div class="input-wrapper">
            <textarea
              v-model="messageInput"
              placeholder="输入消息..."
              @keydown.enter.exact="handleSendMessage"
              @input="handleTyping"
              rows="3"
            ></textarea>
            <button @click="handleSendMessage" class="btn-send" :disabled="!messageInput.trim()">
              发送
            </button>
          </div>
        </div>
      </template>
    </div>
    
    <!-- 撤回提示 -->
    <UndoToast 
      ref="undoToastRef" 
      :message="undoMessage"
      @undo="handleUndoDelete"
    />

    <!-- 发起订单对话框 -->
    <CreateOrderDialog
      :visible="showCreateOrderDialog"
      :product="{
        title: currentConversation?.product_title,
        price: currentConversation?.product_price,
        image: currentConversation?.product_image ? getImageUrl(currentConversation.product_image) : ''
      }"
      @close="showCreateOrderDialog = false"
      @submit="handleCreateOrder"
    />

    <!-- 修改价格对话框 -->
    <ModifyPriceDialog
      :visible="showModifyPriceDialog"
      :order-data="currentOrderData"
      @close="showModifyPriceDialog = false"
      @submit="handlePriceModified"
    />

    <!-- 订单详情对话框 -->
    <OrderDetailDialog
      v-if="selectedOrderDetail"
      :visible="showOrderDetailDialog"
      :order="selectedOrderDetail"
      @close="showOrderDetailDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import socketService from '../utils/socket';
import * as messageApi from '../api/message';
import UndoToast from '../components/UndoToast.vue';
import toast from '../utils/toast';
import OrderMessage from '../components/OrderMessage.vue';
import CreateOrderDialog from '../components/CreateOrderDialog.vue';
import ModifyPriceDialog from '../components/ModifyPriceDialog.vue';
import OrderDetailDialog from '../components/OrderDetailDialog.vue';
import { createOrder, getOrderById } from '../api/order';
import { getImageUrl } from '../config';
import { resolveAvatar } from '../utils/avatar';

const router = useRouter();
const userStore = useUserStore();

// 获取头像URL，带智能回退
const getAvatarUrl = (avatar, username) => resolveAvatar(avatar, username);

// 数据
const conversations = ref([]);
const currentConversation = ref(null);
const messages = ref([]);

// 用户验证状态
const isUserValid = ref(false);
const messageInput = ref('');
const isLoadingMessages = ref(false);
const isTyping = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref(null);
const isMobile = ref(false);
const undoToastRef = ref(null);
const undoMessage = ref('');
const deletedConversation = ref(null);
let deleteTimer = null;

// 订单相关状态
const showCreateOrderDialog = ref(false);
const showModifyPriceDialog = ref(false);
const currentOrderData = ref(null);
const showOrderDetailDialog = ref(false);
const selectedOrderDetail = ref(null);

let typingTimeout = null;

// 检测是否为移动端（包括iPad竖屏）
const checkMobile = () => {
  const width = window.innerWidth;
  const isPortrait = window.matchMedia('(orientation: portrait)').matches;
  
  // 768px以下，或者1024px以下且竖屏（iPad竖屏）
  isMobile.value = width <= 768 || (width <= 1024 && isPortrait);
};

// 移动端返回到会话列表
const backToList = () => {
  currentConversation.value = null;
};

const currentUserId = computed(() => {
  const userId = userStore.userInfo?.id;
  return userId;
});

// 判断当前用户是否是卖家
const isSeller = computed(() => {
  return currentConversation.value?.seller_id === currentUserId.value;
});

// 判断是否是最新的订单消息
const isLatestOrder = (message, currentIndex) => {
  if (message.type !== 'order') return true;
  
  try {
    const currentOrderData = JSON.parse(message.content);
    const productId = currentOrderData.product_id;
    
    // 检查后面是否还有相同商品的订单消息
    for (let i = currentIndex + 1; i < messages.value.length; i++) {
      const laterMessage = messages.value[i];
      if (laterMessage.type === 'order') {
        try {
          const laterOrderData = JSON.parse(laterMessage.content);
          if (laterOrderData.product_id === productId) {
            // 有更新的订单消息
            return false;
          }
        } catch (e) {
          // 解析失败，忽略
        }
      }
    }
    
    return true;
  } catch (e) {
    return true;
  }
};

// 加载会话列表
const loadConversations = async () => {
  try {
    const res = await messageApi.getUserConversations();
    conversations.value = res.conversations || [];
  } catch (error) {
    console.error('Failed to load conversations:', error);
  }
};

// 选择会话
const selectConversation = async (conv) => {
  // 防止重复点击
  if (currentConversation.value?.id === conv.id) {
    return;
  }
  
  try {
    currentConversation.value = conv;
    await loadMessages(conv.id);
    
    // 标记为已读
    await messageApi.markMessagesAsRead(conv.id);
    if (socketService.isConnected) {
      socketService.markAsRead(conv.id);
    }
    
    // 更新会话列表中的未读数
    const index = conversations.value.findIndex(c => c.id === conv.id);
    if (index > -1) {
      const isBuyer = conversations.value[index].buyer_id === currentUserId.value;
      if (isBuyer) {
        conversations.value[index].buyer_unread_count = 0;
      } else {
        conversations.value[index].seller_unread_count = 0;
      }
    }
  } catch (error) {
    console.error('选择会话失败:', error);
    toast.error('加载会话失败，请重试');
  }
};

// 加载消息历史
const loadMessages = async (conversationId) => {
  isLoadingMessages.value = true;
  try {
    const res = await messageApi.getConversationMessages(conversationId);
    messages.value = res.messages || [];
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('Failed to load messages:', error);
  } finally {
    isLoadingMessages.value = false;
  }
};

// 发送消息
const handleSendMessage = async () => {
  if (!messageInput.value.trim() || !currentConversation.value) {
    return;
  }

  const content = messageInput.value.trim();
  messageInput.value = '';

  try {
    // 优先使用WebSocket发送
    if (socketService.isConnected) {
      socketService.sendMessage({
        conversationId: currentConversation.value.id,
        receiverId: currentConversation.value.other_user_id,
        content,
        type: 'text'
      });

      // 停止输入状态
      socketService.stopTyping(
        currentConversation.value.id,
        currentConversation.value.other_user_id
      );
    } else {
      // WebSocket未连接，使用HTTP API
      const response = await messageApi.sendMessage({
        conversation_id: currentConversation.value.id,
        receiver_id: currentConversation.value.other_user_id,
        content,
        type: 'text'
      });

      // 手动添加到消息列表
      if (response.message) {
        messages.value.push(response.message);
        nextTick(() => scrollToBottom());
      }

      // 更新会话列表
      loadConversations();
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    toast.error('发送消息失败');
    // 恢复输入内容
    messageInput.value = content;
  }
};

// 处理正在输入
const handleTyping = () => {
  if (!currentConversation.value) return;

  socketService.typing(
    currentConversation.value.id,
    currentConversation.value.other_user_id
  );

  // 3秒后自动停止输入状态
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socketService.stopTyping(
      currentConversation.value.id,
      currentConversation.value.other_user_id
    );
  }, 3000);
};

// 查看商品
const viewProduct = () => {
  if (currentConversation.value?.product_id) {
    router.push(`/product/${currentConversation.value.product_id}`);
  }
};

// 处理发起订单按钮点击
const handleCreateOrderClick = () => {
  if (currentConversation.value?.product_status !== 'sold') {
    showCreateOrderDialog.value = true;
  }
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 获取会话未读数
const getUnreadCountForConv = (conv) => {
  const isBuyer = conv.buyer_id === currentUserId.value;
  return isBuyer ? conv.buyer_unread_count : conv.seller_unread_count;
};

// 格式化时间
const formatTime = (time) => {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
};

// 格式化最后一条消息显示
const formatLastMessage = (conv) => {
  if (!conv.last_message) return '暂无消息';
  
  // 尝试解析JSON（订单消息）
  try {
    const orderData = JSON.parse(conv.last_message);
    if (orderData.product_id && orderData.status) {
      // 这是订单消息
      const statusMap = {
        'pending': '您有一个待确认的订单',
        'modified': '订单价格已修改',
        'confirmed': '订单已确认',
        'rejected': '订单已取消'
      };
      return statusMap[orderData.status] || '订单消息';
    }
  } catch (e) {
    // 不是JSON，正常文本消息
  }
  
  return conv.last_message;
};

const formatMessageTime = (time) => {
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 加载未读数
const loadUnreadCount = async () => {
  try {
    const res = await messageApi.getUnreadCount();
    unreadCount.value = res.count || 0;
  } catch (error) {
    console.error('Failed to load unread count:', error);
  }
};

// 删除会话
const handleDeleteConversation = async (conv) => {
  try {
    // 先从UI移除，提供撤回入口
    deletedConversation.value = { ...conv };
    conversations.value = conversations.value.filter(c => c.id !== conv.id);

    if (currentConversation.value?.id === conv.id) {
      currentConversation.value = null;
      messages.value = [];
    }

    // 显示撤回提示
    undoMessage.value = `已删除与 ${conv.other_user_name} 的会话`;
    undoToastRef.value?.show();

    // 清理已有计时器
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }

    // 延迟真正删除（4秒可撤回）
    deleteTimer = setTimeout(async () => {
      try {
        if (deletedConversation.value && deletedConversation.value.id === conv.id) {
          await messageApi.deleteConversation(conv.id);
          deletedConversation.value = null;
          await loadUnreadCount();
        }
      } catch (err) {
        console.error('延迟删除会话失败:', err);
      } finally {
        deleteTimer = null;
      }
    }, 4000);
  } catch (error) {
    console.error('删除会话失败:', error);
    toast.error('删除会话失败');
  }
};

// 撤回删除会话
const handleUndoDelete = () => {
  if (!deletedConversation.value) return;

  try {
    // 取消定时删除
    if (deleteTimer) {
      clearTimeout(deleteTimer);
      deleteTimer = null;
    }

    // 恢复到列表
    conversations.value.push(deletedConversation.value);
    conversations.value.sort((a, b) => 
      new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0)
    );

    deletedConversation.value = null;
    toast.success('已撤回删除');
  } catch (error) {
    console.error('撤回失败:', error);
    deletedConversation.value = null;
    toast.error('撤回失败');
  }
};

// Socket 事件处理
const handleNewMessage = (data) => {
  const { conversationId, message } = data;
  
  
  
  // 如果是当前会话的消息
  if (currentConversation.value?.id === conversationId) {
    // 检查是否已经存在（避免重复）
    const exists = messages.value.some(m => 
      m.id === message.id || 
      (m.content === message.content && m.created_at === message.created_at)
    );
    
    if (!exists) {
      messages.value.push(message);
      nextTick(() => scrollToBottom());
    }
    
    // 如果是对方发来的消息，自动标记为已读
    if (message.sender_id !== currentUserId.value) {
      messageApi.markMessagesAsRead(conversationId);
      socketService.markAsRead(conversationId);
    }
  } else if (message.sender_id !== currentUserId.value) {
    // 只有对方发来的消息才更新会话列表（避免重复更新）
    loadConversations();
  }
  
  // 更新未读数（只有对方发来的消息才更新）
  if (message.sender_id !== currentUserId.value) {
    loadUnreadCount();
  }
};

const handleMessageSent = (data) => {
  const { conversationId, message } = data;
  
  
  
  // 添加到当前会话的消息列表
  if (currentConversation.value?.id === conversationId) {
    messages.value.push(message);
    nextTick(() => scrollToBottom());
  }
  
  // 更新会话列表
  loadConversations();
};

const handleUnreadCountUpdated = (data) => {
  unreadCount.value = data.count;
};

const handleUserTyping = (data) => {
  if (currentConversation.value?.id === data.conversationId) {
    isTyping.value = true;
  }
};

const handleUserStopTyping = (data) => {
  if (currentConversation.value?.id === data.conversationId) {
    isTyping.value = false;
  }
};

const handleMessagesRead = (data) => {
  const { conversationId } = data;
  
  
  
  // 如果是当前会话,更新消息的已读状态
  if (currentConversation.value?.id === conversationId) {
    messages.value.forEach(msg => {
      if (msg.sender_id === currentUserId.value) {
        msg.is_read = true;
      }
    });
  }
  
  // 重新加载会话列表以更新未读数（实时刷新）
  loadConversations();
};

// 生命周期
onMounted(async () => {
  // 验证用户状态
  const validation = await userStore.validateUser();
  if (!validation.success) {
    console.log('消息页面用户验证失败:', validation.error);
    userStore.logout();
    router.push('/');
    return;
  }
  
  isUserValid.value = true;
  
  // 检测移动端
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  // 连接 WebSocket
  const token = localStorage.getItem('token');
  if (token) {
    socketService.connect(token);
  }

  
  // 注册事件监听
  socketService.on('new_message', handleNewMessage);
  socketService.on('message_sent', handleMessageSent);
  socketService.on('unread_count_updated', handleUnreadCountUpdated);
  socketService.on('user_typing', handleUserTyping);
  socketService.on('user_stop_typing', handleUserStopTyping);
  socketService.on('messages_read', handleMessagesRead);

  // 加载数据
  await loadConversations();
  await loadUnreadCount();
  
  // 如果有路由参数,直接打开对应会话
  const conversationId = router.currentRoute.value.query.conversationId;
  if (conversationId) {
    const conv = conversations.value.find(c => c.id === parseInt(conversationId));
    if (conv) {
      selectConversation(conv);
    }
  }
});

// 订单相关功能
// 发起订单
const handleCreateOrder = async (orderInfo) => {
  try {
    // 二次校验：商品必须在售
    if (currentConversation.value?.product_status === 'sold') {
      toast.error('该商品已售出，无法发起订单');
      return;
    }

    const orderData = {
      product_id: currentConversation.value.product_id,
      product_title: currentConversation.value.product_title,
      product_image: currentConversation.value.product_image,
      original_price: currentConversation.value.product_price,
      final_price: currentConversation.value.product_price,
      address_id: orderInfo.address_id,
      address_detail: orderInfo.address_detail,
      status: 'pending',
      remark: orderInfo.remark
    };

    const response = await messageApi.sendMessage({
      conversation_id: currentConversation.value.id,
      receiver_id: currentConversation.value.seller_id,
      content: JSON.stringify(orderData),
      type: 'order'
    });

    showCreateOrderDialog.value = false;
    toast.success('订单已发送');
    
    // 立即更新当前会话的最后一条消息
    const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value.id);
    if (convIndex !== -1) {
      conversations.value[convIndex].last_message = JSON.stringify(orderData);
      conversations.value[convIndex].last_message_time = new Date().toISOString();
      
      // 将这个会话移到列表顶部
      const conv = conversations.value.splice(convIndex, 1)[0];
      conversations.value.unshift(conv);
    }
    
    // 如果有返回的消息，添加到消息列表
    if (response.message) {
      messages.value.push(response.message);
      nextTick(() => scrollToBottom());
    }
  } catch (error) {
    console.error('发送订单失败:', error);
    toast.error('发送订单失败');
  }
};

// 修改价格
const handleModifyPrice = (orderData) => {
  currentOrderData.value = orderData;
  showModifyPriceDialog.value = true;
};

// 提交修改后的价格
const handlePriceModified = async (data) => {
  try {
    const newOrderData = {
      ...currentOrderData.value,
      final_price: data.new_price,
      status: 'modified'
    };

    const response = await messageApi.sendMessage({
      conversation_id: currentConversation.value.id,
      receiver_id: currentConversation.value.buyer_id,
      content: JSON.stringify(newOrderData),
      type: 'order'
    });

    showModifyPriceDialog.value = false;
    toast.success('价格已修改');
    
    // 立即更新当前会话的最后一条消息
    const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value.id);
    if (convIndex !== -1) {
      conversations.value[convIndex].last_message = JSON.stringify(newOrderData);
      conversations.value[convIndex].last_message_time = new Date().toISOString();
      
      // 将这个会话移到列表顶部
      const conv = conversations.value.splice(convIndex, 1)[0];
      conversations.value.unshift(conv);
    }
    
    // 如果有返回的消息，添加到消息列表
    if (response.message) {
      messages.value.push(response.message);
      nextTick(() => scrollToBottom());
    }
  } catch (error) {
    console.error('修改价格失败:', error);
    toast.error('修改价格失败');
  }
};

// 买家确认订单
const handleBuyerConfirm = async (orderData) => {
  try {
    // 创建正式订单
    const response = await createOrder({
      product_id: orderData.product_id,
      seller_id: currentConversation.value.seller_id,
      price: orderData.final_price,
      address_id: orderData.address_id,
      remark: orderData.remark,
      conversation_id: currentConversation.value.id
    });

    if (response.success) {
      // 发送确认消息
      const confirmedOrderData = {
        ...orderData,
        status: 'confirmed',
        order_id: response.data.order_id
      };

      const msgResponse = await messageApi.sendMessage({
        conversation_id: currentConversation.value.id,
        receiver_id: currentConversation.value.seller_id,
        content: JSON.stringify(confirmedOrderData),
        type: 'order'
      });

      toast.success('订单创建成功');
      
      // 立即更新会话列表
      const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value.id);
      if (convIndex !== -1) {
        conversations.value[convIndex].last_message = JSON.stringify(confirmedOrderData);
        conversations.value[convIndex].last_message_time = new Date().toISOString();
        
        const conv = conversations.value.splice(convIndex, 1)[0];
        conversations.value.unshift(conv);
      }
      
      // 添加消息到列表
      if (msgResponse.message) {
        messages.value.push(msgResponse.message);
        nextTick(() => scrollToBottom());
      }
    }
  } catch (error) {
    console.error('确认订单失败:', error);
    toast.error('确认订单失败');
  }
};

// 卖家确认订单
const handleSellerConfirm = async (orderData) => {
  try {
    // 创建订单
    const response = await createOrder({
      product_id: orderData.product_id,
      seller_id: currentConversation.value.seller_id,
      price: orderData.final_price,
      address_id: orderData.address_id,
      remark: orderData.remark,
      conversation_id: currentConversation.value.id
    });

    if (response.success) {
      const confirmedOrderData = {
        ...orderData,
        status: 'confirmed',
        order_id: response.data.order_id
      };

      const msgResponse = await messageApi.sendMessage({
        conversation_id: currentConversation.value.id,
        receiver_id: currentConversation.value.buyer_id,
        content: JSON.stringify(confirmedOrderData),
        type: 'order'
      });

      toast.success('订单已确认');
      
      // 立即更新会话列表
      const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value.id);
      if (convIndex !== -1) {
        conversations.value[convIndex].last_message = JSON.stringify(confirmedOrderData);
        conversations.value[convIndex].last_message_time = new Date().toISOString();
        
        const conv = conversations.value.splice(convIndex, 1)[0];
        conversations.value.unshift(conv);
      }
      
      // 添加消息到列表
      if (msgResponse.message) {
        messages.value.push(msgResponse.message);
        nextTick(() => scrollToBottom());
      }
    }
  } catch (error) {
    console.error('确认订单失败:', error);
    toast.error('确认订单失败');
  }
};

// 取消订单
const handleCancelOrder = async (orderData) => {
  const rejectedOrderData = {
    ...orderData,
    status: 'rejected'
  };

  try {
    const response = await messageApi.sendMessage({
      conversation_id: currentConversation.value.id,
      receiver_id: isSeller.value ? currentConversation.value.buyer_id : currentConversation.value.seller_id,
      content: JSON.stringify(rejectedOrderData),
      type: 'order'
    });

    toast.success('订单已取消');
    
    // 立即更新会话列表
    const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value.id);
    if (convIndex !== -1) {
      conversations.value[convIndex].last_message = JSON.stringify(rejectedOrderData);
      conversations.value[convIndex].last_message_time = new Date().toISOString();
      
      const conv = conversations.value.splice(convIndex, 1)[0];
      conversations.value.unshift(conv);
    }
    
    // 添加消息到列表
    if (response.message) {
      messages.value.push(response.message);
      nextTick(() => scrollToBottom());
    }
  } catch (error) {
    console.error('取消订单失败:', error);
    toast.error('取消订单失败');
  }
};

// 查看订单详情
const handleViewOrder = async (orderData) => {
  try {
    // 跳到个人页-我的订单，并根据角色切到对应tab
    const isBuyer = currentConversation.value?.buyer_id === currentUserId.value;
    const tab = isBuyer ? 'bought' : 'sold';
    router.push({ name: 'Profile', query: { menu: 'orders', tab } });
  } catch (error) {
    console.error('跳转订单页失败:', error);
  }
};

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  
  // 移除事件监听
  socketService.off('new_message', handleNewMessage);
  socketService.off('message_sent', handleMessageSent);
  socketService.off('unread_count_updated', handleUnreadCountUpdated);
  socketService.off('user_typing', handleUserTyping);
  socketService.off('user_stop_typing', handleUserStopTyping);
  socketService.off('messages_read', handleMessagesRead);
  
  clearTimeout(typingTimeout);
});

// 监听当前会话变化,重置输入状态
watch(currentConversation, () => {
  isTyping.value = false;
});
</script>

<style scoped>
/* 网页两栏：会话列表 + 聊天台，两块纸卡 */
.messages-container {
  display: flex;
  gap: 18px;
  height: 100vh;
  max-width: 1360px;
  margin: 0 auto;
  padding: 20px 24px;
  background: var(--bg);
  box-sizing: border-box;
}

/* 左：会话列表 */
.conversations-sidebar {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 20px;
  box-shadow: 5px 6px 0 var(--shadow);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 18px 18px 14px;
  border-bottom: 2px solid var(--line-2);
}

.sidebar-header h2 {
  margin: 0;
  color: var(--ink);
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.unread-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border: 1.5px solid var(--edge);
  border-radius: 999px;
  color: var(--on-primary);
  font-size: 11px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.conversation-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.26s var(--fish-ease),
              border-color 0.26s var(--fish-ease);
}

.conversation-item:hover {
  background: var(--cream-1);
  border-color: var(--line-2);
}

.conversation-item.active {
  background: var(--cream-2);
  border-color: var(--edge);
  box-shadow: 2px 3px 0 var(--shadow);
}

.conversation-item .avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--cream-2);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
}

.conversation-item .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.top-row,
.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.user-name {
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time {
  flex-shrink: 0;
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.last-message {
  flex: 1;
  min-width: 0;
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-count {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  background: var(--primary);
  border: 1.5px solid var(--edge);
  border-radius: 999px;
  color: var(--on-primary);
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.product-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  min-width: 0;
}

.product-thumb {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: cover;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
}

.product-title {
  color: var(--text-4);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-conversation-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-3);
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s var(--fish-ease), color 0.2s var(--fish-ease);
}

.delete-conversation-btn svg {
  width: 13px;
  height: 13px;
}

.conversation-item:hover .delete-conversation-btn {
  opacity: 1;
}

.delete-conversation-btn:hover {
  background: var(--danger);
  border-color: var(--edge);
  color: var(--on-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 200px;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

.conversations-list.is-empty .empty-state {
  flex: 1;
  padding: 24px 18px;
}

.empty-list-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  margin-bottom: 2px;
  color: var(--primary-2);
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 50%;
  box-shadow: 3px 4px 0 var(--shadow);
}

.empty-list-icon svg { width: 28px; height: 28px; }

.empty-caption {
  max-width: 230px;
  color: var(--text-3);
  font-size: 12px;
  line-height: 1.5;
}

.empty-action { margin-top: 4px; }

/* 右：聊天台 */
.chat-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 20px;
  box-shadow: 5px 6px 0 var(--shadow);
}

.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: var(--cream-1);
  color: var(--text-3);
  font-size: 14px;
}

.empty-icon {
  width: 88px;
  height: 88px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--primary-2);
}

.empty-icon svg {
  width: 36px;
  height: 36px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 2px solid var(--line-2);
  background: var(--card);
}

.chat-header .user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.chat-header .avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--cream-2);
  border: 2px solid var(--line-strong);
  border-radius: 999px;
}

.chat-header .info {
  min-width: 0;
}

.chat-header .info .name {
  color: var(--ink);
  font-size: 16px;
  font-weight: 900;
  margin-bottom: 2px;
}

.chat-header .info .product-name {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-3);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-actions {
  flex-shrink: 0;
}

.btn-link {
  min-height: 38px;
  padding: 7px 16px;
  background: var(--cream-1);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 2px 3px 0 var(--shadow);
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 0.2s var(--fish-ease), transform 0.2s var(--fish-ease);
}

.btn-link:hover {
  background: var(--cream-2);
}

.btn-link:active {
  transform: translateY(2px);
  box-shadow: none;
}

.btn-back {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--card);
  border: 2px solid var(--edge);
  border-radius: 999px;
  color: var(--ink);
  cursor: pointer;
}

.btn-back svg {
  width: 18px;
  height: 18px;
}

/* 消息流 */
.messages-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  overflow-y: auto;
  background: var(--cream-1);
}

.loading {
  padding: 20px;
  color: var(--text-3);
  font-size: 13px;
  text-align: center;
}

.message-item {
  display: flex;
  gap: 10px;
  animation: messageSlideIn 0.3s var(--fish-ease) both;
}

@keyframes messageSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-item.is-mine {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 68%;
  min-width: 0;
}

.message-item.is-mine .message-content {
  align-items: flex-end;
}

.message-bubble {
  padding: 10px 14px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 4px 16px 16px 16px;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.message-item.is-mine .message-bubble {
  background: var(--primary);
  border-color: var(--edge);
  border-radius: 16px 4px 16px 16px;
  box-shadow: 2px 3px 0 var(--shadow);
  color: var(--on-primary);
}

.message-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-time {
  color: var(--text-4);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.message-item.is-mine .message-time {
  color: var(--text-3);
}

.read-status {
  font-size: 11px;
  font-weight: 700;
}

.read-status .read { color: var(--success); }
.read-status .unread { color: var(--text-4); }

.typing-indicator {
  align-self: flex-start;
  padding: 6px 14px;
  background: var(--cream-2);
  border: 1.5px solid var(--line-strong);
  border-radius: 999px;
  color: var(--text-3);
  font-size: 12px;
}

/* 输入区 */
.chat-input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 14px;
  border-top: 2px solid var(--line-2);
  background: var(--card);
}

.order-button-wrapper {
  display: flex;
}

.create-order-btn {
  min-height: 40px;
  padding: 8px 18px;
  background: var(--cream-1);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 2px 3px 0 var(--shadow);
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.create-order-btn:hover {
  background: var(--cream-2);
}

.create-order-btn:disabled {
  opacity: 0.5;
  box-shadow: none;
  cursor: not-allowed;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}

.input-wrapper textarea {
  flex: 1;
  min-height: 48px;
  max-height: 132px;
  padding: 12px 14px;
  background: var(--card);
  border: 2px solid var(--line-strong);
  border-radius: 14px;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  transition: border-color 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 3px 4px 0 var(--shadow);
}

.input-wrapper textarea::placeholder {
  color: var(--text-4);
}

.btn-send {
  flex-shrink: 0;
  min-width: 88px;
  height: 48px;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 999px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.26s var(--fish-ease), box-shadow 0.26s var(--fish-ease);
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 4px 5px 0 var(--shadow);
}

.btn-send:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 1px 2px 0 var(--shadow);
}

.btn-send:disabled {
  opacity: 0.45;
  box-shadow: none;
  cursor: not-allowed;
}

/* 平板横屏：列表收窄 */
@media (min-width: 769px) and (max-width: 1100px) {
  .conversations-sidebar { width: 264px; }
  .messages-container { gap: 14px; padding: 16px; }
}

/* 手机 / iPad 竖屏：单栏切换 */
@media (max-width: 1024px) and (orientation: portrait),
       (max-width: 768px) {
  .messages-container.mobile {
    flex-direction: column;
    gap: 12px;
    height: calc(100vh - 76px);
    padding: 10px;
  }

  .conversations-sidebar {
    width: 100%;
    flex: 1;
    border-radius: 18px;
    box-shadow: 4px 5px 0 var(--shadow);
  }

  .conversations-sidebar.hidden {
    display: none;
  }

  .chat-area {
    display: none;
    border-radius: 18px;
    box-shadow: 4px 5px 0 var(--shadow);
  }

  .chat-area.show {
    display: flex;
    flex: 1;
  }

  .chat-header {
    padding: 10px 12px;
    gap: 8px;
  }

  .message-content {
    max-width: 78%;
  }

  .messages-list {
    padding: 14px 12px;
  }

  .chat-input-area {
    padding: 10px 12px 12px;
  }

  .input-wrapper textarea {
    min-height: 44px;
  }

  .btn-send {
    min-width: 72px;
  }
}

@media (max-width: 480px) {
  .messages-container.mobile { padding: 6px; gap: 8px; }
  .conversation-item { padding: 8px; gap: 9px; }
  .conversation-item .avatar { width: 40px; height: 40px; }
  .btn-link { padding: 6px 12px; font-size: 12px; }
}
</style>