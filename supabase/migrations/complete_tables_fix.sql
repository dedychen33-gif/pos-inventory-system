-- ============================================
-- COMPLETE SQL MIGRATION FOR ALL SYNC TABLES
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SUPPLIERS TABLE
-- ============================================
DROP TABLE IF EXISTS suppliers CASCADE;

CREATE TABLE suppliers (
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

-- ============================================
-- 2. PURCHASES TABLE
-- ============================================
DROP TABLE IF EXISTS purchases CASCADE;

CREATE TABLE purchases (
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

-- ============================================
-- 3. SALES_ORDERS TABLE
-- ============================================
DROP TABLE IF EXISTS sales_orders CASCADE;

CREATE TABLE sales_orders (
  id TEXT PRIMARY KEY,
  order_number VARCHAR(50),
  customer_id TEXT,
  customer_name VARCHAR(255),
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATE,
  order_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on sales_orders" ON sales_orders;
CREATE POLICY "Allow all on sales_orders" ON sales_orders FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 4. SETTINGS TABLE (if not exists)
-- ============================================
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

-- Insert default settings if not exists
INSERT INTO settings (id, store_name, tax_percent, currency)
VALUES ('default', 'POS System', 11, 'Rp')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. ENABLE REALTIME FOR ALL TABLES
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sales_orders;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE settings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 6. VERIFY ALL TABLES
-- ============================================
SELECT 'suppliers' as table_name, column_name, data_type 
FROM information_schema.columns WHERE table_name = 'suppliers'
UNION ALL
SELECT 'purchases' as table_name, column_name, data_type 
FROM information_schema.columns WHERE table_name = 'purchases'
UNION ALL
SELECT 'sales_orders' as table_name, column_name, data_type 
FROM information_schema.columns WHERE table_name = 'sales_orders'
ORDER BY table_name, column_name;
