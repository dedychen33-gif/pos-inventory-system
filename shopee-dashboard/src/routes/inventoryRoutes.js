const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// GET /api/inventory - Get inventory list
router.get('/', validatePagination, inventoryController.getInventory);

// GET /api/inventory/logs - Get inventory logs
router.get('/logs', validatePagination, inventoryController.getInventoryLogs);

// POST /api/inventory/bulk-update - Bulk update stock
router.post('/bulk-update', inventoryController.bulkUpdateStock);

// PUT /api/inventory/:id/stock - Update single product stock
router.put('/:id/stock', validateId(), inventoryController.updateStock);

module.exports = router;
