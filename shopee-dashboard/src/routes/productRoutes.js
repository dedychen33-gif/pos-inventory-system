const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { validatePagination, validateId } = require('../middleware/validation');

// Apply authentication to all routes
router.use(authenticate);

// Product routes
router.get('/', validatePagination, productController.getAllProducts);
router.get('/low-stock', productController.getLowStockReport);
router.get('/export', productController.exportProducts);
router.get('/sync', productController.syncProducts);
router.get('/:id', productController.getProductDetails);
router.put('/:productId/stock', productController.updateProductStock);

module.exports = router;
