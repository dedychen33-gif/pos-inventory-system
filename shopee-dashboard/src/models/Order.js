const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ordersn: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false
  },
  shopee_order_id: {
    type: DataTypes.BIGINT,
    unique: true,
    allowNull: false
  },
  order_status: {
    type: DataTypes.ENUM(
      'UNPAID',
      'READY_TO_SHIP',
      'PROCESSED',
      'SHIPPED',
      'COMPLETED',
      'CANCELLED',
      'TO_CONFIRM_RECEIVE',
      'IN_CANCEL'
    ),
    allowNull: false
  },
  cancel_reason: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  cancel_user: {
    type: DataTypes.ENUM('BUYER', 'SELLER', 'SYSTEM'),
    allowNull: true
  },
  create_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  update_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  paid_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ship_by_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  buyer_username: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  buyer_user_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  buyer_email: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  recipient_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  recipient_phone: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  recipient_address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  recipient_district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  recipient_city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  recipient_province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  recipient_postal_code: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  shipping_carrier: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tracking_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  estimated_shipping_fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  actual_shipping_fee: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  shipping_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  voucher_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  seller_voucher_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  shopee_voucher_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  escrow_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  paid_amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0
  },
  note: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  days_to_ship: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  voucher_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  items_summary: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  last_sync_time: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'shopee_orders',
  indexes: [
    {
      fields: ['order_status']
    },
    {
      fields: ['create_time']
    },
    {
      fields: ['buyer_user_id']
    },
    {
      fields: ['total_amount']
    },
    {
      fields: ['tracking_number']
    }
  ]
});

module.exports = Order;
