const emailService = require('./emailService');
const logger = require('../utils/logger');
const { NOTIFICATION_TYPE } = require('../utils/constants');

class NotificationService {
  constructor() {
    this.recipients = (process.env.NOTIFICATION_EMAILS || '').split(',').filter(Boolean);
  }
  
  // Send notification based on type
  async send(type, data) {
    try {
      if (this.recipients.length === 0) {
        logger.warn('No notification recipients configured');
        return;
      }
      
      switch (type) {
        case NOTIFICATION_TYPE.LOW_STOCK:
          await this.sendLowStockNotification(data);
          break;
        case NOTIFICATION_TYPE.ORDER_NEW:
          await this.sendNewOrderNotification(data);
          break;
        case NOTIFICATION_TYPE.ORDER_CANCELLED:
          await this.sendCancellationNotification(data.ordersn, data.reason);
          break;
        case NOTIFICATION_TYPE.SYNC_COMPLETED:
          await this.sendSyncCompletedNotification(data);
          break;
        case NOTIFICATION_TYPE.SYNC_FAILED:
          await this.sendSyncFailedNotification(data);
          break;
        default:
          logger.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      logger.error('Send notification error:', error);
    }
  }
  
  // Low stock notification
  async sendLowStockNotification(products) {
    if (!Array.isArray(products) || products.length === 0) return;
    
    logger.info(`Sending low stock notification for ${products.length} products`);
    
    await emailService.sendLowStockAlert(products, this.recipients);
  }
  
  // New order notification
  async sendNewOrderNotification(order) {
    logger.info(`Sending new order notification: ${order.orderSn}`);
    
    const subject = `🛒 Order Baru: ${order.orderSn}`;
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>🛒 Order Baru Diterima</h2>
        <p><strong>Order SN:</strong> ${order.orderSn}</p>
        <p><strong>Pembeli:</strong> ${order.buyerUsername}</p>
        <p><strong>Total:</strong> ${order.totalAmountFormatted}</p>
        <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
      </div>
    `;
    
    for (const recipient of this.recipients) {
      await emailService.send(recipient, subject, html);
    }
  }
  
  // Order notification (status change)
  async sendOrderNotification(ordersn, status) {
    logger.info(`Sending order status notification: ${ordersn} -> ${status}`);
    
    const subject = `📦 Status Order: ${ordersn}`;
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2>📦 Update Status Order</h2>
        <p><strong>Order SN:</strong> ${ordersn}</p>
        <p><strong>Status Baru:</strong> ${status}</p>
        <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
      </div>
    `;
    
    for (const recipient of this.recipients) {
      await emailService.send(recipient, subject, html);
    }
  }
  
  // Cancellation notification
  async sendCancellationNotification(ordersn, reason) {
    logger.info(`Sending cancellation notification: ${ordersn}`);
    
    const subject = `❌ Order Dibatalkan: ${ordersn}`;
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color: #dc3545;">❌ Order Dibatalkan</h2>
        <p><strong>Order SN:</strong> ${ordersn}</p>
        <p><strong>Alasan:</strong> ${reason || 'Tidak ada alasan'}</p>
        <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
      </div>
    `;
    
    for (const recipient of this.recipients) {
      await emailService.send(recipient, subject, html);
    }
  }
  
  // Sync completed notification
  async sendSyncCompletedNotification(data) {
    logger.info('Sending sync completed notification');
    
    await emailService.sendSyncNotification(
      data.type,
      'success',
      `Synced ${data.count || 0} items`,
      this.recipients
    );
  }
  
  // Sync failed notification
  async sendSyncFailedNotification(data) {
    logger.info('Sending sync failed notification');
    
    await emailService.sendSyncNotification(
      data.type,
      'failed',
      data.error || 'Unknown error',
      this.recipients
    );
  }
  
  // Daily report
  async sendDailyReport(report) {
    if (this.recipients.length === 0) return;
    
    logger.info('Sending daily report');
    
    await emailService.sendDailyReport(report, this.recipients);
  }
}

module.exports = new NotificationService();
