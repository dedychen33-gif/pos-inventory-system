const orderService = require('../services/shopee/orderService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const syncOrders = async () => {
  logger.info('Starting scheduled order sync...');
  
  const startTime = Date.now();
  
  try {
    const result = await orderService.syncOrders();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    logger.info(`Order sync completed in ${duration}s`, {
      synced: result.synced,
      failed: result.failed,
    });
    
    // Send notification if there are new orders
    if (result.synced > 0) {
      await notificationService.send('sync_completed', {
        type: 'Orders',
        count: result.synced,
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Scheduled order sync failed:', error);
    
    // Send failure notification
    await notificationService.send('sync_failed', {
      type: 'Orders',
      error: error.message,
    });
    
    throw error;
  }
};

module.exports = syncOrders;
