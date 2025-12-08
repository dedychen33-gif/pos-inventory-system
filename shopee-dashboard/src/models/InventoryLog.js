const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryLog = sequelize.define('InventoryLog', {
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
  variationId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'variation_id',
  },
  type: {
    type: DataTypes.ENUM('in', 'out', 'adjustment', 'sync', 'return'),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stockBefore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stock_before',
  },
  stockAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'stock_after',
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Order ID, PO number, etc.',
  },
  reason: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'created_by',
  },
  source: {
    type: DataTypes.ENUM('manual', 'shopee', 'system', 'pos'),
    defaultValue: 'manual',
  },
}, {
  tableName: 'inventory_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['variation_id'] },
    { fields: ['type'] },
    { fields: ['created_at'] },
    { fields: ['reference'] },
  ],
});

module.exports = InventoryLog;
