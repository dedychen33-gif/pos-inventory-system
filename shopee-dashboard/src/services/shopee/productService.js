const axios = require('axios');
const shopeeConfig = require('../../config/shopee');
const logger = require('../../utils/logger');
const Product = require('../../models/Product');
const ProductVariation = require('../../models/ProductVariation');

class ProductService {
  constructor() {
    this.baseURL = shopeeConfig.baseURL;
  }

  async fetchProductsFromShopee(offset = 0, pageSize = 100) {
    try {
      const path = '/product/get_item_list';
      const params = shopeeConfig.getAuthParams(path);
      
      const response = await axios.post(
        `${this.baseURL}${path}`,
        {
          offset,
          page_size: pageSize,
          item_status: 'NORMAL',
          update_time_from: Math.floor(Date.now() / 1000) - 86400 // 1 hari
        },
        { params }
      );

      shopeeConfig.validateResponse(response.data);

      return {
        items: response.data.response.item_list || [],
        has_next: response.data.response.has_next_page || false,
        total: response.data.response.total_count || 0
      };
    } catch (error) {
      logger.error('Error fetching products from Shopee:', error);
      throw error;
    }
  }

  async fetchProductDetails(itemIds) {
    try {
      const path = '/product/get_item_base_info';
      const params = shopeeConfig.getAuthParams(path);

      const response = await axios.post(
        `${this.baseURL}${path}`,
        {
          item_id_list: Array.isArray(itemIds) ? itemIds : [itemIds]
        },
        { params }
      );

      shopeeConfig.validateResponse(response.data);

      return response.data.response.item_list || [];
    } catch (error) {
      logger.error('Error fetching product details:', error);
      throw error;
    }
  }

