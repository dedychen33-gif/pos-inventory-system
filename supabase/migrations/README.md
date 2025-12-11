# Supabase Database Migrations

## Migration: Add Variants Columns

**File:** `add_variants_columns.sql`

### Purpose
Menambahkan kolom untuk menyimpan data varian produk dan marketplace IDs dari berbagai platform (Shopee, Lazada, Tokopedia, TikTok).

### Kolom yang Ditambahkan

#### 1. Variants Support
- `has_variants` (BOOLEAN) - Menandakan apakah produk memiliki varian
- `variants` (JSONB) - Array JSON untuk menyimpan data varian produk

#### 2. Marketplace IDs
- `lazada_item_id` (VARCHAR) - ID produk Lazada
- `lazada_sku_id` (VARCHAR) - SKU ID Lazada
- `tokopedia_product_id` (VARCHAR) - ID produk Tokopedia
- `tiktok_product_id` (VARCHAR) - ID produk TikTok Shop
- `marketplace_store_id` (INTEGER) - Reference ke toko marketplace

### Cara Menjalankan Migration

#### Option 1: Via Supabase Dashboard
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Buka **SQL Editor**
4. Copy-paste isi file `add_variants_columns.sql`
5. Klik **Run** atau tekan `Ctrl+Enter`

#### Option 2: Via Supabase CLI
```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

### Struktur Data Variants

Format JSON untuk kolom `variants`:
```json
[
  {
    "modelId": "12345",
    "name": "Warna Merah - Size L",
    "sku": "PROD-RED-L",
    "price": 150000,
    "stock": 25,
    "image": "https://example.com/image.jpg"
  },
  {
    "modelId": "12346",
    "name": "Warna Biru - Size M",
    "sku": "PROD-BLUE-M",
    "price": 145000,
    "stock": 30,
    "image": "https://example.com/image2.jpg"
  }
]
```

### Index yang Dibuat
- `idx_products_lazada_item_id` - Index untuk pencarian cepat berdasarkan Lazada ID
- `idx_products_tokopedia_product_id` - Index untuk pencarian cepat berdasarkan Tokopedia ID
- `idx_products_tiktok_product_id` - Index untuk pencarian cepat berdasarkan TikTok ID

### Rollback
Jika perlu rollback migration:
```sql
-- Remove added columns
ALTER TABLE products 
DROP COLUMN IF EXISTS has_variants,
DROP COLUMN IF EXISTS variants,
DROP COLUMN IF EXISTS lazada_item_id,
DROP COLUMN IF EXISTS lazada_sku_id,
DROP COLUMN IF EXISTS tokopedia_product_id,
DROP COLUMN IF EXISTS tiktok_product_id,
DROP COLUMN IF EXISTS marketplace_store_id;

-- Remove indexes
DROP INDEX IF EXISTS idx_products_lazada_item_id;
DROP INDEX IF EXISTS idx_products_tokopedia_product_id;
DROP INDEX IF EXISTS idx_products_tiktok_product_id;
```

### Testing
Setelah menjalankan migration, test dengan:
```sql
-- Insert test product with variants
INSERT INTO products (
  code, name, has_variants, variants, source
) VALUES (
  'TEST001',
  'Test Product with Variants',
  true,
  '[{"modelId":"1","name":"Variant A","sku":"TEST-A","price":100000,"stock":10}]'::jsonb,
  'shopee'
);

-- Query products with variants
SELECT code, name, has_variants, variants 
FROM products 
WHERE has_variants = true;
```

### Notes
- Kolom `variants` menggunakan tipe JSONB untuk performa query yang lebih baik
- Default value untuk `has_variants` adalah `false`
- Default value untuk `variants` adalah array kosong `[]`
- Semua kolom marketplace ID bersifat optional (nullable)
