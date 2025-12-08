const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProductVariation = sequelize.define('ProductVariation', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  productId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'product_id',
  },
  shopeeModelId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'shopee_model_id',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  originalPrice: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'original_price',
  },
  tierIndex: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'tier_index',
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'deleted'),
    defaultValue: 'active',
  },
}, {
  tableName: 'product_variations',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['shopee_model_id'] },
    { fields: ['sku'] },
    { fields: ['status'] },
  ],
});

module.exports = ProductVariation;
