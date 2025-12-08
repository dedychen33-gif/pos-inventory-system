const Product = require('../models/Product');
const Order = require('../models/Order');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');
const { formatCurrency } = require('../utils/helpers');

// Get dashboard summary
const getSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Total products
    const totalProducts = await Product.count({
      where: { status: 'active' },
    });
    
    // Low stock products
    const lowStockProducts = await Product.count({
      where: {
        status: 'active',
        stock: { [Op.lte]: 10 },
      },
    });
    
    // Out of stock products
    const outOfStockProducts = await Product.count({
      where: {
        status: 'active',
        stock: 0,
      },
    });
    
    // Today orders
    const todayOrders = await Order.count({
      where: {
        createTime: { [Op.gte]: today },
      },
    });
    
    // Today revenue
    const todayRevenue = await Order.sum('totalAmount', {
      where: {
        createTime: { [Op.gte]: today },
        orderStatus: 'COMPLETED',
      },
    }) || 0;
    
    // Monthly orders
    const monthlyOrders = await Order.count({
      where: {
        createTime: { [Op.gte]: startOfMonth },
      },
    });
    
    // Monthly revenue
    const monthlyRevenue = await Order.sum('totalAmount', {
      where: {
        createTime: { [Op.gte]: startOfMonth },
        orderStatus: 'COMPLETED',
      },
    }) || 0;
    
    // Pending orders
    const pendingOrders = await Order.count({
      where: {
        orderStatus: { [Op.in]: ['UNPAID', 'READY_TO_SHIP', 'PROCESSED'] },
      },
    });
    
    res.json({
      success: true,
      data: {
        products: {
          total: totalProducts,
          lowStock: lowStockProducts,
          outOfStock: outOfStockProducts,
        },
        orders: {
          today: todayOrders,
          monthly: monthlyOrders,
          pending: pendingOrders,
        },
        revenue: {
          today: todayRevenue,
          todayFormatted: formatCurrency(todayRevenue),
          monthly: monthlyRevenue,
          monthlyFormatted: formatCurrency(monthlyRevenue),
        },
      },
    });
  } catch (error) {
    logger.error('Get dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get sales chart data
const getChartData = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);
    
    let groupBy, dateFormat;
    
    switch (period) {
      case 'weekly':
        groupBy = fn('YEARWEEK', col('create_time'));
        dateFormat = '%Y-W%u';
        break;
      case 'monthly':
        groupBy = fn('DATE_FORMAT', col('create_time'), '%Y-%m');
        dateFormat = '%Y-%m';
        break;
      default: // daily
        groupBy = fn('DATE', col('create_time'));
        dateFormat = '%Y-%m-%d';
    }
    
    const salesData = await Order.findAll({
      where: {
        createTime: { [Op.gte]: startDate },
        orderStatus: 'COMPLETED',
      },
      attributes: [
        [fn('DATE_FORMAT', col('create_time'), dateFormat), 'date'],
        [fn('COUNT', col('id')), 'orders'],
        [fn('SUM', col('total_amount')), 'revenue'],
      ],
      group: [fn('DATE_FORMAT', col('create_time'), dateFormat)],
      order: [[fn('DATE_FORMAT', col('create_time'), dateFormat), 'ASC']],
      raw: true,
    });
    
    // Order status distribution
    const statusDistribution = await Order.findAll({
      where: {
        createTime: { [Op.gte]: startDate },
      },
      attributes: [
        'orderStatus',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['orderStatus'],
      raw: true,
    });
    
    // Top selling products
    const topProducts = await Order.findAll({
      where: {
        createTime: { [Op.gte]: startDate },
        orderStatus: 'COMPLETED',
      },
      attributes: [
        [fn('SUM', col('total_amount')), 'totalSales'],
      ],
      include: [{
        model: require('../models/OrderItem'),
        as: 'items',
        attributes: ['productName'],
      }],
      group: ['items.product_name'],
      order: [[literal('totalSales'), 'DESC']],
      limit: 10,
      raw: true,
    });
    
    res.json({
      success: true,
      data: {
        salesChart: salesData,
        statusDistribution,
        topProducts,
      },
    });
  } catch (error) {
    logger.error('Get chart data error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getSummary,
  getChartData,
};
