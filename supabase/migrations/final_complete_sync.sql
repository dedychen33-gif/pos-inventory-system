-- =====================================================
-- FINAL COMPLETE SYNC TABLES - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================

-- 1. CUSTOMERS - Add missing columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'member';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_prices JSONB DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TRANSACTIONS - Add missing columns  
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'pos';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percent';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_value DECIMAL(15,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) DEFAULT 11;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS void_reason TEXT;

-- 3. PRODUCTS - Add missing columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'local';

-- 4. SUPPLIERS TABLE
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

-- 5. PURCHASES TABLE
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

-- 6. SETTINGS TABLE
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
INSERT INTO settings (id, store_name, currency) VALUES ('default', 'POS System', 'Rp') ON CONFLICT (id) DO NOTHING;

-- 7. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on categories" ON categories;
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
INSERT INTO categories (name) VALUES ('Makanan'), ('Minuman'), ('Snack'), ('Rokok'), ('Lainnya') ON CONFLICT (name) DO NOTHING;

-- 8. UNITS TABLE
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on units" ON units;
CREATE POLICY "Allow all on units" ON units FOR ALL USING (true) WITH CHECK (true);
INSERT INTO units (name) VALUES ('Pcs'), ('Box'), ('Kg'), ('Liter'), ('Pack'), ('Lusin'), ('Karton') ON CONFLICT (name) DO NOTHING;

-- 9. APP_USERS TABLE
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
-- ENABLE REALTIME FOR ALL TABLES
-- =====================================================

-- Check current publication tables
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add tables to realtime (ignore errors if already added)
DO $$
DECLARE
  tables_to_add TEXT[] := ARRAY['products', 'customers', 'transactions', 'suppliers', 'purchases', 'settings', 'app_users', 'categories', 'units'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_add LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to realtime', t;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE '% already in realtime', t;
      WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist', t;
    END;
  END LOOP;
END $$;

-- Verify all tables
SELECT 
  t.table_name,
  CASE WHEN pt.tablename IS NOT NULL THEN '✅ Realtime' ELSE '❌ No Realtime' END as realtime_status
FROM information_schema.tables t
LEFT JOIN pg_publication_tables pt ON t.table_name = pt.tablename AND pt.pubname = 'supabase_realtime'
WHERE t.table_schema = 'public' 
AND t.table_name IN ('products', 'customers', 'transactions', 'suppliers', 'purchases', 'app_users', 'categories', 'units', 'settings')
ORDER BY t.table_name;
