-- Add variants and hasVariants columns to products table
-- This allows storing marketplace product variants data

-- Add hasVariants boolean column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE;

-- Add variants JSONB column to store array of variant objects
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Add marketplace-specific ID columns for other platforms
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS lazada_item_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS lazada_sku_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tokopedia_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS tiktok_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS marketplace_store_id INTEGER;

-- Add index for faster queries on marketplace IDs
CREATE INDEX IF NOT EXISTS idx_products_lazada_item_id ON products(lazada_item_id);
CREATE INDEX IF NOT EXISTS idx_products_tokopedia_product_id ON products(tokopedia_product_id);
CREATE INDEX IF NOT EXISTS idx_products_tiktok_product_id ON products(tiktok_product_id);

-- Add comment for documentation
COMMENT ON COLUMN products.has_variants IS 'Indicates if product has multiple variants/models';
COMMENT ON COLUMN products.variants IS 'Array of product variants with modelId, name, sku, price, stock, image';
COMMENT ON COLUMN products.lazada_item_id IS 'Lazada marketplace item ID';
COMMENT ON COLUMN products.tokopedia_product_id IS 'Tokopedia marketplace product ID';
COMMENT ON COLUMN products.tiktok_product_id IS 'TikTok Shop product ID';
COMMENT ON COLUMN products.marketplace_store_id IS 'Reference to connected marketplace store';
