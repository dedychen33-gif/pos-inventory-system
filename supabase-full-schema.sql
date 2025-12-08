-- =====================================================
-- POS & INVENTORY SYSTEM - COMPLETE DATABASE SCHEMA
-- Untuk Supabase (PostgreSQL)
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =====================================================

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== UNITS ====================
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  symbol VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  unit_id INTEGER REFERENCES units(id),
  cost_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  image_url TEXT,
  
  -- Shopee integration
  shopee_item_id BIGINT,
  shopee_model_id BIGINT,
  source VARCHAR(20) DEFAULT 'local', -- 'local', 'shopee', 'lazada', 'tiktok'
  is_variant BOOLEAN DEFAULT FALSE,
  parent_product_id INTEGER REFERENCES products(id),
  variant_name VARCHAR(255),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_shopee_item_id ON products(shopee_item_id);
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);

-- ==================== CUSTOMERS ====================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  customer_type VARCHAR(20) DEFAULT 'walk-in', -- 'walk-in', 'member', 'vip'
  points INTEGER DEFAULT 0,
  total_spent DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TRANSACTIONS (POS) ====================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  transaction_code VARCHAR(50) UNIQUE NOT NULL,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  customer_id INTEGER REFERENCES customers(id),
  
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR(20), -- 'percent', 'fixed'
  discount_value DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11, -- PPN 11%
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  
  payment_method VARCHAR(20) DEFAULT 'cash', -- 'cash', 'card', 'ewallet', 'transfer'
  payment_amount DECIMAL(15,2) DEFAULT 0,
  change_amount DECIMAL(15,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'void', 'pending'
  void_reason TEXT,
  notes TEXT,
  
  cashier_id INTEGER,
  cashier_name VARCHAR(100),
  
  source VARCHAR(20) DEFAULT 'pos', -- 'pos', 'shopee', 'lazada', 'tiktok'
  marketplace_order_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);

