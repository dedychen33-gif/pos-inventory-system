/**
 * Marketplace Chat Backend Server
 * Handles webhook & API for Shopee, Lazada, Tokopedia chat
 */

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Store configurations (in production, use database)
const storeConfigs = new Map();
const chatCache = new Map(); // Cache conversations

// ============ SHOPEE CHAT ============
const SHOPEE_HOST = 'https://partner.shopeemobile.com';

// Generate Shopee signature
function shopeeSign(partnerId, path, timestamp, accessToken, shopId, partnerKey) {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Shopee Chat API endpoints
app.get('/api/shopee/chat/conversations', async (req, res) => {
  try {
    const { shop_id, partner_id, access_token, partner_key } = req.query;
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/sellerchat/get_conversation_list';
    const sign = shopeeSign(partner_id, path, timestamp, access_token, shop_id, partner_key);

    const response = await axios.get(`${SHOPEE_HOST}${path}`, {
      params: {
        partner_id,
        shop_id,
        access_token,
        timestamp,
        sign,
        direction: 'latest',
        type: 'all',
        page_size: 50
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Shopee get conversations error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/shopee/chat/messages', async (req, res) => {
  try {
    const { shop_id, partner_id, access_token, partner_key, conversation_id } = req.query;
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/sellerchat/get_message';
    const sign = shopeeSign(partner_id, path, timestamp, access_token, shop_id, partner_key);

    const response = await axios.get(`${SHOPEE_HOST}${path}`, {
      params: {
        partner_id,
        shop_id,
        access_token,
        timestamp,
        sign,
        conversation_id,
        page_size: 50
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Shopee get messages error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/shopee/chat/send', async (req, res) => {
  try {
    const { shop_id, partner_id, access_token, partner_key, conversation_id, content } = req.body;
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/api/v2/sellerchat/send_message';
    const sign = shopeeSign(partner_id, path, timestamp, access_token, shop_id, partner_key);

    const response = await axios.post(`${SHOPEE_HOST}${path}?partner_id=${partner_id}&shop_id=${shop_id}&access_token=${access_token}&timestamp=${timestamp}&sign=${sign}`, {
      to_id: conversation_id,
      message_type: 'text',
      content: { text: content }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Shopee send message error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Shopee Webhook for new messages
app.post('/webhook/shopee/chat', (req, res) => {
  console.log('Shopee chat webhook received:', req.body);
  
  const { shop_id, data } = req.body;
  
  // Emit to connected clients (WebSocket would be better)
  // For now, store in cache
  if (data?.conversation_id) {
    const key = `shopee_${shop_id}_${data.conversation_id}`;
    const existing = chatCache.get(key) || [];
    existing.push({
      ...data,
      received_at: new Date().toISOString()
    });
    chatCache.set(key, existing);
  }
  
  res.json({ success: true });
});


// ============ LAZADA CHAT ============
const LAZADA_HOST = 'https://api.lazada.co.id/rest';

// Generate Lazada signature
function lazadaSign(params, appSecret) {
  const sorted = Object.keys(params).sort();
  let baseString = '';
  sorted.forEach(key => {
    baseString += key + params[key];
  });
  return crypto.createHmac('sha256', appSecret).update(baseString).digest('hex').toUpperCase();
}

app.get('/api/lazada/chat/sessions', async (req, res) => {
  try {
    const { app_key, app_secret, access_token } = req.query;
    const timestamp = Date.now();
    
    const params = {
      app_key,
      access_token,
      timestamp,
      sign_method: 'sha256'
    };
    params.sign = lazadaSign(params, app_secret);

    const response = await axios.get(`${LAZADA_HOST}/im/session/list`, { params });
    res.json(response.data);
  } catch (error) {
    console.error('Lazada get sessions error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lazada/chat/messages', async (req, res) => {
  try {
    const { app_key, app_secret, access_token, session_id } = req.query;
    const timestamp = Date.now();
    
    const params = {
      app_key,
      access_token,
      timestamp,
      sign_method: 'sha256',
      session_id
    };
    params.sign = lazadaSign(params, app_secret);

    const response = await axios.get(`${LAZADA_HOST}/im/message/get`, { params });
    res.json(response.data);
  } catch (error) {
    console.error('Lazada get messages error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/lazada/chat/send', async (req, res) => {
  try {
    const { app_key, app_secret, access_token, session_id, content } = req.body;
    const timestamp = Date.now();
    
    const params = {
      app_key,
      access_token,
      timestamp,
      sign_method: 'sha256',
      session_id,
      content,
      template_id: 0
    };
    params.sign = lazadaSign(params, app_secret);

    const response = await axios.post(`${LAZADA_HOST}/im/message/send`, null, { params });
    res.json(response.data);
  } catch (error) {
    console.error('Lazada send message error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Lazada Webhook
app.post('/webhook/lazada/chat', (req, res) => {
  console.log('Lazada chat webhook received:', req.body);
  res.json({ success: true });
});


// ============ TOKOPEDIA CHAT ============
const TOKOPEDIA_HOST = 'https://fs.tokopedia.net';

app.get('/api/tokopedia/chat/list', async (req, res) => {
  try {
    const { fs_id, access_token, shop_id } = req.query;

    const response = await axios.get(`${TOKOPEDIA_HOST}/v1/chat/fs/${fs_id}/messages`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: { shop_id, page: 1, per_page: 50 }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Tokopedia get chat error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tokopedia/chat/replies', async (req, res) => {
  try {
    const { fs_id, access_token, msg_id } = req.query;

    const response = await axios.get(`${TOKOPEDIA_HOST}/v1/chat/fs/${fs_id}/messages/${msg_id}/replies`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Tokopedia get replies error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tokopedia/chat/send', async (req, res) => {
  try {
    const { fs_id, access_token, msg_id, message } = req.body;

    const response = await axios.post(
      `${TOKOPEDIA_HOST}/v1/chat/fs/${fs_id}/messages/${msg_id}/reply`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Tokopedia send message error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Tokopedia Webhook
app.post('/webhook/tokopedia/chat', (req, res) => {
  console.log('Tokopedia chat webhook received:', req.body);
  res.json({ success: true });
});


// ============ UNIFIED ENDPOINTS ============

// Get all conversations from all connected stores
app.post('/api/chat/all-conversations', async (req, res) => {
  try {
    const { stores } = req.body; // Array of store configs
    const allConversations = [];

    for (const store of stores) {
      try {
        let conversations = [];
        
        if (store.platform === 'shopee') {
          const { partner_id, partner_key, access_token, shop_id } = store.credentials;
          const timestamp = Math.floor(Date.now() / 1000);
          const path = '/api/v2/sellerchat/get_conversation_list';
          const sign = shopeeSign(partner_id, path, timestamp, access_token, shop_id, partner_key);

          const response = await axios.get(`${SHOPEE_HOST}${path}`, {
            params: {
              partner_id, shop_id, access_token, timestamp, sign,
              direction: 'latest', type: 'all', page_size: 20
            }
          });
          
          conversations = (response.data.response?.conversations || []).map(c => ({
            ...c,
            platform: 'shopee',
            storeId: store.id,
            storeName: store.name
          }));
        }
        
        else if (store.platform === 'lazada') {
          const { app_key, app_secret, access_token } = store.credentials;
          const params = {
            app_key, access_token,
            timestamp: Date.now(),
            sign_method: 'sha256'
          };
          params.sign = lazadaSign(params, app_secret);

          const response = await axios.get(`${LAZADA_HOST}/im/session/list`, { params });
          
          conversations = (response.data.data?.session_list || []).map(c => ({
            ...c,
            platform: 'lazada',
            storeId: store.id,
            storeName: store.name
          }));
        }
        
        else if (store.platform === 'tokopedia') {
          const { fs_id, access_token, shop_id } = store.credentials;

          const response = await axios.get(`${TOKOPEDIA_HOST}/v1/chat/fs/${fs_id}/messages`, {
            headers: { 'Authorization': `Bearer ${access_token}` },
            params: { shop_id, page: 1, per_page: 20 }
          });
          
          conversations = (response.data.data || []).map(c => ({
            ...c,
            platform: 'tokopedia',
            storeId: store.id,
            storeName: store.name
          }));
        }

        allConversations.push(...conversations);
      } catch (storeError) {
        console.error(`Error fetching from ${store.platform}:`, storeError.message);
      }
    }

    // Sort by last message time
    allConversations.sort((a, b) => {
      const timeA = a.last_message_timestamp || a.latest_message_time || 0;
      const timeB = b.last_message_timestamp || b.latest_message_time || 0;
      return timeB - timeA;
    });

    res.json({ success: true, conversations: allConversations });
  } catch (error) {
    console.error('Get all conversations error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get new messages count (for notification badge)
app.post('/api/chat/unread-count', async (req, res) => {
  try {
    const { stores } = req.body;
    let totalUnread = 0;

    for (const store of stores) {
      try {
        if (store.platform === 'shopee') {
          const { partner_id, partner_key, access_token, shop_id } = store.credentials;
          const timestamp = Math.floor(Date.now() / 1000);
          const path = '/api/v2/sellerchat/get_unread_conversation_count';
          const sign = shopeeSign(partner_id, path, timestamp, access_token, shop_id, partner_key);

          const response = await axios.get(`${SHOPEE_HOST}${path}`, {
            params: { partner_id, shop_id, access_token, timestamp, sign }
          });
          
          totalUnread += response.data.response?.unread_count || 0;
        }
        // Add Lazada and Tokopedia unread count APIs if available
      } catch (err) {
        console.error(`Error getting unread from ${store.platform}:`, err.message);
      }
    }

    res.json({ success: true, unread: totalUnread });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Marketplace Chat API Server',
    endpoints: {
      shopee: ['/api/shopee/chat/conversations', '/api/shopee/chat/messages', '/api/shopee/chat/send'],
      lazada: ['/api/lazada/chat/sessions', '/api/lazada/chat/messages', '/api/lazada/chat/send'],
      tokopedia: ['/api/tokopedia/chat/list', '/api/tokopedia/chat/replies', '/api/tokopedia/chat/send'],
      unified: ['/api/chat/all-conversations', '/api/chat/unread-count'],
      webhooks: ['/webhook/shopee/chat', '/webhook/lazada/chat', '/webhook/tokopedia/chat']
    }
  });
});


// ============ START SERVER ============
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log(`📡 Webhook URLs:`);
  console.log(`   Shopee:    http://localhost:${PORT}/webhook/shopee/chat`);
  console.log(`   Lazada:    http://localhost:${PORT}/webhook/lazada/chat`);
  console.log(`   Tokopedia: http://localhost:${PORT}/webhook/tokopedia/chat`);
});

module.exports = app;
