require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generateToken } = require('./middleware/auth');
const tokenManager = require('./services/shopee/tokenManager');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// =============================================================================
// HEALTH & AUTH
// =============================================================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    shopee: tokenManager.getStatus()
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username && password) {
    res.json({ success: true, token: generateToken({ id: 1, username, role: 'admin' }) });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// =============================================================================
// SHOPEE TOKEN MANAGEMENT
// =============================================================================
app.get('/api/shopee/token/status', (req, res) => {
  res.json({ success: true, data: tokenManager.getStatus() });
});

app.post('/api/shopee/token/set', (req, res) => {
  const { accessToken, refreshToken, expiresIn } = req.body;
  if (!accessToken || !refreshToken) {
    return res.status(400).json({ success: false, message: 'accessToken and refreshToken required' });
  }
  tokenManager.setTokens(accessToken, refreshToken, expiresIn || 14400);
  res.json({ success: true, message: 'Tokens set', data: tokenManager.getStatus() });
});

app.post('/api/shopee/token/refresh', async (req, res) => {
  const result = await tokenManager.doRefreshToken();
  res.json({ success: result, data: tokenManager.getStatus() });
});

// Get OAuth authorization URL with proper signature
app.get('/api/shopee/auth/url', (req, res) => {
  const { redirect } = req.query;
  const redirectUrl = redirect || 'https://pos-inventory-system-gamma.vercel.app/marketplace/callback';
  const authUrl = tokenManager.getAuthUrl(redirectUrl);
  res.json({ success: true, authUrl });
});

// =============================================================================
// SHOPEE STATUS
// =============================================================================
app.get('/api/shopee/status', (req, res) => {
  const status = tokenManager.getStatus();
  res.json({
    success: true,
    connected: true,
    shop_id: status.shopId,
    partner_id: status.partnerId,
    base_url: status.baseUrl
  });
});

// =============================================================================
// SHOPEE SYNC - LANGSUNG KE SHOPEE API
// =============================================================================

// Sync Shop Info
app.get('/api/shopee/shop/info', async (req, res) => {
  try {
    const data = await tokenManager.getShopInfo();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync Products dari Shopee
app.post('/api/shopee/sync/products', async (req, res) => {
  try {
    logger.info('Starting product sync from Shopee...');
    const data = await tokenManager.getItems(0, 100);
    res.json({ 
      success: true, 
      message: 'Products synced from Shopee',
      data: data.items || [],
      total: data.total || 0,
      more: data.more || false
    });
  } catch (error) {
    logger.error('Product sync error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Products
app.get('/api/shopee/products', async (req, res) => {
  try {
    const { offset = 0, limit = 50 } = req.query;
    const data = await tokenManager.getItems(parseInt(offset), parseInt(limit));
    res.json({ 
      success: true, 
      data: data.items || [],
      total: data.total || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Product Detail
app.get('/api/shopee/products/:itemId', async (req, res) => {
  try {
    const data = await tokenManager.getItemDetail(req.params.itemId);
    res.json({ success: true, data: data.item || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Sync Orders dari Shopee
app.post('/api/shopee/sync/orders', async (req, res) => {
  try {
    logger.info('Starting order sync from Shopee...');
    const now = Math.floor(Date.now() / 1000);
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60);
    const data = await tokenManager.getOrders(fifteenDaysAgo, now, 0, 100);
    res.json({ 
      success: true, 
      message: 'Orders synced from Shopee',
      data: data.orders || [],
      total: data.total || 0
    });
  } catch (error) {
    logger.error('Order sync error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Orders
app.get('/api/shopee/orders', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const fifteenDaysAgo = now - (15 * 24 * 60 * 60);
    const { offset = 0, limit = 50 } = req.query;
    const data = await tokenManager.getOrders(fifteenDaysAgo, now, parseInt(offset), parseInt(limit));
    res.json({ 
      success: true, 
      data: data.orders || [],
      total: data.total || 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Order Detail
app.get('/api/shopee/orders/:orderSn', async (req, res) => {
  try {
    const data = await tokenManager.getOrderDetail(req.params.orderSn);
    res.json({ success: true, data: data.orders?.[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Stock
app.put('/api/shopee/products/:itemId/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    const data = await tokenManager.updateStock(req.params.itemId, stock);
    res.json({ success: true, message: 'Stock updated', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================================
// DASHBOARD (Mock data untuk UI)
// =============================================================================
app.get('/api/dashboard/summary', (req, res) => {
  res.json({
    success: true,
    data: {
      products: { total: 150, lowStock: 12, outOfStock: 3 },
      orders: { today: 25, monthly: 450, pending: 15 },
      revenue: { today: 2500000, monthly: 45000000 }
    }
  });
});

app.get('/api/products', (req, res) => {
  const products = [];
  for (let i = 1; i <= 20; i++) {
    products.push({
      id: i, item_name: `Product ${i}`, item_sku: `SKU-${i}`,
      current_price: 100000 + (i * 10000), total_stock: 50 - i, item_status: 'NORMAL'
    });
  }
  res.json({ success: true, data: products, pagination: { page: 1, total: 20 } });
});

app.get('/api/orders', (req, res) => {
  const orders = [];
  const statuses = ['COMPLETED', 'SHIPPED', 'READY_TO_SHIP', 'UNPAID'];
  for (let i = 1; i <= 20; i++) {
    orders.push({
      id: i, order_sn: `SN${Date.now()}${i}`, buyer_username: `buyer_${i}`,
      total_amount: 200000 + (i * 50000), order_status: statuses[i % 4],
      create_time: new Date().toISOString()
    });
  }
  res.json({ success: true, data: orders, pagination: { page: 1, total: 20 } });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Shopee API Base: ${tokenManager.getStatus().baseUrl}`);
  logger.info(`Health: http://localhost:${PORT}/health`);
});
