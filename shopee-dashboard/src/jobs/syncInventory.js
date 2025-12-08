const Product = require('../models/Product');
const productService = require('../services/shopee/productService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { STOCK_ALERT } = require('../utils/constants');

const syncInventory = async () => {
  logger.info('Starting scheduled inventory sync...');
  
  const startTime = Date.now();
  
  try {
    // Check for low stock products
    const lowStockProducts = await Product.findAll({
      where: {
        status: 'active',
        stock: { [Op.lte]: STOCK_ALERT.LOW },
      },
      order: [['stock', 'ASC']],
    });
    
    logger.info(`Found ${lowStockProducts.length} low stock products`);
    
    // Get critical stock products (stock <= 5)
    const criticalProducts = lowStockProducts.filter(p => p.stock <= STOCK_ALERT.CRITICAL);
    
    // Get out of stock products
    const outOfStockProducts = lowStockProducts.filter(p => p.stock <= STOCK_ALERT.OUT_OF_STOCK);
    
    // Send notification if there are critical or out of stock products
    if (criticalProducts.length > 0) {
      await notificationService.send('low_stock', criticalProducts.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.stock,
      })));
    }
    
    // Generate low stock report
    const report = await productService.getLowStockReport();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info(`Inventory sync completed in ${duration}s`, {
      lowStock: lowStockProducts.length,
      critical: criticalProducts.length,
      outOfStock: outOfStockProducts.length,
    });
    
    return {
      lowStock: lowStockProducts.length,
      critical: criticalProducts.length,
      outOfStock: outOfStockProducts.length,
      report,
    };
  } catch (error) {
    logger.error('Scheduled inventory sync failed:', error);
    
    await notificationService.send('sync_failed', {
      type: 'Inventory',
      error: error.message,
    });
    
    throw error;
  }
};

module.exports = syncInventory;