-- ==================== TRANSACTION ITEMS ====================
CREATE TABLE IF NOT EXISTS transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_code VARCHAR(50),
  product_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(15,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product ON transaction_items(product_id);

-- ==================== SHOPEE ORDERS ====================
CREATE TABLE IF NOT EXISTS shopee_orders (
  id SERIAL PRIMARY KEY,
  order_sn VARCHAR(50) UNIQUE NOT NULL,
  shop_id VARCHAR(50),
  
  buyer_username VARCHAR(100),
  buyer_phone VARCHAR(50),
  shipping_address TEXT,
  
  order_status VARCHAR(50),
  payment_method VARCHAR(50),
  
  subtotal DECIMAL(15,2) DEFAULT 0,
  shipping_fee DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  
  create_time TIMESTAMPTZ,
  update_time TIMESTAMPTZ,
  ship_by_date TIMESTAMPTZ,
  
  tracking_number VARCHAR(100),
  logistics_channel VARCHAR(100),
  
  is_synced_to_stock BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMPTZ,
  
  raw_data JSONB, -- Store original Shopee response
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopee_orders_status ON shopee_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_shopee_orders_create_time ON shopee_orders(create_time);

-- ==================== SHOPEE ORDER ITEMS ====================
CREATE TABLE IF NOT EXISTS shopee_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES shopee_orders(id) ON DELETE CASCADE,
  order_sn VARCHAR(50),
  
  item_id BIGINT,
  model_id BIGINT,
  item_name VARCHAR(255),
  model_name VARCHAR(255),
  item_sku VARCHAR(100),
  model_sku VARCHAR(100),
  
  quantity INTEGER DEFAULT 1,
  price DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  
  product_id INTEGER REFERENCES products(id), -- Link to local product
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopee_order_items_order ON shopee_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopee_order_items_sku ON shopee_order_items(item_sku);

-- ==================== STOCK MOVEMENTS ====================
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  product_sku VARCHAR(100),
  
  movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
  quantity INTEGER NOT NULL,
  stock_before INTEGER,
  stock_after INTEGER,
  
  reference_type VARCHAR(50), -- 'purchase', 'sale', 'shopee_order', 'adjustment', 'return'
  reference_id VARCHAR(100),
  
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);

-- ==================== PURCHASES ====================
CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  purchase_code VARCHAR(50) UNIQUE NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  supplier_id INTEGER REFERENCES suppliers(id),
  
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'received', 'partial', 'cancelled'
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PURCHASE ITEMS ====================
CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name VARCHAR(255),
  
  quantity INTEGER DEFAULT 1,
  received_quantity INTEGER DEFAULT 0,
  unit_price DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PENDING STOCK (Reserved) ====================
CREATE TABLE IF NOT EXISTS pending_stock (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  product_sku VARCHAR(100),
  
  quantity INTEGER NOT NULL,
  
  source VARCHAR(20) NOT NULL, -- 'shopee', 'lazada', 'tiktok'
  order_id VARCHAR(100),
  order_status VARCHAR(50),
  
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_pending_stock_product ON pending_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_pending_stock_active ON pending_stock(is_active);

-- ==================== SHOPEE TOKENS ====================
CREATE TABLE IF NOT EXISTS shopee_tokens (
  id SERIAL PRIMARY KEY,
  shop_id VARCHAR(50) NOT NULL UNIQUE,
  partner_id VARCHAR(50) NOT NULL,
  partner_key VARCHAR(100) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,
  last_refresh TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== ACTIVITY LOGS ====================
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  user_name VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50), -- 'product', 'transaction', 'order', 'stock'
  entity_id VARCHAR(100),
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- ==================== ROW LEVEL SECURITY ====================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now - adjust based on your auth needs)
CREATE POLICY "Allow all" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON transaction_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shopee_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shopee_order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stock_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON purchase_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pending_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shopee_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- ==================== HELPER FUNCTIONS ====================

-- Function to update stock
CREATE OR REPLACE FUNCTION update_product_stock(
  p_product_id INTEGER,
  p_quantity INTEGER,
  p_type VARCHAR(20), -- 'set', 'add', 'subtract'
  p_reference_type VARCHAR(50),
  p_reference_id VARCHAR(100),
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_stock_before INTEGER;
  v_stock_after INTEGER;
  v_movement_type VARCHAR(20);
BEGIN
  -- Get current stock
  SELECT stock INTO v_stock_before FROM products WHERE id = p_product_id;
  
  -- Calculate new stock
  IF p_type = 'set' THEN
    v_stock_after := p_quantity;
    v_movement_type := 'adjustment';
  ELSIF p_type = 'add' THEN
    v_stock_after := v_stock_before + p_quantity;
    v_movement_type := 'in';
  ELSIF p_type = 'subtract' THEN
    v_stock_after := v_stock_before - p_quantity;
    v_movement_type := 'out';
  END IF;
  
  -- Update product stock
  UPDATE products SET stock = v_stock_after, updated_at = NOW() WHERE id = p_product_id;
  
  -- Record stock movement
  INSERT INTO stock_movements (product_id, movement_type, quantity, stock_before, stock_after, reference_type, reference_id, notes)
  VALUES (p_product_id, v_movement_type, p_quantity, v_stock_before, v_stock_after, p_reference_type, p_reference_id, p_notes);
  
  RETURN v_stock_after;
END;
$$ LANGUAGE plpgsql;

-- Function to create pending stock (for marketplace orders)
CREATE OR REPLACE FUNCTION reserve_stock(
  p_product_id INTEGER,
  p_quantity INTEGER,
  p_source VARCHAR(20),
  p_order_id VARCHAR(100),
  p_order_status VARCHAR(50)
)
RETURNS INTEGER AS $$
DECLARE
  v_pending_id INTEGER;
BEGIN
  INSERT INTO pending_stock (product_id, quantity, source, order_id, order_status)
  VALUES (p_product_id, p_quantity, p_source, p_order_id, p_order_status)
  RETURNING id INTO v_pending_id;
  
  RETURN v_pending_id;
END;
$$ LANGUAGE plpgsql;

-- Function to release pending stock (order completed/cancelled)
CREATE OR REPLACE FUNCTION release_pending_stock(
  p_order_id VARCHAR(100),
  p_deduct_from_stock BOOLEAN DEFAULT TRUE
)
RETURNS INTEGER AS $$
DECLARE
  v_pending RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_pending IN SELECT * FROM pending_stock WHERE order_id = p_order_id AND is_active = TRUE
  LOOP
    -- Deduct from actual stock if order completed
    IF p_deduct_from_stock THEN
      PERFORM update_product_stock(v_pending.product_id, v_pending.quantity, 'subtract', 'shopee_order', p_order_id, 'Order completed');
    END IF;
    
    -- Mark as released
    UPDATE pending_stock SET is_active = FALSE, released_at = NOW() WHERE id = v_pending.id;
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ==================== INSERT DEFAULT DATA ====================

-- Default categories
INSERT INTO categories (name) VALUES 
  ('Umum'),
  ('Makanan'),
  ('Minuman'),
  ('Elektronik'),
  ('Pakaian'),
  ('Aksesoris')
ON CONFLICT DO NOTHING;

-- Default units
INSERT INTO units (name, symbol) VALUES 
  ('Pcs', 'pcs'),
  ('Box', 'box'),
  ('Kilogram', 'kg'),
  ('Gram', 'g'),
  ('Liter', 'L'),
  ('Pack', 'pack'),
  ('Lusin', 'lsn'),
  ('Set', 'set')
ON CONFLICT DO NOTHING;

-- Default walk-in customer
INSERT INTO customers (id, code, name, customer_type) VALUES 
  (1, 'CUST001', 'Walk-in Customer', 'walk-in')
ON CONFLICT DO NOTHING;

-- =====================================================
-- SELESAI! Database siap digunakan
-- =====================================================
