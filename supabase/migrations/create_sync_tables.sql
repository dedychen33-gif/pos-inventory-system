-- Create suppliers table for syncing between web and Android
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on suppliers" ON suppliers
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for suppliers table
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- =====================================================

-- Create purchases table for syncing between web and Android
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  purchase_number VARCHAR(50),
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
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

-- Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on purchases" ON purchases
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for purchases table
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

-- =====================================================

-- Create settings table for syncing store info between web and Android
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

-- Enable Row Level Security
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for settings table
ALTER PUBLICATION supabase_realtime ADD TABLE settings;

-- Insert default settings if not exists
INSERT INTO settings (id, store_name, currency)
VALUES ('default', 'POS System', 'Rp')
ON CONFLICT (id) DO NOTHING;

-- =====================================================

-- Ensure all existing tables have realtime enabled
-- (Run these if not already enabled)
-- ALTER PUBLICATION supabase_realtime ADD TABLE products;
-- ALTER PUBLICATION supabase_realtime ADD TABLE customers;
-- ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
-- ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
-- ALTER PUBLICATION supabase_realtime ADD TABLE categories;
-- ALTER PUBLICATION supabase_realtime ADD TABLE units;
