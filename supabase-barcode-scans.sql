-- =============================================
-- TABEL BARCODE SCANS untuk Remote Scanner
-- =============================================
-- Jalankan SQL ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/naydyhkqodppdhzwkctr/sql

-- Hapus tabel lama jika ada
DROP TABLE IF EXISTS barcode_scans CASCADE;

-- Buat tabel barcode_scans
CREATE TABLE barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode VARCHAR(100) NOT NULL,
  device_id VARCHAR(100),
  device_name VARCHAR(100),
  session_id VARCHAR(100),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ
);

-- Index untuk performa
CREATE INDEX idx_barcode_scans_session ON barcode_scans(session_id);
CREATE INDEX idx_barcode_scans_processed ON barcode_scans(processed);
CREATE INDEX idx_barcode_scans_scanned_at ON barcode_scans(scanned_at);

-- Enable Row Level Security
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;

-- Policy untuk allow semua operasi (development)
CREATE POLICY "Allow all barcode_scans operations" ON barcode_scans
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime untuk tabel ini
ALTER PUBLICATION supabase_realtime ADD TABLE barcode_scans;

-- Test insert
INSERT INTO barcode_scans (barcode, device_name, session_id) 
VALUES ('TEST123', 'Test Device', 'test-session');

-- Verifikasi
SELECT * FROM barcode_scans;
