const crypto = require('crypto');
const shopeeConfig = require('../../config/shopee');
const productService = require('./productService');
const orderService = require('./orderService');
const notificationService = require('../notificationService');
const logger = require('../../utils/logger');
const { WEBHOOK_EVENT } = require('../../utils/constants');

class WebhookService {
  // Verify webhook signature
  verifySignature(payload, signature) {
    const computed = crypto
      .createHmac('sha256', shopeeConfig.partnerKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return computed === signature;
  }
  
  // Handle incoming webhook
  async handleWebhook(code, data, shopId) {
    logger.info(`Processing webhook event: ${code}`, { shopId });
    
    try {
      switch (code) {
        case WEBHOOK_EVENT.ORDER_STATUS:
          await this.handleOrderStatus(data, shopId);
          break;
        
        case WEBHOOK_EVENT.TRACKING_NO:
          await this.handleTrackingUpdate(data, shopId);
          break;
        
        case WEBHOOK_EVENT.SHOPEE_UPDATE:
          await this.handleShopeeUpdate(data, shopId);
          break;
        
        case WEBHOOK_EVENT.BUYER_CANCEL:
          await this.handleBuyerCancel(data, shopId);
          break;
        
        case WEBHOOK_EVENT.RESERVED_STOCK:
          await this.handleReservedStock(data, shopId);
          break;
        
        case WEBHOOK_EVENT.ITEM_PROMOTION:
          await this.handleItemPromotion(data, shopId);
          break;
        
        case WEBHOOK_EVENT.SHOP_UPDATE:
          await this.handleShopUpdate(data, shopId);
          break;
        
        default:
          logger.warn(`Unknown webhook event: ${code}`);
      }
    } catch (error) {
      logger.error(`Webhook handler error for event ${code}:`, error);
      throw error;
    }
  }
  
  // Handle order status change
  async handleOrderStatus(data, shopId) {
    const { ordersn, status } = data;
    
    logger.info(`Order status changed: ${ordersn} -> ${status}`);
    
    // Sync specific order
    await orderService.syncSingleOrder(ordersn);
    
    // Send notification
    await notificationService.sendOrderNotification(ordersn, status);
  }
  
  // Handle tracking number update
  async handleTrackingUpdate(data, shopId) {
    const { ordersn, tracking_no } = data;
    
    logger.info(`Tracking updated: ${ordersn} -> ${tracking_no}`);
    
    await orderService.updateTracking(ordersn, tracking_no);
  }
  
  // Handle Shopee system update
  async handleShopeeUpdate(data, shopId) {
    logger.info('Shopee system update received');
    
    // Trigger full sync
    await productService.syncProducts();
    await orderService.syncOrders();
  }
  
  // Handle buyer cancellation
  async handleBuyerCancel(data, shopId) {
    const { ordersn, reason } = data;
    
    logger.info(`Order cancelled by buyer: ${ordersn}`, { reason });
    
    // Update order status
    await orderService.syncSingleOrder(ordersn);
    
    // Restore stock
    await productService.restoreStock(ordersn);
    
    // Send notification
    await notificationService.sendCancellationNotification(ordersn, reason);
  }
  
  // Handle reserved stock
  async handleReservedStock(data, shopId) {
    const { item_id, reserved_stock } = data;
    
    logger.info(`Stock reserved for item: ${item_id}`);
    
    // Update product stock
    await productService.updateReservedStock(item_id, reserved_stock);
  }
  
  // Handle item promotion
  async handleItemPromotion(data, shopId) {
    const { item_id, promotion_id } = data;
    
    logger.info(`Item promotion update: ${item_id}`);
    
    // Sync product to get updated promotion info
    await productService.syncSingleProduct(item_id);
  }
  
  // Handle shop update
  async handleShopUpdate(data, shopId) {
    logger.info('Shop update received', { shopId });
    
    // Could update shop settings, etc.
  }
}

module.exports = new WebhookService();
