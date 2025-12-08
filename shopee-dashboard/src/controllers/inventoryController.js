const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const InventoryLog = require('../models/InventoryLog');
const { paginate, paginationResponse } = require('../utils/helpers');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// Get inventory list
const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, lowStock } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);
    
    const where = { status: 'active' };
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { sku: { [Op.like]: `%${search}%` } },
      ];
    }
    
    if (lowStock === 'true') {
      where.stock = { [Op.lte]: 10 };
    }
    
    const { rows: products, count: total } = await Product.findAndCountAll({
      where,
      attributes: ['id', 'name', 'sku', 'stock', 'price', 'image', 'shopeeItemId'],
      limit: limitNum,
      offset,
      order: [['stock', 'ASC']],
    });
    
    res.json(paginationResponse(products, total, page, limit));
  } catch (error) {
    logger.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update stock
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, type, reason } = req.body;
    
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    
    const stockBefore = product.stock;
    let stockAfter = stockBefore;
    
    switch (type) {
      case 'in':
        stockAfter = stockBefore + quantity;
        break;
      case 'out':
        stockAfter = stockBefore - quantity;
        break;
      case 'adjustment':
        stockAfter = quantity;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid stock update type',
        });
    }
    
    if (stockAfter < 0) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock',
      });
    }
    
    // Update product stock
    product.stock = stockAfter;
    await product.save();
    
    // Create inventory log
    await InventoryLog.create({
      productId: id,
      type,
      quantity,
      stockBefore,
      stockAfter,
      reason,
      createdBy: req.user?.username || 'system',
      source: 'manual',
    });
    
    logger.info(`Stock updated for product ${id}: ${stockBefore} -> ${stockAfter}`);
    
    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        productId: id,
        stockBefore,
        stockAfter,
        difference: stockAfter - stockBefore,
      },
    });
  } catch (error) {
    logger.error('Update stock error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get inventory logs
const getInventoryLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, productId, type, startDate, endDate } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);
    
    const where = {};
    
    if (productId) {
      where.productId = productId;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    
    const { rows: logs, count: total } = await InventoryLog.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Product,
        attributes: ['id', 'name', 'sku'],
      }],
    });
    
    res.json(paginationResponse(logs, total, page, limit));
  } catch (error) {
    logger.error('Get inventory logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Bulk update stock
const bulkUpdateStock = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }
    
    const results = [];
    
    for (const item of items) {
      const { productId, quantity, type, reason } = item;
      
      const product = await Product.findByPk(productId);
      if (!product) {
        results.push({ productId, success: false, message: 'Product not found' });
        continue;
      }
      
      const stockBefore = product.stock;
      let stockAfter = type === 'in' ? stockBefore + quantity :
                       type === 'out' ? stockBefore - quantity : quantity;
      
      if (stockAfter < 0) {
        results.push({ productId, success: false, message: 'Insufficient stock' });
        continue;
      }
      
      product.stock = stockAfter;
      await product.save();
      
      await InventoryLog.create({
        productId,
        type,
        quantity,
        stockBefore,
        stockAfter,
        reason,
        createdBy: req.user?.username || 'system',
        source: 'manual',
      });
      
      results.push({ productId, success: true, stockBefore, stockAfter });
    }
    
    res.json({
      success: true,
      message: 'Bulk update completed',
      data: results,
    });
  } catch (error) {
    logger.error('Bulk update stock error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getInventory,
  updateStock,
  getInventoryLogs,
  bulkUpdateStock,
};
