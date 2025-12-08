const cron = require('node-cron');
const logger = require('../utils/logger');
const productSyncJob = require('./syncProducts');
const orderSyncJob = require('./syncOrders');
const inventoryCheckJob = require('./inventoryCheck');

class Scheduler {
  constructor() {
    this.jobs = [];
  }

  start() {
    logger.info('Starting scheduled jobs...');
    
    // Sync products every hour
    this.jobs.push(cron.schedule('0 * * * *', async () => {
      try {
        await productSyncJob.run();
      } catch (error) {
        logger.error('Scheduled product sync failed:', error);
      }
    }));
    
    // Sync orders every 30 minutes
    this.jobs.push(cron.schedule('*/30 * * * *', async () => {
      try {
        await orderSyncJob.run();
      } catch (error) {
        logger.error('Scheduled order sync failed:', error);
      }
    }));
    
    // Check inventory every 6 hours
    this.jobs.push(cron.schedule('0 */6 * * *', async () => {
      try {
        await inventoryCheckJob.run();
      } catch (error) {
        logger.error('Scheduled inventory check failed:', error);
      }
    }));
    
    // Generate daily report at 23:59
    this.jobs.push(cron.schedule('59 23 * * *', async () => {
      try {
        await this.generateDailyReport();
      } catch (error) {
        logger.error('Daily report generation failed:', error);
      }
    }));
    
    logger.info(`Started ${this.jobs.length} scheduled jobs`);
  }
  
  async generateDailyReport() {
    logger.info('Generating daily report...');
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Generate and save daily report
    // This would typically save to database or send via email
    
    logger.info('Daily report generated');
  }
  
  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('All scheduled jobs stopped');
  }
}

module.exports = new Scheduler();
