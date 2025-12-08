const orderService = require('../services/shopee/orderService');
const excelService = require('../services/excelService');
const { paginate, paginationResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

// Get all orders with pagination
const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;
    const { limit: limitNum, offset } = paginate(page, limit);
    
    const where = {};
    
    if (status) {
      where.orderStatus = status;
    }
    
    if (search) {
      where[Op.or] = [
        { orderSn: { [Op.like]: `%${search}%` } },
        { buyerUsername: { [Op.like]: `%${search}%` } },
      ];
    }
    
    if (startDate && endDate) {
      where.createTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    
    const { rows: orders, count: total } = await Order.findAndCountAll({
      where,
      limit: limitNum,
      offset,
      order: [['createTime', 'DESC']],
      include: ['items'],
    });
    
    res.json(paginationResponse(orders, total, page, limit));
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await Order.findByPk(id, {
      include: ['items'],
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    
    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get sales report
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    const report = await orderService.getSalesReport(start, end);
    
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await Order.findByPk(id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }
    
    order.orderStatus = status;
    await order.save();
    
    logger.info(`Order ${id} status updated to ${status}`);
    
    res.json({
      success: true,
      message: 'Order status updated',
      data: order,
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Export orders to Excel
const exportOrders = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    
    const where = {};
    
    if (status) {
      where.orderStatus = status;
    }
    
    if (startDate && endDate) {
      where.createTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    
    const orders = await Order.findAll({
      where,
      order: [['createTime', 'DESC']],
      include: ['items'],
    });
    
    const filePath = await excelService.exportOrders(orders);
    
    res.download(filePath);
  } catch (error) {
    logger.error('Export orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Sync orders from Shopee
const syncOrders = async (req, res) => {
  try {
    const result = await orderService.syncOrders();
    
    res.json({
      success: true,
      message: 'Orders synced successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Sync orders error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const Order = require('../models/Order');
const { Op } = require('sequelize');

module.exports = {
  getOrders,
  getOrderById,
  getSalesReport,
  updateOrderStatus,
  exportOrders,
  syncOrders,
};
