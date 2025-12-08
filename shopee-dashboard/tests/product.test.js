const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/config/database');
const Product = require('../src/models/Product');

describe('Product API', () => {
  let authToken;
  
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Create test product
    await Product.create({
      name: 'Test Product',
      sku: 'TEST-001',
      price: 100000,
      stock: 50,
      status: 'active',
    });
    
    // Get auth token (mock)
    authToken = 'test-token';
  });
  
  afterAll(async () => {
    await sequelize.close();
  });
  
  describe('GET /api/products', () => {
    it('should return list of products', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });
    
    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
    
    it('should support search', async () => {
      const res = await request(app)
        .get('/api/products?search=Test')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/products/:id', () => {
    it('should return a single product', async () => {
      const res = await request(app)
        .get('/api/products/1')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('name', 'Test Product');
    });
    
    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/9999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(404);
    });
  });
  
  describe('GET /api/products/low-stock', () => {
    it('should return low stock products', async () => {
      // Create low stock product
      await Product.create({
        name: 'Low Stock Product',
        sku: 'LOW-001',
        price: 50000,
        stock: 5,
        status: 'active',
      });
      
      const res = await request(app)
        .get('/api/products/low-stock')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
  
  describe('PUT /api/products/:id/stock', () => {
    it('should update product stock', async () => {
      const res = await request(app)
        .put('/api/products/1/stock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stock: 100 });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
    
    it('should reject negative stock', async () => {
      const res = await request(app)
        .put('/api/products/1/stock')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stock: -10 });
      
      expect(res.statusCode).toBe(400);
    });
  });
});