  async syncProductsToDatabase() {
    try {
      let offset = 0;
      const pageSize = 100;
      let totalSynced = 0;
      let hasNext = true;

      while (hasNext) {
        logger.info(`Syncing products from offset ${offset}`);
        
        const { items, has_next } = await this.fetchProductsFromShopee(offset, pageSize);
        
        for (const item of items) {
          await this.upsertProduct(item);
          totalSynced++;
        }

        hasNext = has_next;
        offset += pageSize;

        // Delay to avoid rate limiting
        if (hasNext) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(`Product sync completed. Total synced: ${totalSynced}`);
      return { success: true, total: totalSynced };
    } catch (error) {
      logger.error('Error syncing products:', error);
      throw error;
    }
  }

  async upsertProduct(shopeeItem) {
    const transaction = await Product.sequelize.transaction();
    
    try {
      // Prepare product data
      const productData = {
        shopee_item_id: shopeeItem.item_id,
        shopee_shop_id: shopeeConfig.shopId,
        item_sku: shopeeItem.item_sku || null,
        item_name: shopeeItem.item_name,
        item_status: shopeeItem.item_status,
        category_id: shopeeItem.category_id || null,
        category_name: shopeeItem.category_name || null,
        description: shopeeItem.description || null,
        main_image_url: shopeeItem.image?.image_url_list?.[0] || null,
        image_urls: shopeeItem.image?.image_url_list || [],
        original_price: parseFloat(shopeeItem.price_info?.[0]?.original_price) || 0,
        current_price: parseFloat(shopeeItem.price_info?.[0]?.current_price) || 0,
        has_variation: shopeeItem.has_variation || false,
        variation_count: shopeeItem.variation_count || 0,
        weight_kg: parseFloat(shopeeItem.weight) || null,
        total_stock: shopeeItem.stock_info?.reduce((sum, stock) => sum + stock.normal_stock, 0) || 0,
        sold_count: shopeeItem.sold_count || 0,
        view_count: shopeeItem.view_count || 0,
        like_count: shopeeItem.like_count || 0,
        brand: shopeeItem.brand?.brand_name || null,
        rating_star: parseFloat(shopeeItem.item_rating?.rating_star) || 0,
        rating_count: shopeeItem.item_rating?.rating_count || 0,
        attributes: shopeeItem.attributes || {},
        logistics_info: shopeeItem.logistics || [],
        wholesales: shopeeItem.wholesales || [],
        created_time: new Date(shopeeItem.create_time * 1000),
        updated_time: new Date(shopeeItem.update_time * 1000),
        last_sync_time: new Date()
      };

      // Find or create product
      const [product, created] = await Product.findOrCreate({
        where: { shopee_item_id: shopeeItem.item_id },
        defaults: productData,
        transaction
      });

      if (!created) {
        await product.update(productData, { transaction });
      }

      // Handle variations if exists
      if (shopeeItem.has_variation && shopeeItem.models) {
        await this.syncProductVariations(product.id, shopeeItem.models, transaction);
      }

      await transaction.commit();
      
      return {
        product_id: product.id,
        shopee_item_id: product.shopee_item_id,
        action: created ? 'created' : 'updated'
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error upserting product ${shopeeItem.item_id}:`, error);
      throw error;
    }
  }

  async syncProductVariations(productId, variations, transaction) {
    for (const variation of variations) {
      const variationData = {
        product_id: productId,
        shopee_model_id: variation.model_id,
        model_name: variation.model_name || 'Default',
        model_sku: variation.model_sku || null,
        normal_stock: variation.stock_info?.normal_stock || 0,
        reserved_stock: variation.stock_info?.reserved_stock || 0,
        sold_stock: variation.sold_stock || 0,
        original_price: parseFloat(variation.price_info?.original_price) || 0,
        current_price: parseFloat(variation.price_info?.current_price) || 0,
        model_status: variation.model_status || 'NORMAL',
        tier_index: variation.tier_index || null,
        price_before_discount: parseFloat(variation.price_before_discount) || null,
        model_images: variation.model_images || []
      };

      await ProductVariation.findOrCreate({
        where: { shopee_model_id: variation.model_id },
        defaults: variationData,
        transaction
      });
    }
  }

  async getLowStockProducts(threshold = 10) {
    try {
      const products = await Product.findAll({
        where: {
          item_status: 'NORMAL',
          total_stock: {
            [Product.sequelize.Op.lte]: threshold
          }
        },
        order: [['total_stock', 'ASC']],
        include: [{
          model: ProductVariation,
          as: 'variations'
        }]
      });

      return products.map(product => ({
        id: product.id,
        shopee_item_id: product.shopee_item_id,
        item_name: product.item_name,
        item_sku: product.item_sku,
        current_price: product.current_price,
        total_stock: product.total_stock,
        last_sync_time: product.last_sync_time,
        variations: product.variations?.map(v => ({
          model_name: v.model_name,
          normal_stock: v.normal_stock,
          current_price: v.current_price
        }))
      }));
    } catch (error) {
      logger.error('Error getting low stock products:', error);
      throw error;
    }
  }

  async getProductSalesReport(startDate, endDate) {
    try {
      // This would join with orders to get sales data
      const query = `
        SELECT 
          p.id,
          p.shopee_item_id,
          p.item_name,
          p.item_sku,
          COUNT(oi.id) as total_orders,
          SUM(oi.quantity) as total_sold,
          SUM(oi.item_total) as total_revenue,
          AVG(p.current_price) as avg_price,
          p.total_stock as current_stock
        FROM shopee_products p
        LEFT JOIN shopee_order_items oi ON p.shopee_item_id = oi.shopee_item_id
        LEFT JOIN shopee_orders o ON oi.ordersn = o.ordersn
        WHERE o.create_time BETWEEN :startDate AND :endDate
          AND o.order_status = 'COMPLETED'
        GROUP BY p.id, p.shopee_item_id, p.item_name, p.item_sku, p.total_stock
        ORDER BY total_sold DESC
      `;

      const results = await Product.sequelize.query(query, {
        replacements: { startDate, endDate },
        type: Product.sequelize.QueryTypes.SELECT
      });

      return results;
    } catch (error) {
      logger.error('Error getting product sales report:', error);
      throw error;
    }
  }
}

module.exports = new ProductService();
