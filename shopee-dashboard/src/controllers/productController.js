const { Sequelize } = require('sequelize');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const InventoryLog = require('../models/InventoryLog');
const productService = require('../services/shopee/productService');
const excelService = require('../services/excelService');
const logger = require('../utils/logger');

class ProductController {
  async getAllProducts(req, res, next) {
    try {
      const { 
        page = 1, 
        limit = 50,
        search = '',
        status = '',
        minPrice = '',
        maxPrice = '',
        minStock = '',
        sortBy = 'updated_time',
        sortOrder = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause
      const where = {};
      if (status) where.item_status = status;
      if (minPrice) where.current_price = { [Sequelize.Op.gte]: parseFloat(minPrice) };
      if (maxPrice) where.current_price = { ...where.current_price, [Sequelize.Op.lte]: parseFloat(maxPrice) };
      if (minStock) where.total_stock = { [Sequelize.Op.lte]: parseInt(minStock) };

      if (search) {
        where[Sequelize.Op.or] = [
          { item_name: { [Sequelize.Op.like]: `%${search}%` } },
          { item_sku: { [Sequelize.Op.like]: `%${search}%` } },
          { brand: { [Sequelize.Op.like]: `%${search}%` } }
        ];
      }

      const products = await Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [[sortBy, sortOrder]],
        include: [{
          model: ProductVariation,
          as: 'variations'
        }]
      });

      res.json({
        success: true,
        data: products.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: products.count,
          pages: Math.ceil(products.count / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async syncProducts(req, res, next) {
    try {
      logger.info('Manual product sync requested');
      
      // Run sync in background
      productService.syncProductsToDatabase()
        .then(result => {
          logger.info('Background product sync completed:', result);
        })
        .catch(error => {
          logger.error('Background product sync failed:', error);
        });

      res.json({
        success: true,
        message: 'Product sync started in background. This may take a few minutes.'
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductDetails(req, res, next) {
    try {
      const { id } = req.params;
      
      const product = await Product.findOne({
        where: { shopee_item_id: id },
        include: [{
          model: ProductVariation,
          as: 'variations'
        }]
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Get sales data for this product
      const salesData = await productService.getProductSalesReport(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      );

      res.json({
        success: true,
        data: {
          product,
          sales_data: salesData.find(item => item.shopee_item_id == id) || {}
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getLowStockReport(req, res, next) {
    try {
      const threshold = req.query.threshold || 10;
      
      const lowStockProducts = await productService.getLowStockProducts(threshold);

      res.json({
        success: true,
        data: lowStockProducts,
        threshold,
        total: lowStockProducts.length
      });
    } catch (error) {
      next(error);
    }
  }

  async exportProducts(req, res, next) {
    try {
      const { format = 'excel' } = req.query;
      
      const products = await Product.findAll({
        include: [{
          model: ProductVariation,
          as: 'variations'
        }]
      });

      let filePath;
      let fileName;

      if (format === 'excel') {
        const result = await excelService.exportProductsToExcel(products);
        filePath = result.filePath;
        fileName = result.fileName;
      } else if (format === 'csv') {
        const result = await excelService.exportProductsToCSV(products);
        filePath = result.filePath;
        fileName = result.fileName;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported format. Use excel or csv'
        });
      }

      res.download(filePath, fileName, (err) => {
        if (err) {
          logger.error('Error downloading file:', err);
        }
        // Optionally delete file after download
        // fs.unlinkSync(filePath);
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProductStock(req, res, next) {
    try {
      const { productId } = req.params;
      const { stock, variationStocks } = req.body;

      const product = await Product.findOne({
        where: { shopee_item_id: productId }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Update main product stock
      if (stock !== undefined) {
        await product.update({
          total_stock: parseInt(stock),
          last_sync_time: new Date()
        });
      }

      // Update variation stocks
      if (variationStocks && Array.isArray(variationStocks)) {
        for (const variationStock of variationStocks) {
          const variation = await ProductVariation.findOne({
            where: {
              product_id: product.id,
              shopee_model_id: variationStock.modelId
            }
          });

          if (variation) {
            await variation.update({
              normal_stock: parseInt(variationStock.stock)
            });
          }
        }
      }

      // Log inventory change
      await InventoryLog.create({
        shopee_item_id: productId,
        change_type: 'MANUAL_ADJUSTMENT',
        previous_stock: product.total_stock,
        new_stock: stock || product.total_stock,
        changed_by: req.user?.id || 'SYSTEM',
        notes: req.body.notes || 'Manual stock adjustment'
      });

      res.json({
        success: true,
        message: 'Product stock updated successfully',
        data: { product }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProductController();
