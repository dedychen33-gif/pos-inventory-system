const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Config file path
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');
const LOGS_FILE = path.join(__dirname, 'data', 'logs.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Load/Save config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return {
    partnerId: process.env.SHOPEE_PARTNER_ID || '',
    partnerKey: process.env.SHOPEE_PARTNER_KEY || '',
    shopId: process.env.SHOPEE_SHOP_ID || '',
    accessToken: '',
    refreshToken: '',
    tokenExpiry: null,
    lastRefresh: null
  };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function addLog(type, message, data = null) {
  let logs = [];
  try {
    if (fs.existsSync(LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
    }
  } catch (e) {}
  
  logs.unshift({
    timestamp: new Date().toISOString(),
    type,
    message,
    data
  });
  
  // Keep only last 100 logs
  logs = logs.slice(0, 100);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  console.log(`[${type}] ${message}`);
}

// Generate Shopee signature
function generateSignature(partnerId, partnerKey, apiPath, timestamp, accessToken = '', shopId = '') {
  const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Make HTTPS request to Shopee
function shopeeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Refresh Access Token
async function refreshAccessToken() {
  const config = loadConfig();
  
  if (!config.refreshToken) {
    addLog('ERROR', 'No refresh token available');
    return { success: false, error: 'No refresh token' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/access_token/get';
    const sign = generateSignature(config.partnerId, config.partnerKey, apiPath, timestamp);

    const postData = {
      partner_id: parseInt(config.partnerId),
      refresh_token: config.refreshToken,
      shop_id: parseInt(config.shopId)
    };

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?partner_id=${config.partnerId}&timestamp=${timestamp}&sign=${sign}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const result = await shopeeRequest(options, postData);

    if (result.access_token) {
      config.accessToken = result.access_token;
      config.refreshToken = result.refresh_token;
      config.tokenExpiry = Date.now() + (result.expire_in * 1000);
      config.lastRefresh = new Date().toISOString();
      saveConfig(config);
      
      addLog('SUCCESS', 'Token refreshed successfully', {
        expiry: new Date(config.tokenExpiry).toISOString()
      });
      
      return { success: true, data: result };
    } else {
      addLog('ERROR', 'Failed to refresh token', result);
      return { success: false, error: result.message || 'Unknown error' };
    }
  } catch (error) {
    addLog('ERROR', 'Token refresh error', error.message);
    return { success: false, error: error.message };
  }
}

// Sync Products from Shopee
async function syncProducts() {
  const config = loadConfig();
  
  if (!config.accessToken) {
    addLog('ERROR', 'No access token for product sync');
    return { success: false, error: 'No access token' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/product/get_item_list';
    const sign = generateSignature(
      config.partnerId, config.partnerKey, apiPath, 
      timestamp, config.accessToken, config.shopId
    );

    const queryParams = new URLSearchParams({
      partner_id: config.partnerId,
      timestamp: timestamp.toString(),
      sign,
      shop_id: config.shopId,
      access_token: config.accessToken,
      offset: '0',
      page_size: '100',
      item_status: 'NORMAL'
    });

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?${queryParams.toString()}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const result = await shopeeRequest(options);
    
    if (result.response && result.response.item) {
      addLog('SUCCESS', `Synced ${result.response.item.length} products`);
      return { success: true, count: result.response.item.length };
    } else {
      addLog('WARNING', 'Product sync returned no items', result);
      return { success: true, count: 0 };
    }
  } catch (error) {
    addLog('ERROR', 'Product sync error', error.message);
    return { success: false, error: error.message };
  }
}

// Sync Orders from Shopee
async function syncOrders() {
  const config = loadConfig();
  
  if (!config.accessToken) {
    addLog('ERROR', 'No access token for order sync');
    return { success: false, error: 'No access token' };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/order/get_order_list';
    const sign = generateSignature(
      config.partnerId, config.partnerKey, apiPath, 
      timestamp, config.accessToken, config.shopId
    );

    // Last 7 days
    const timeFrom = timestamp - (7 * 24 * 60 * 60);

    const queryParams = new URLSearchParams({
      partner_id: config.partnerId,
      timestamp: timestamp.toString(),
      sign,
      shop_id: config.shopId,
      access_token: config.accessToken,
      time_range_field: 'create_time',
      time_from: timeFrom.toString(),
      time_to: timestamp.toString(),
      page_size: '100'
    });

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?${queryParams.toString()}`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    };

    const result = await shopeeRequest(options);
    
    if (result.response && result.response.order_list) {
      addLog('SUCCESS', `Synced ${result.response.order_list.length} orders`);
      return { success: true, count: result.response.order_list.length };
    } else {
      addLog('WARNING', 'Order sync returned no items', result);
      return { success: true, count: 0 };
    }
  } catch (error) {
    addLog('ERROR', 'Order sync error', error.message);
    return { success: false, error: error.message };
  }
}

// Check if token needs refresh
function checkTokenExpiry() {
  const config = loadConfig();
  if (!config.tokenExpiry) return true;
  
  // Refresh 30 minutes before expiry
  const bufferTime = 30 * 60 * 1000;
  return Date.now() > (config.tokenExpiry - bufferTime);
}

// ============ CRON JOBS ============

// Refresh token every 3 hours
cron.schedule('0 */3 * * *', async () => {
  addLog('CRON', 'Running scheduled token refresh');
  await refreshAccessToken();
});

// Sync products every 6 hours
cron.schedule('0 */6 * * *', async () => {
  addLog('CRON', 'Running scheduled product sync');
  if (checkTokenExpiry()) {
    await refreshAccessToken();
  }
  await syncProducts();
});

// Sync orders every hour
cron.schedule('0 * * * *', async () => {
  addLog('CRON', 'Running scheduled order sync');
  if (checkTokenExpiry()) {
    await refreshAccessToken();
  }
  await syncOrders();
});

// ============ API ENDPOINTS ============

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    message: 'POS Shopee Backend Server',
    time: new Date().toISOString()
  });
});

// Get current config (without sensitive data)
app.get('/api/status', (req, res) => {
  const config = loadConfig();
  res.json({
    connected: !!config.accessToken,
    shopId: config.shopId,
    lastRefresh: config.lastRefresh,
    tokenExpiry: config.tokenExpiry ? new Date(config.tokenExpiry).toISOString() : null,
    tokenValid: !checkTokenExpiry()
  });
});

// Get logs
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (e) {
    res.json([]);
  }
});

// Update config
app.post('/api/config', (req, res) => {
  const config = loadConfig();
  const { partnerId, partnerKey, shopId, accessToken, refreshToken } = req.body;
  
  if (partnerId) config.partnerId = partnerId;
  if (partnerKey) config.partnerKey = partnerKey;
  if (shopId) config.shopId = shopId;
  if (accessToken) config.accessToken = accessToken;
  if (refreshToken) config.refreshToken = refreshToken;
  
  saveConfig(config);
  addLog('INFO', 'Config updated');
  res.json({ success: true });
});

// Manual refresh token
app.post('/api/refresh-token', async (req, res) => {
  const result = await refreshAccessToken();
  res.json(result);
});

// Manual sync products
app.post('/api/sync-products', async (req, res) => {
  if (checkTokenExpiry()) {
    await refreshAccessToken();
  }
  const result = await syncProducts();
  res.json(result);
});

// Manual sync orders
app.post('/api/sync-orders', async (req, res) => {
  if (checkTokenExpiry()) {
    await refreshAccessToken();
  }
  const result = await syncOrders();
  res.json(result);
});

// Get current token for frontend
app.get('/api/token', (req, res) => {
  const config = loadConfig();
  res.json({
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    tokenExpiry: config.tokenExpiry,
    shopId: config.shopId
  });
});

// ============ SHOPEE AUTH ENDPOINTS ============

// Generate Auth URL for OAuth (POST method to receive credentials)
app.post('/api/auth/shopee/url', (req, res) => {
  const { partner_id, partner_key, shop_id, redirect_url } = req.body;
  const config = loadConfig();
  
  const partnerId = partner_id || config.partnerId;
  const partnerKey = partner_key || config.partnerKey;
  const redirectUri = redirect_url || `${req.protocol}://${req.get('host')}/api/auth/shopee/callback`;
  
  if (!partnerId) {
    return res.status(400).json({ error: 'Partner ID tidak ditemukan' });
  }
  
  if (!partnerKey) {
    return res.status(400).json({ error: 'Partner Key tidak ditemukan. Silakan isi Partner Key di pengaturan toko.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/shop/auth_partner';
  
  // Generate signature: SHA256(partner_id + api_path + timestamp)
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  
  const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUri)}`;
  
  addLog('INFO', `Generated auth URL for partner ${partnerId}`);
  res.json({ url: authUrl });
});

// Also support GET for backward compatibility
app.get('/api/auth/shopee/url', (req, res) => {
  const config = loadConfig();
  const partnerId = req.query.partner_id || config.partnerId;
  const partnerKey = config.partnerKey; // Must be from config for GET
  const redirectUrl = req.query.redirect_url || `${req.protocol}://${req.get('host')}/api/auth/shopee/callback`;
  
  if (!partnerId || !partnerKey) {
    return res.status(400).json({ error: 'Partner ID atau Partner Key tidak ditemukan' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const apiPath = '/api/v2/shop/auth_partner';
  
  const baseString = `${partnerId}${apiPath}${timestamp}`;
  const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
  
  const authUrl = `https://partner.shopeemobile.com${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}&redirect=${encodeURIComponent(redirectUrl)}`;
  
  res.json({ url: authUrl });
});

// Handle OAuth Callback - exchange code for token
app.post('/api/auth/shopee/callback', async (req, res) => {
  const { code, shop_id, partner_id, partner_key } = req.body;
  const config = loadConfig();
  
  const partnerId = partner_id || config.partnerId;
  const partnerKey = partner_key || config.partnerKey;
  
  if (!code || !partnerId || !partnerKey) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/auth/token/get';
    const baseString = `${partnerId}${apiPath}${timestamp}`;
    const sign = crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');

    const postData = {
      code,
      shop_id: parseInt(shop_id),
      partner_id: parseInt(partnerId)
    };

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign}`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(postData))
      }
    };

    const result = await shopeeRequest(options, postData);
    
    if (result.access_token) {
      // Save to config
      config.accessToken = result.access_token;
      config.refreshToken = result.refresh_token;
      config.shopId = shop_id || result.shop_id;
      config.partnerId = partnerId;
      config.partnerKey = partnerKey;
      config.tokenExpiry = Date.now() + (result.expire_in * 1000);
      config.lastRefresh = new Date().toISOString();
      saveConfig(config);
      
      addLog('SUCCESS', 'OAuth token obtained successfully');
      
      res.json({
        success: true,
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expire_in: result.expire_in,
        shop_id: shop_id || result.shop_id
      });
    } else {
      addLog('ERROR', 'Failed to get token', result);
      res.status(400).json({ 
        error: result.message || 'Failed to get access token',
        details: result 
      });
    }
  } catch (error) {
    addLog('ERROR', 'OAuth callback error', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test connection / get auth status
app.get('/api/auth/status', (req, res) => {
  const config = loadConfig();
  const shopId = req.query.shop_id || config.shopId;
  
  res.json({
    success: !!config.accessToken,
    connected: !!config.accessToken,
    shop_id: shopId,
    token_valid: !checkTokenExpiry(),
    last_refresh: config.lastRefresh,
    token_expiry: config.tokenExpiry ? new Date(config.tokenExpiry).toISOString() : null
  });
});

// Products sync endpoint
app.post('/api/products/sync', async (req, res) => {
  const { shop_id, access_token } = req.body;
  const config = loadConfig();
  
  // Use provided credentials or fall back to config
  if (access_token) {
    config.accessToken = access_token;
  }
  if (shop_id) {
    config.shopId = shop_id;
  }
  
  if (!config.accessToken) {
    return res.status(401).json({ error: 'No access token' });
  }
  
  const result = await syncProducts();
  res.json(result);
});

// Orders sync endpoint
app.post('/api/orders/sync', async (req, res) => {
  const { shop_id, access_token } = req.body;
  const config = loadConfig();
  
  // Use provided credentials or fall back to config
  if (access_token) {
    config.accessToken = access_token;
  }
  if (shop_id) {
    config.shopId = shop_id;
  }
  
  if (!config.accessToken) {
    return res.status(401).json({ error: 'No access token' });
  }
  
  const result = await syncOrders();
  res.json(result);
});

// Update product to Shopee
app.post('/api/shopee/update-product', async (req, res) => {
  const { partner_id, partner_key, shop_id, access_token, item_id, model_id, name, price, stock, sku } = req.body;
  
  if (!partner_id || !partner_key || !shop_id || !access_token || !item_id) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required parameters' 
    });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = '/api/v2/product/update_item';
    const sign = generateSignature(partner_id, partner_key, apiPath, timestamp, access_token, shop_id);

    // Prepare update payload
    const updateData = {
      item_id: parseInt(item_id)
    };

    // Add fields to update
    if (name) updateData.item_name = name;
    if (sku) updateData.item_sku = sku;
    
    // For price and stock, need to update model/variation
    if (model_id && (price !== undefined || stock !== undefined)) {
      updateData.price_list = [{
        model_id: parseInt(model_id),
        ...(price !== undefined && { original_price: parseFloat(price) }),
      }];
      
      updateData.stock_list = [{
        model_id: parseInt(model_id),
        ...(stock !== undefined && { normal_stock: parseInt(stock) }),
      }];
    } else if (price !== undefined || stock !== undefined) {
      // Single variant product
      if (price !== undefined) updateData.original_price = parseFloat(price);
      if (stock !== undefined) updateData.normal_stock = parseInt(stock);
    }

    const queryParams = new URLSearchParams({
      partner_id: partner_id,
      timestamp: timestamp.toString(),
      sign,
      shop_id: shop_id,
      access_token: access_token
    });

    const options = {
      hostname: 'partner.shopeemobile.com',
      path: `${apiPath}?${queryParams.toString()}`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      }
    };

    const result = await shopeeRequest(options, updateData);
    
    if (result.error) {
      addLog('ERROR', 'Update product failed', result);
      return res.json({ 
        success: false, 
        error: result.message || result.error 
      });
    }

    addLog('SUCCESS', `Updated product ${item_id}`);
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    addLog('ERROR', 'Update product error', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     POS Shopee Backend Server                         ║
║     Running on port ${PORT}                              ║
╠═══════════════════════════════════════════════════════╣
║  Cron Jobs:                                           ║
║  • Token refresh: Every 3 hours                       ║
║  • Product sync: Every 6 hours                        ║
║  • Order sync: Every 1 hour                           ║
╚═══════════════════════════════════════════════════════╝
  `);
  
  addLog('INFO', `Server started on port ${PORT}`);
  
  // Initial check
  const config = loadConfig();
  if (config.refreshToken && checkTokenExpiry()) {
    addLog('INFO', 'Token expired, refreshing on startup...');
    refreshAccessToken();
  }
});
