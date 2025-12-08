/**
 * Marketplace Chat API Service
 * Real-time chat integration for Shopee, Lazada, Tokopedia
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============ SHOPEE CHAT API ============
export const shopeeChat = {
  getConversations: async (store, params = {}) => {
    const { partnerId, accessToken, shopId } = store.credentials || {};
    if (!accessToken) throw new Error('Access token tidak tersedia');

    const timestamp = Math.floor(Date.now() / 1000);
    const queryParams = new URLSearchParams({
      partner_id: partnerId,
      shop_id: shopId,
      access_token: accessToken,
      timestamp,
      direction: params.direction || 'latest',
      type: params.type || 'all',
      page_size: params.limit || 20,
    });

    const response = await fetch(`${API_BASE}/api/v2/sellerchat/get_conversation_list?${queryParams}`);
    const data = await response.json();
    if (data.error) throw new Error(data.message || 'Failed to get conversations');
    return data.response?.conversations || [];
  },

  getMessages: async (store, conversationId, params = {}) => {
    const { partnerId, accessToken, shopId } = store.credentials || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const queryParams = new URLSearchParams({
      partner_id: partnerId,
      shop_id: shopId,
      access_token: accessToken,
      timestamp,
      conversation_id: conversationId,
      page_size: params.limit || 50,
    });

    const response = await fetch(`${API_BASE}/api/v2/sellerchat/get_message?${queryParams}`);
    const data = await response.json();
    if (data.error) throw new Error(data.message || 'Failed to get messages');
    return data.response?.messages || [];
  },

  sendMessage: async (store, conversationId, content) => {
    const { partnerId, accessToken, shopId } = store.credentials || {};
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await fetch(`${API_BASE}/api/v2/sellerchat/send_message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: parseInt(partnerId),
        shop_id: parseInt(shopId),
        access_token: accessToken,
        timestamp,
        to_id: conversationId,
        message_type: 'text',
        content: { text: content }
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message || 'Failed to send message');
    return data.response;
  },

  readConversation: async (store, conversationId) => {
    const { partnerId, accessToken, shopId } = store.credentials || {};
    const timestamp = Math.floor(Date.now() / 1000);

    const response = await fetch(`${API_BASE}/api/v2/sellerchat/read_conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: parseInt(partnerId),
        shop_id: parseInt(shopId),
        access_token: accessToken,
        timestamp,
        conversation_id: conversationId
      })
    });
    return response.json();
  },

  getUnreadCount: async (store) => {
    const { partnerId, accessToken, shopId } = store.credentials || {};
    const timestamp = Math.floor(Date.now() / 1000);
    const queryParams = new URLSearchParams({
      partner_id: partnerId,
      shop_id: shopId,
      access_token: accessToken,
      timestamp
    });

    try {
      const response = await fetch(`${API_BASE}/api/v2/sellerchat/get_unread_conversation_count?${queryParams}`);
      const data = await response.json();
      return data.response?.unread_count || 0;
    } catch {
      return 0;
    }
  }
};

// ============ LAZADA CHAT API ============
export const lazadaChat = {
  getConversations: async (store, params = {}) => {
    const { appKey, accessToken } = store.credentials || {};
    if (!accessToken) throw new Error('Access token tidak tersedia');

    const queryParams = new URLSearchParams({
      app_key: appKey,
      access_token: accessToken,
      timestamp: Date.now(),
      sign_method: 'sha256',
      page_no: params.page || 1,
      page_size: params.limit || 20
    });

    const response = await fetch(`${API_BASE}/lazada/im/session/list?${queryParams}`);
    const data = await response.json();
    if (data.code !== '0') throw new Error(data.message || 'Failed');
    return data.data?.session_list || [];
  },

  getMessages: async (store, sessionId, params = {}) => {
    const { appKey, accessToken } = store.credentials || {};
    const queryParams = new URLSearchParams({
      app_key: appKey,
      access_token: accessToken,
      timestamp: Date.now(),
      sign_method: 'sha256',
      session_id: sessionId,
      page_size: params.limit || 50
    });

    const response = await fetch(`${API_BASE}/lazada/im/message/list?${queryParams}`);
    const data = await response.json();
    if (data.code !== '0') throw new Error(data.message || 'Failed');
    return data.data?.message_list || [];
  },

  sendMessage: async (store, sessionId, content) => {
    const { appKey, accessToken } = store.credentials || {};
    const response = await fetch(`${API_BASE}/lazada/im/message/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: appKey,
        access_token: accessToken,
        timestamp: Date.now(),
        sign_method: 'sha256',
        session_id: sessionId,
        template_id: 1,
        txt_content: content
      })
    });
    const data = await response.json();
    if (data.code !== '0') throw new Error(data.message || 'Failed');
    return data.data;
  },

  getUnreadCount: async (store) => {
    const { appKey, accessToken } = store.credentials || {};
    try {
      const queryParams = new URLSearchParams({
        app_key: appKey,
        access_token: accessToken,
        timestamp: Date.now(),
        sign_method: 'sha256'
      });
      const response = await fetch(`${API_BASE}/lazada/im/session/unread?${queryParams}`);
      const data = await response.json();
      return data.data?.unread_count || 0;
    } catch {
      return 0;
    }
  }
};

// ============ TOKOPEDIA CHAT API ============
export const tokopediaChat = {
  getConversations: async (store) => {
    const { clientId, accessToken, shopId } = store.credentials || {};
    if (!accessToken) throw new Error('Access token tidak tersedia');

    const response = await fetch(`${API_BASE}/tokopedia/v1/chat/fs/${clientId}/shops/${shopId}/unreplied`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    if (data.header?.error_code) throw new Error(data.header.messages?.[0] || 'Failed');
    return data.data?.chat_list || [];
  },

  getMessages: async (store, msgId) => {
    const { clientId, accessToken } = store.credentials || {};
    const response = await fetch(`${API_BASE}/tokopedia/v1/chat/fs/${clientId}/messages/${msgId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    if (data.header?.error_code) throw new Error(data.header.messages?.[0] || 'Failed');
    return data.data?.messages || [];
  },

  sendMessage: async (store, msgId, content) => {
    const { clientId, accessToken, shopId } = store.credentials || {};
    const response = await fetch(`${API_BASE}/tokopedia/v1/chat/fs/${clientId}/messages/${msgId}/reply`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop_id: parseInt(shopId), message: content })
    });
    const data = await response.json();
    if (data.header?.error_code) throw new Error(data.header.messages?.[0] || 'Failed');
    return data.data;
  }
};

// ============ UNIFIED CHAT SERVICE ============
export const chatService = {
  getConversations: async (store, params = {}) => {
    switch (store.platform) {
      case 'shopee': return shopeeChat.getConversations(store, params);
      case 'lazada': return lazadaChat.getConversations(store, params);
      case 'tokopedia': return tokopediaChat.getConversations(store, params);
      default: throw new Error(`Platform ${store.platform} tidak didukung`);
    }
  },

  getMessages: async (store, conversationId, params = {}) => {
    switch (store.platform) {
      case 'shopee': return shopeeChat.getMessages(store, conversationId, params);
      case 'lazada': return lazadaChat.getMessages(store, conversationId, params);
      case 'tokopedia': return tokopediaChat.getMessages(store, conversationId, params);
      default: throw new Error(`Platform ${store.platform} tidak didukung`);
    }
  },

  sendMessage: async (store, conversationId, content) => {
    switch (store.platform) {
      case 'shopee': return shopeeChat.sendMessage(store, conversationId, content);
      case 'lazada': return lazadaChat.sendMessage(store, conversationId, content);
      case 'tokopedia': return tokopediaChat.sendMessage(store, conversationId, content);
      default: throw new Error(`Platform ${store.platform} tidak didukung`);
    }
  },

  markAsRead: async (store, conversationId) => {
    if (store.platform === 'shopee') return shopeeChat.readConversation(store, conversationId);
    return Promise.resolve();
  },

  getUnreadCount: async (store) => {
    switch (store.platform) {
      case 'shopee': return shopeeChat.getUnreadCount(store);
      case 'lazada': return lazadaChat.getUnreadCount(store);
      default: return 0;
    }
  },

  getAllConversations: async (stores) => {
    const activeStores = stores.filter(s => 
      s.isActive && s.credentials?.accessToken && ['shopee', 'lazada', 'tokopedia'].includes(s.platform)
    );

    const results = await Promise.allSettled(
      activeStores.map(async (store) => {
        const conversations = await chatService.getConversations(store);
        return conversations.map(conv => ({ ...conv, storeId: store.id, storeName: store.shopName, platform: store.platform }));
      })
    );

    return results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      .sort((a, b) => (b.last_message_timestamp || 0) - (a.last_message_timestamp || 0));
  }
};

export default chatService;
