-- =====================================================
-- ENABLE SUPABASE REALTIME FOR POS INVENTORY SYSTEM
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =====================================================
-- 
-- PENTING: Tanpa SQL ini, realtime sync TIDAK akan berfungsi!
-- Setelah menjalankan SQL ini, Android dan Web akan sync secara real-time.
--

-- ==================== ENABLE REALTIME ====================
-- Tambahkan semua table yang perlu real-time sync ke publication

-- Method 1: Add tables one by one (lebih aman)
DO $$
BEGIN
    -- Products table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
        RAISE NOTICE 'Added products to realtime';
    END IF;

    -- Customers table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
        RAISE NOTICE 'Added customers to realtime';
    END IF;

    -- Transactions table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
        RAISE NOTICE 'Added transactions to realtime';
    END IF;

    -- Transaction items table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transaction_items;
        RAISE NOTICE 'Added transaction_items to realtime';
    END IF;

    -- App users table (untuk sync login/user data)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'app_users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
        RAISE NOTICE 'Added app_users to realtime';
    END IF;

    -- Categories table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE categories;
        RAISE NOTICE 'Added categories to realtime';
    END IF;

    -- Units table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'units'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE units;
        RAISE NOTICE 'Added units to realtime';
    END IF;

    -- Stock movements table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'stock_movements'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
        RAISE NOTICE 'Added stock_movements to realtime';
    END IF;

    -- Suppliers table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'suppliers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
        RAISE NOTICE 'Added suppliers to realtime';
    END IF;

    -- Purchases table
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'purchases'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
        RAISE NOTICE 'Added purchases to realtime';
    END IF;

END $$;

-- ==================== VERIFY REALTIME TABLES ====================
-- Check which tables are enabled for realtime
SELECT 
    schemaname,
    tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- ==================== REPLICA IDENTITY (REQUIRED FOR DELETE EVENTS) ====================
-- Set REPLICA IDENTITY to FULL so DELETE events include all row data
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE transactions REPLICA IDENTITY FULL;
ALTER TABLE transaction_items REPLICA IDENTITY FULL;
ALTER TABLE categories REPLICA IDENTITY FULL;
ALTER TABLE units REPLICA IDENTITY FULL;
ALTER TABLE stock_movements REPLICA IDENTITY FULL;
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE purchases REPLICA IDENTITY FULL;

-- For app_users if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_users') THEN
        EXECUTE 'ALTER TABLE app_users REPLICA IDENTITY FULL';
    END IF;
END $$;

-- =====================================================
-- SELESAI! Realtime sync sudah diaktifkan.
-- 
-- Cara kerja:
-- 1. Ketika data berubah di Web → Supabase broadcast ke Android
-- 2. Ketika data berubah di Android → Supabase broadcast ke Web
-- 3. Latency: ~100-300ms (hampir instant)
--
-- Test dengan:
-- 1. Buka web di komputer
-- 2. Buka app di Android
-- 3. Tambah/edit produk di salah satu
-- 4. Lihat perubahan muncul di device lain secara otomatis
-- =====================================================
