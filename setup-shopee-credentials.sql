-- Create shopee_tokens table if not exists
CREATE TABLE IF NOT EXISTS shopee_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  partner_key TEXT NOT NULL,
  shop_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE shopee_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security needs)
CREATE POLICY "Allow all operations on shopee_tokens" ON shopee_tokens
  FOR ALL USING (true);

-- Insert Shopee credentials (replace with your actual credentials)
-- Delete existing records first to avoid duplicates
DELETE FROM shopee_tokens;

-- Insert your Shopee credentials
INSERT INTO shopee_tokens (partner_id, partner_key, shop_id, access_token, refresh_token)
VALUES (
  '2014001',  -- Your partner_id from backend/.env.example
  'YOUR_PARTNER_KEY_HERE',  -- Replace with actual partner_key
  '669903315',  -- Your shop_id from backend/.env.example
  'YOUR_ACCESS_TOKEN_HERE',  -- Replace with actual access_token from Shopee OAuth
  'YOUR_REFRESH_TOKEN_HERE'  -- Replace with actual refresh_token from Shopee OAuth
);

-- Verify the data
SELECT * FROM shopee_tokens;
