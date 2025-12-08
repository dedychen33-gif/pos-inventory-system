const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// GET /api/orders - Get all orders
router.get('/', validatePagination, orderController.getOrders);

// GET /api/orders/report - Get sales report
router.get('/report', orderController.getSalesReport);

// GET /api/orders/export - Export orders to Excel
router.get('/export', orderController.exportOrders);

// POST /api/orders/sync - Sync orders from Shopee
router.post('/sync', orderController.syncOrders);

// GET /api/orders/:id - Get order by ID
router.get('/:id', validateId(), orderController.getOrderById);

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', validateId(), orderController.updateOrderStatus);

module.exports = router;
