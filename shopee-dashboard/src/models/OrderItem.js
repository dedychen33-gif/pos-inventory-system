const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  orderId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'order_id',
  },
  shopeeItemId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'shopee_item_id',
  },
  shopeeModelId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'shopee_model_id',
  },
  productId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'product_id',
  },
  productName: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'product_name',
  },
  variationName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'variation_name',
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  discountedPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'discounted_price',
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  weight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url',
  },
}, {
  tableName: 'order_items',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['product_id'] },
    { fields: ['shopee_item_id'] },
    { fields: ['sku'] },
  ],
});

module.exports = OrderItem;
