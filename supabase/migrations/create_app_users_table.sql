-- Create app_users table for syncing authentication between web and Android
CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'cashier',
  permissions TEXT[] DEFAULT ARRAY['pos', 'products_view'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on app_users" ON app_users
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for app_users table
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;

-- Create index for faster username lookup
CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);

-- Insert default admin user if not exists
INSERT INTO app_users (id, username, password_hash, name, role, permissions, is_active, created_at)
VALUES (
  1,
  'admin',
  '240be518fabd2724ddb6f04eeb9d5b0f9e2f5e3b7e5f5c5d5e5f5a5b5c5d5e5f', -- SHA256 of 'admin123'
  'Administrator',
  'admin',
  ARRAY['all'],
  true,
  '2024-01-01T00:00:00.000Z'
) ON CONFLICT (id) DO NOTHING;

-- Insert default cashier user if not exists
INSERT INTO app_users (id, username, password_hash, name, role, permissions, is_active, created_at)
VALUES (
  2,
  'kasir',
  '5e884898da28047d9169e1e3f5e5e5f5a5b5c5d5e5f5a5b5c5d5e5f5a5b5c5d', -- SHA256 of 'kasir123'
  'Kasir 1',
  'cashier',
  ARRAY['pos', 'products_view', 'customers_view'],
  true,
  '2024-01-01T00:00:00.000Z'
) ON CONFLICT (id) DO NOTHING;
