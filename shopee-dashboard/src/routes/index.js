const express = require('express');
const router = express.Router();

// Import route modules
const productRoutes = require('./productRoutes');
const orderRoutes = require('./orderRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const webhookRoutes = require('./webhookRoutes');

// Dashboard controller
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'shopee-dashboard-api'
  });
});

// Auth endpoint for login
router.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const { generateToken } = require('../middleware/auth');
  
  // Simple auth - in production, verify against database
  if (username && password) {
    const token = generateToken({ 
      id: 1, 
      username, 
      role: 'admin' 
    });
    
    res.json({
      success: true,
      token,
      user: { id: 1, username, role: 'admin' }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Webhook routes (no auth required for external webhooks)
router.use('/webhook', webhookRoutes);

// API routes (auth required)
router.use('/api/products', productRoutes);
router.use('/api/orders', orderRoutes);
router.use('/api/inventory', inventoryRoutes);

// Dashboard routes
router.get('/api/dashboard/summary', authenticate, dashboardController.getSummary);
router.get('/api/dashboard/sales-chart', authenticate, dashboardController.getChartData);

// Shopee auth callback
router.get('/api/shopee/callback', (req, res) => {
  const { code, shop_id } = req.query;
  
  if (code && shop_id) {
    // In production, exchange code for access token
    res.json({
      success: true,
      message: 'Shopee authorization successful',
      shop_id
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Missing code or shop_id'
    });
  }
});

// Shopee connection status
router.get('/api/shopee/status', authenticate, (req, res) => {
  res.json({
    success: true,
    connected: true,
    shop_id: process.env.SHOPEE_SHOP_ID,
    shop_name: 'My Shopee Store'
  });
});

module.exports = router;
