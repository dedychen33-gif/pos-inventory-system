-- =============================================
-- SUPABASE DATABASE SCHEMA FOR POS SYSTEM
-- =============================================
-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50),
  sku VARCHAR(50),
  barcode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'pcs',
  price DECIMAL(15,2) DEFAULT 0,
  cost DECIMAL(15,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  parent_id UUID REFERENCES products(id),
  variant_name VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category);

-- =============================================
-- 2. CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name) VALUES 
  ('Makanan'), ('Minuman'), ('Snack'), ('Sembako'), 
  ('Elektronik'), ('Alat Tulis'), ('Paket Bundling')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 3. UNITS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default units
INSERT INTO units (name) VALUES 
  ('pcs'), ('kg'), ('box'), ('pack'), ('lusin'), ('kodi'), ('gross'), ('paket')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 4. CUSTOMERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Insert default walk-in customer
INSERT INTO customers (id, name, type) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Walk-in Customer', 'walk-in')
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 5. TRANSACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_code VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id),
  items JSONB NOT NULL,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'cash',
  cash_amount DECIMAL(15,2) DEFAULT 0,
  change_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  void_reason TEXT,
  void_date TIMESTAMPTZ,
  cashier_id UUID,
  cashier_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for date queries
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_transactions_status ON transactions(status);

-- =============================================
-- 6. SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. PURCHASES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_code VARCHAR(50) NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id),
  items JSONB NOT NULL,
  total DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. USERS TABLE (untuk multi-user auth)
-- =============================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cashier',
  permissions TEXT[] DEFAULT ARRAY['pos'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default users (password: admin123, kasir123 - hashed with simple encoding for demo)
-- In production, use proper bcrypt hashing!
INSERT INTO app_users (username, password_hash, name, role, permissions) VALUES 
  ('admin', 'admin123', 'Administrator', 'admin', ARRAY['all']),
  ('kasir', 'kasir123', 'Kasir 1', 'cashier', ARRAY['pos', 'products_view', 'customers_view'])
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- ENABLE REALTIME FOR ALL TABLES
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated/anon users (for simplicity)
-- In production, you should implement proper policies!
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for units" ON units FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for purchases" ON purchases FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- FUNCTION: Update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 8. BARCODE SCANS TABLE (untuk sync Android -> Web)
-- =============================================
DROP TABLE IF EXISTS barcode_scans CASCADE;
CREATE TABLE IF NOT EXISTS barcode_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode VARCHAR(100) NOT NULL,
  device_id VARCHAR(100),
  device_name VARCHAR(100),
  session_id VARCHAR(100),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX idx_barcode_scans_session ON barcode_scans(session_id);
CREATE INDEX idx_barcode_scans_processed ON barcode_scans(processed);
CREATE INDEX idx_barcode_scans_scanned_at ON barcode_scans(scanned_at);

-- Enable RLS
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow all barcode_scans operations" ON barcode_scans;
CREATE POLICY "Allow all barcode_scans operations" ON barcode_scans
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for barcode_scans
ALTER PUBLICATION supabase_realtime ADD TABLE barcode_scans;

-- Auto-delete old scans (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_scans()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM barcode_scans WHERE scanned_at < NOW() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_old_scans
  AFTER INSERT ON barcode_scans
  FOR EACH STATEMENT EXECUTE FUNCTION cleanup_old_scans();

