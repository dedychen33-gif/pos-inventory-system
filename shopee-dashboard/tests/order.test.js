const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');

describe('Order API', () => {
  let authToken;
  
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create test order
    const order = await Order.create({
      shopeeOrderId: 123456789,
      orderSn: 'TEST123456789',
      orderStatus: 'COMPLETED',
      buyerUsername: 'testbuyer',
      totalAmount: 150000,
      shippingFee: 10000,
      createTime: new Date(),
    });
    
    // Create order items
    await OrderItem.create({
      orderId: order.id,
      productName: 'Test Product',
      quantity: 2,
      price: 70000,
      subtotal: 140000,
    });
    
    // Get auth token (mock)
    authToken = 'test-token';
  });
  
  afterAll(async () => {
    await sequelize.close();
  });
  
  describe('GET /api/orders', () => {
    it('should return list of orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });
    
    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(1);
    });
    
    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/orders?status=COMPLETED')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      res.body.data.forEach(order => {
        expect(order.orderStatus).toBe('COMPLETED');
      });
    });
  });
  
  describe('GET /api/orders/:id', () => {
    it('should return a single order with items', async () => {
      const res = await request(app)
        .get('/api/orders/1')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('orderSn', 'TEST123456789');
      expect(res.body.data).toHaveProperty('items');
    });
    
    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get('/api/orders/9999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(404);
    });
  });
  
  describe('GET /api/orders/report', () => {
    it('should return sales report', async () => {
      const res = await request(app)
        .get('/api/orders/report')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('totalOrders');
      expect(res.body.data).toHaveProperty('totalRevenue');
    });
    
    it('should support date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const res = await request(app)
        .get(`/api/orders/report?startDate=${startDate.toISOString()}&endDate=${new Date().toISOString()}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
    });
  });
  
  describe('PUT /api/orders/:id/status', () => {
    it('should update order status', async () => {
      const res = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'SHIPPED' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.orderStatus).toBe('SHIPPED');
    });
    
    it('should reject empty status', async () => {
      const res = await request(app)
        .put('/api/orders/1/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      
      expect(res.statusCode).toBe(400);
    });
  });
});
