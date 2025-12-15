-- Fix customers table for bi-directional sync
-- Run this in Supabase SQL Editor

-- Create customers table if not exists
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
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

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add type column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'type') THEN
    ALTER TABLE customers ADD COLUMN type VARCHAR(50) DEFAULT 'member';
  END IF;
  
  -- Add points column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'points') THEN
    ALTER TABLE customers ADD COLUMN points INTEGER DEFAULT 0;
  END IF;
  
  -- Add total_spent column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'total_spent') THEN
    ALTER TABLE customers ADD COLUMN total_spent DECIMAL(15,2) DEFAULT 0;
  END IF;
  
  -- Add custom_prices column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'custom_prices') THEN
    ALTER TABLE customers ADD COLUMN custom_prices JSONB DEFAULT '{}';
  END IF;
  
  -- Add created_at column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'created_at') THEN
    ALTER TABLE customers ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists and create new one
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for customers table
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE customers;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Table already in publication
END $$;

-- Insert Walk-in Customer if not exists
INSERT INTO customers (id, name, type, points, total_spent)
VALUES ('00000000-0000-0000-0000-000000000001', 'Walk-in Customer', 'walk-in', 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Show table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'customers'
ORDER BY ordinal_position;
