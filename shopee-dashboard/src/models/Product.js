const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  shopee_item_id: {
    type: DataTypes.BIGINT,
    unique: true,
    allowNull: false
  },
  shopee_shop_id: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  item_sku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  item_name: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  item_status: {
    type: DataTypes.ENUM('NORMAL', 'BANNED', 'DELETED', 'UNLIST'),
    defaultValue: 'NORMAL'
  },
  category_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  category_name: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  main_image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  image_urls: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  original_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  current_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  discounted_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  has_variation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  variation_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  weight_kg: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: true
  },
  length_cm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  width_cm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  height_cm: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  total_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sold_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  like_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  condition: {
    type: DataTypes.ENUM('NEW', 'USED'),
    defaultValue: 'NEW'
  },
  brand: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  rating_star: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0
  },
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  attributes: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  logistics_info: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  wholesales: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  pre_order_info: {
    type: DataTypes.JSON,
    defaultValue: null
  },
  created_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updated_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  last_sync_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'shopee_products',
  indexes: [
    {
      fields: ['item_sku']
    },
    {
      fields: ['item_status']
    },
    {
      fields: ['current_price']
    },
    {
      fields: ['total_stock']
    },
    {
      fields: ['last_sync_time']
    }
  ]
});

module.exports = Product;
