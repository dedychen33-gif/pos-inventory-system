const axios = require('axios');
const shopeeConfig = require('../../config/shopee');
const logger = require('../../utils/logger');
const Order = require('../../models/Order');
const OrderItem = require('../../models/OrderItem');

class OrderService {
  constructor() {
    this.baseURL = shopeeConfig.baseURL;
  }

  async fetchOrdersFromShopee(timeFrom, timeTo, status = 'COMPLETED', pageSize = 100, cursor = '') {
    try {
      const path = '/order/get_order_list';
      const params = shopeeConfig.getAuthParams(path);

      const requestBody = {
        time_range_field: 'create_time',
        time_from: timeFrom,
        time_to: timeTo,
        page_size: pageSize,
        cursor,
        order_status: status
      };

      const response = await axios.post(
        `${this.baseURL}${path}`,
        requestBody,
        { params }
      );

      shopeeConfig.validateResponse(response.data);

      return {
        orders: response.data.response.order_list || [],
        next_cursor: response.data.response.next_cursor || '',
        more: response.data.response.more || false
      };
    } catch (error) {
      logger.error('Error fetching orders from Shopee:', error);
      throw error;
    }
  }

  async fetchOrderDetails(ordersn) {
    try {
      const path = '/order/get_order_detail';
      const params = shopeeConfig.getAuthParams(path);

      const response = await axios.post(
        `${this.baseURL}${path}`,
        {
          ordersn_list: [ordersn],
          response_optional_fields: 'buyer_user_id,buyer_username,recipient_address,actual_shipping_fee,escrow_amount'
        },
        { params }
      );

      shopeeConfig.validateResponse(response.data);

      return response.data.response.order_list?.[0] || null;
    } catch (error) {
      logger.error(`Error fetching order details for ${ordersn}:`, error);
      throw error;
    }
  }

