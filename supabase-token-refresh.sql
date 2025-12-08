-- =====================================================
-- SUPABASE SETUP: Auto Refresh Token Shopee
-- Jalankan SQL ini di Supabase SQL Editor
-- =====================================================

-- 1. Tabel untuk menyimpan token Shopee
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

-- 2. Tabel untuk log aktivitas
CREATE TABLE IF NOT EXISTS shopee_logs (
  id SERIAL PRIMARY KEY,
  shop_id VARCHAR(50),
  log_type VARCHAR(20) NOT NULL, -- SUCCESS, ERROR, INFO, CRON
  message TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_shopee_logs_created_at ON shopee_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shopee_logs_shop_id ON shopee_logs(shop_id);

-- 4. Function untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger untuk auto-update updated_at
DROP TRIGGER IF EXISTS trigger_shopee_tokens_updated_at ON shopee_tokens;
CREATE TRIGGER trigger_shopee_tokens_updated_at
  BEFORE UPDATE ON shopee_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 6. Function untuk menambah log
CREATE OR REPLACE FUNCTION add_shopee_log(
  p_shop_id VARCHAR(50),
  p_log_type VARCHAR(20),
  p_message TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO shopee_logs (shop_id, log_type, message, data)
  VALUES (p_shop_id, p_log_type, p_message, p_data);
  
  -- Hapus log lama (simpan 500 terakhir per shop)
  DELETE FROM shopee_logs 
  WHERE id NOT IN (
    SELECT id FROM shopee_logs 
    WHERE shop_id = p_shop_id 
    ORDER BY created_at DESC 
    LIMIT 500
  ) AND shop_id = p_shop_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Function untuk cek apakah token perlu refresh
CREATE OR REPLACE FUNCTION check_token_needs_refresh(p_shop_id VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
  v_expiry TIMESTAMPTZ;
BEGIN
  SELECT token_expiry INTO v_expiry
  FROM shopee_tokens
  WHERE shop_id = p_shop_id;
  
  IF v_expiry IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Refresh 30 menit sebelum expired
  RETURN NOW() > (v_expiry - INTERVAL '30 minutes');
END;
$$ LANGUAGE plpgsql;

-- 8. View untuk status token
CREATE OR REPLACE VIEW shopee_token_status AS
SELECT 
  shop_id,
  partner_id,
  CASE WHEN access_token IS NOT NULL THEN 'Connected' ELSE 'Not Connected' END as status,
  token_expiry,
  CASE 
    WHEN token_expiry IS NULL THEN 'No Token'
    WHEN NOW() > token_expiry THEN 'Expired'
    WHEN NOW() > (token_expiry - INTERVAL '30 minutes') THEN 'Expiring Soon'
    ELSE 'Valid'
  END as token_status,
  last_refresh,
  updated_at
FROM shopee_tokens;

-- 9. Enable pg_cron extension (jalankan sebagai superuser jika belum ada)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 10. RLS Policy (Row Level Security)
ALTER TABLE shopee_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_logs ENABLE ROW LEVEL SECURITY;

-- Policy untuk service role (full access)
CREATE POLICY "Service role full access tokens" ON shopee_tokens
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access logs" ON shopee_logs
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- CARA PAKAI:
-- 1. Jalankan SQL ini di Supabase SQL Editor
-- 2. Deploy Edge Function untuk refresh token
-- 3. Setup cron job atau webhook
-- =====================================================
