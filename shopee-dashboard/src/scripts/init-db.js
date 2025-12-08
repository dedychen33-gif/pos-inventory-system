const { sequelize } = require('../config/database');
const Product = require('../models/Product');
const ProductVariation = require('../models/ProductVariation');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const InventoryLog = require('../models/InventoryLog');

const initDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Define associations
    Product.hasMany(ProductVariation, { 
      foreignKey: 'productId', 
      as: 'variations' 
    });
    ProductVariation.belongsTo(Product, { 
      foreignKey: 'productId' 
    });
    
    Order.hasMany(OrderItem, { 
      foreignKey: 'orderId', 
      as: 'items' 
    });
    OrderItem.belongsTo(Order, { 
      foreignKey: 'orderId' 
    });
    
    Product.hasMany(InventoryLog, { 
      foreignKey: 'productId', 
      as: 'inventoryLogs' 
    });
    InventoryLog.belongsTo(Product, { 
      foreignKey: 'productId' 
    });
    
    console.log('Syncing database tables...');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    
    console.log('Database tables synchronized successfully.');
    
    // Check tables
    const [tables] = await sequelize.query('SHOW TABLES');
    console.log('\nCreated tables:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    console.log('\nDatabase initialization completed!');
    
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();
