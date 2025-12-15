-- =====================================================
-- COMPLETE BI-DIRECTIONAL SYNC TABLES FOR POS SYSTEM
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PRODUCTS TABLE (should already exist)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  code VARCHAR(50),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id VARCHAR(100),
  unit_id VARCHAR(50),
  cost_price DECIMAL(15,2) DEFAULT 0,
  selling_price DECIMAL(15,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  image_url TEXT,
  shopee_item_id TEXT,
  shopee_model_id TEXT,
  source VARCHAR(50) DEFAULT 'local',
  is_variant BOOLEAN DEFAULT FALSE,
  parent_product_id TEXT,
  variant_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to products if they exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE products ADD COLUMN cost_price DECIMAL(15,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'selling_price') THEN
    ALTER TABLE products ADD COLUMN selling_price DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on products" ON products;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 2. CUSTOMERS TABLE
-- =====================================================
-- Check if customers table uses integer or text ID
DO $$
DECLARE
  id_type TEXT;
BEGIN
  SELECT data_type INTO id_type FROM information_schema.columns 
  WHERE table_name = 'customers' AND column_name = 'id';
  
  IF id_type IS NULL THEN
    -- Table doesn't exist, create with integer ID
    CREATE TABLE customers (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50),
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      address TEXT,
      type VARCHAR(50) DEFAULT 'member',
      points INTEGER DEFAULT 0,
      total_spent DECIMAL(15,2) DEFAULT 0,
      custom_prices JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    -- Table exists, add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'type') THEN
      ALTER TABLE customers ADD COLUMN type VARCHAR(50) DEFAULT 'member';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'points') THEN
      ALTER TABLE customers ADD COLUMN points INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
      ALTER TABLE customers ADD COLUMN total_spent DECIMAL(15,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'custom_prices') THEN
      ALTER TABLE customers ADD COLUMN custom_prices JSONB DEFAULT '{}';
    END IF;
  END IF;
END $$;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 3. TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  transaction_code VARCHAR(50),
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  customer_id TEXT,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'percent',
  discount_value DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 11,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_amount DECIMAL(15,2) DEFAULT 0,
  change_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  void_reason TEXT,
  notes TEXT,
  cashier_id TEXT,
  cashier_name VARCHAR(255),
  source VARCHAR(50) DEFAULT 'pos',
  items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add items column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'items') THEN
    ALTER TABLE transactions ADD COLUMN items JSONB DEFAULT '[]';
  END IF;
END $$;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on transactions" ON transactions;
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 4. SUPPLIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on suppliers" ON suppliers;
CREATE POLICY "Allow all on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 5. PURCHASES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  purchase_number VARCHAR(50),
  supplier_id TEXT,
  supplier_name VARCHAR(255),
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_status VARCHAR(50) DEFAULT 'paid',
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on purchases" ON purchases;
CREATE POLICY "Allow all on purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 6. APP_USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'cashier',
  permissions JSONB DEFAULT '["pos", "products_view"]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on app_users" ON app_users;
CREATE POLICY "Allow all on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- 7. CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on categories" ON categories;
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Insert default categories
INSERT INTO categories (name) VALUES 
  ('Makanan'),
  ('Minuman'),
  ('Snack'),
  ('Rokok'),
  ('Lainnya')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. UNITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on units" ON units;
CREATE POLICY "Allow all on units" ON units FOR ALL USING (true) WITH CHECK (true);

-- Insert default units
INSERT INTO units (name) VALUES 
  ('Pcs'),
  ('Box'),
  ('Kg'),
  ('Liter'),
  ('Pack'),
  ('Lusin'),
  ('Karton')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name VARCHAR(255),
  store_address TEXT,
  store_phone VARCHAR(50),
  store_email VARCHAR(255),
  logo_url TEXT,
  tax_percent DECIMAL(5,2) DEFAULT 11,
  currency VARCHAR(10) DEFAULT 'Rp',
  receipt_footer TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO settings (id, store_name, currency, tax_percent)
VALUES ('default', 'POS System', 'Rp', 11)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ENABLE REALTIME FOR ALL TABLES
-- =====================================================
DO $$
BEGIN
  -- Products
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Customers
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE customers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Transactions
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Suppliers
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Purchases
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- App Users
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Categories
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Units
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE units;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  
  -- Settings
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

-- =====================================================
-- VERIFY TABLES
-- =====================================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('products', 'customers', 'transactions', 'suppliers', 'purchases', 'app_users', 'categories', 'units', 'settings')
ORDER BY table_name;
