const productService = require('../services/shopee/productService');
const logger = require('../utils/logger');
const { sendNotification } = require('../services/notificationService');

class ProductSyncJob {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
  }

  async run() {
    if (this.isRunning) {
      logger.warn('Product sync is already running');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date();
      
      logger.info('Starting product sync job');
      
      const result = await productService.syncProductsToDatabase();
      
      logger.info('Product sync completed:', result);
      
      // Send notification if needed
      if (result.total > 0) {
        await sendNotification({
          type: 'PRODUCT_SYNC_COMPLETE',
          message: `Synced ${result.total} products`,
          data: result
        });
      }
      
      this.isRunning = false;
      return result;
    } catch (error) {
      this.isRunning = false;
      logger.error('Product sync job failed:', error);
      
      await sendNotification({
        type: 'PRODUCT_SYNC_FAILED',
        message: 'Product sync failed',
        error: error.message
      });
      
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.calculateNextRun()
    };
  }

  calculateNextRun() {
    if (!this.lastRun) return null;
    
    const nextRun = new Date(this.lastRun);
    nextRun.setHours(nextRun.getHours() + 1); // Run every hour
    
    return nextRun;
  }
}

module.exports = new ProductSyncJob();