  async syncRecentOrders(hours = 24) {
    try {
      const timeFrom = Math.floor(Date.now() / 1000) - (hours * 3600);
      const timeTo = Math.floor(Date.now() / 1000);
      
      let cursor = '';
      let totalSynced = 0;
      let hasMore = true;

      while (hasMore) {
        const { orders, next_cursor, more } = await this.fetchOrdersFromShopee(
          timeFrom,
          timeTo,
          '', // Get all statuses
          100,
          cursor
        );

        for (const order of orders) {
          await this.upsertOrder(order);
          totalSynced++;
        }

        cursor = next_cursor;
        hasMore = more;

        // Rate limiting delay
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      logger.info(`Order sync completed. Total synced: ${totalSynced}`);
      return { success: true, total: totalSynced };
    } catch (error) {
      logger.error('Error syncing orders:', error);
      throw error;
    }
  }

  async upsertOrder(shopeeOrder) {
    const transaction = await Order.sequelize.transaction();
    
    try {
      // Parse recipient address
      const recipientAddress = shopeeOrder.recipient_address || {};
      
      const orderData = {
        ordersn: shopeeOrder.order_sn,
        shopee_order_id: shopeeOrder.order_id,
        order_status: shopeeOrder.order_status,
        cancel_reason: shopeeOrder.cancel_reason,
        cancel_user: shopeeOrder.cancel_user,
        create_time: new Date(shopeeOrder.create_time * 1000),
        update_time: new Date(shopeeOrder.update_time * 1000),
        paid_time: shopeeOrder.paid_time ? new Date(shopeeOrder.paid_time * 1000) : null,
        ship_by_date: shopeeOrder.ship_by_date ? new Date(shopeeOrder.ship_by_date * 1000) : null,
        buyer_username: shopeeOrder.buyer_username,
        buyer_user_id: shopeeOrder.buyer_user_id,
        buyer_email: shopeeOrder.buyer_email,
        recipient_name: recipientAddress.name || '',
        recipient_phone: recipientAddress.phone || '',
        recipient_address: `${recipientAddress.full_address || ''} ${recipientAddress.town || ''}`.trim(),
        recipient_district: recipientAddress.district || '',
        recipient_city: recipientAddress.city || '',
        recipient_province: recipientAddress.state || '',
        recipient_postal_code: recipientAddress.zipcode || '',
        shipping_carrier: shopeeOrder.shipping_carrier,
        tracking_number: shopeeOrder.tracking_no,
        estimated_shipping_fee: parseFloat(shopeeOrder.estimated_shipping_fee) || 0,
        actual_shipping_fee: parseFloat(shopeeOrder.actual_shipping_fee) || 0,
        payment_method: shopeeOrder.payment_method,
        total_amount: parseFloat(shopeeOrder.total_amount) || 0,
        discount_amount: parseFloat(shopeeOrder.discount_amount) || 0,
        shipping_amount: parseFloat(shopeeOrder.shipping_amount) || 0,
        voucher_amount: parseFloat(shopeeOrder.voucher_amount) || 0,
        seller_voucher_amount: parseFloat(shopeeOrder.seller_voucher_amount) || 0,
        shopee_voucher_amount: parseFloat(shopeeOrder.shopee_voucher_amount) || 0,
        escrow_amount: parseFloat(shopeeOrder.escrow_amount) || 0,
        paid_amount: parseFloat(shopeeOrder.paid_amount) || 0,
        note: shopeeOrder.note_to_seller,
        days_to_ship: shopeeOrder.days_to_ship || 3,
        voucher_code: shopeeOrder.voucher_code,
        items_summary: shopeeOrder.item_list?.map(item => ({
          item_id: item.item_id,
          item_name: item.item_name,
          model_name: item.model_name,
          quantity: item.model_quantity
        })) || [],
        last_sync_time: new Date()
      };

      // Find or create order
      const [order, created] = await Order.findOrCreate({
        where: { ordersn: shopeeOrder.order_sn },
        defaults: orderData,
        transaction
      });

      if (!created) {
        await order.update(orderData, { transaction });
      }

      // Sync order items
      if (shopeeOrder.item_list && shopeeOrder.item_list.length > 0) {
        await this.syncOrderItems(order.id, shopeeOrder.order_sn, shopeeOrder.item_list, transaction);
      }

      await transaction.commit();
      
      return {
        order_id: order.id,
        ordersn: order.ordersn,
        status: order.order_status,
        action: created ? 'created' : 'updated'
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error upserting order ${shopeeOrder.order_sn}:`, error);
      throw error;
    }
  }

  async syncOrderItems(orderId, ordersn, items, transaction) {
    for (const item of items) {
      const itemData = {
        order_id: orderId,
        ordersn: ordersn,
        shopee_item_id: item.item_id,
        shopee_model_id: item.model_id,
        item_name: item.item_name,
        model_name: item.model_name,
        quantity: item.model_quantity,
        original_price: parseFloat(item.model_original_price) || 0,
        discounted_price: parseFloat(item.model_discounted_price) || 0,
        item_discount: parseFloat(item.model_discounted_price) - parseFloat(item.model_original_price) || 0,
        item_total: parseFloat(item.model_discounted_price) * item.model_quantity,
        is_main_item: item.is_main_item || true,
        add_on_deal: item.add_on_deal || false,
        promotion_type: item.promotion_type,
        promotion_id: item.promotion_id,
        variation_image_url: item.image
      };

      await OrderItem.findOrCreate({
        where: {
          ordersn: ordersn,
          shopee_item_id: item.item_id,
          shopee_model_id: item.model_id
        },
        defaults: itemData,
        transaction
      });
    }
  }

  async getSalesReport(startDate, endDate) {
    try {
      const query = `
        SELECT 
          DATE(o.create_time) as date,
          COUNT(DISTINCT o.id) as total_orders,
          COUNT(oi.id) as total_items,
          SUM(o.total_amount) as total_revenue,
          SUM(o.shipping_amount) as total_shipping,
          SUM(o.voucher_amount) as total_voucher_discount,
          COUNT(DISTINCT o.buyer_user_id) as unique_customers,
          AVG(o.total_amount) as avg_order_value
        FROM shopee_orders o
        LEFT JOIN shopee_order_items oi ON o.ordersn = oi.ordersn
        WHERE o.create_time BETWEEN :startDate AND :endDate
          AND o.order_status = 'COMPLETED'
        GROUP BY DATE(o.create_time)
        ORDER BY date DESC
      `;

      const dailyReports = await Order.sequelize.query(query, {
        replacements: { startDate, endDate },
        type: Order.sequelize.QueryTypes.SELECT
      });

      // Get top selling products
      const topProductsQuery = `
        SELECT 
          p.item_name,
          p.item_sku,
          SUM(oi.quantity) as total_sold,
          SUM(oi.item_total) as total_revenue
        FROM shopee_order_items oi
        JOIN shopee_products p ON oi.shopee_item_id = p.shopee_item_id
        JOIN shopee_orders o ON oi.ordersn = o.ordersn
        WHERE o.create_time BETWEEN :startDate AND :endDate
          AND o.order_status = 'COMPLETED'
        GROUP BY p.item_name, p.item_sku
        ORDER BY total_sold DESC
        LIMIT 10
      `;

      const topProducts = await Order.sequelize.query(topProductsQuery, {
        replacements: { startDate, endDate },
        type: Order.sequelize.QueryTypes.SELECT
      });

      return {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          total_days: dailyReports.length,
          total_orders: dailyReports.reduce((sum, day) => sum + day.total_orders, 0),
          total_revenue: dailyReports.reduce((sum, day) => sum + parseFloat(day.total_revenue), 0),
          total_items: dailyReports.reduce((sum, day) => sum + day.total_items, 0),
          avg_daily_revenue: dailyReports.reduce((sum, day) => sum + parseFloat(day.total_revenue), 0) / dailyReports.length
        },
        daily_reports: dailyReports,
        top_products: topProducts
      };
    } catch (error) {
      logger.error('Error getting sales report:', error);
      throw error;
    }
  }

  async updateOrderStatus(ordersn, status, trackingNumber = null) {
    try {
      const path = '/order/update_order_status';
      const params = shopeeConfig.getAuthParams(path);

      const requestBody = {
        ordersn,
        order_status: status
      };

      if (trackingNumber) {
        requestBody.tracking_number = trackingNumber;
      }

      const response = await axios.post(
        `${this.baseURL}${path}`,
        requestBody,
        { params }
      );

      shopeeConfig.validateResponse(response.data);

      // Update local database
      const order = await Order.findOne({ where: { ordersn } });
      if (order) {
        await order.update({
          order_status: status,
          tracking_number: trackingNumber || order.tracking_number,
          update_time: new Date(),
          last_sync_time: new Date()
        });
      }

      return { success: true, message: 'Order status updated' };
    } catch (error) {
      logger.error(`Error updating order status for ${ordersn}:`, error);
      throw error;
    }
  }
}

module.exports = new OrderService();
