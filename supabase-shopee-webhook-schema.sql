-- =====================================================
-- SHOPEE WEBHOOK & SYNC QUEUE SCHEMA
-- Untuk Full 2-Way Sync: Order, Stock, Product
-- =====================================================

-- ==================== WEBHOOK LOGS ====================
CREATE TABLE IF NOT EXISTS shopee_webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_code INTEGER NOT NULL,
  webhook_name VARCHAR(100),
  shop_id VARCHAR(50),
  
  payload JSONB NOT NULL,
  signature VARCHAR(255),
  is_verified BOOLEAN DEFAULT FALSE,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_code ON shopee_webhook_logs(webhook_code);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON shopee_webhook_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON shopee_webhook_logs(created_at);

-- ==================== SYNC QUEUE ====================
CREATE TABLE IF NOT EXISTS shopee_sync_queue (
  id SERIAL PRIMARY KEY,
  
  sync_type VARCHAR(50) NOT NULL, -- 'stock_update', 'price_update', 'product_update'
  direction VARCHAR(20) NOT NULL, -- 'pos_to_shopee', 'shopee_to_pos'
  
  product_id INTEGER REFERENCES products(id),
  shopee_item_id BIGINT,
  shopee_model_id BIGINT,
  
  data JSONB NOT NULL, -- Data to sync (stock, price, etc)
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed', 'retry'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  
  priority INTEGER DEFAULT 5, -- 1-10, higher = more urgent
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON shopee_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON shopee_sync_queue(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled ON shopee_sync_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON shopee_sync_queue(priority DESC);

-- ==================== STOCK SYNC HISTORY ====================
CREATE TABLE IF NOT EXISTS shopee_stock_sync_history (
  id SERIAL PRIMARY KEY,
  
  product_id INTEGER REFERENCES products(id),
  shopee_item_id BIGINT,
  shopee_model_id BIGINT,
  
  stock_before INTEGER,
  stock_after INTEGER,
  
  sync_direction VARCHAR(20), -- 'pos_to_shopee', 'shopee_to_pos'
  sync_trigger VARCHAR(50), -- 'webhook', 'manual', 'auto', 'order_completed'
  
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_sync_product ON shopee_stock_sync_history(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_sync_created ON shopee_stock_sync_history(created_at);

-- ==================== RLS POLICIES ====================
ALTER TABLE shopee_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopee_stock_sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON shopee_webhook_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shopee_sync_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON shopee_stock_sync_history FOR ALL USING (true) WITH CHECK (true);

-- ==================== HELPER FUNCTIONS ====================

-- Function: Queue stock sync to Shopee
CREATE OR REPLACE FUNCTION queue_stock_sync_to_shopee(
  p_product_id INTEGER,
  p_new_stock INTEGER,
  p_trigger VARCHAR(50) DEFAULT 'auto'
)
RETURNS INTEGER AS $$
DECLARE
  v_shopee_item_id BIGINT;
  v_shopee_model_id BIGINT;
  v_queue_id INTEGER;
BEGIN
  -- Get Shopee IDs
  SELECT shopee_item_id, shopee_model_id 
  INTO v_shopee_item_id, v_shopee_model_id
  FROM products 
  WHERE id = p_product_id AND source = 'shopee';
  
  -- Only queue if product is from Shopee
  IF v_shopee_item_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert to sync queue
  INSERT INTO shopee_sync_queue (
    sync_type, 
    direction, 
    product_id, 
    shopee_item_id, 
    shopee_model_id,
    data,
    priority
  ) VALUES (
    'stock_update',
    'pos_to_shopee',
    p_product_id,
    v_shopee_item_id,
    v_shopee_model_id,
    jsonb_build_object('stock', p_new_stock, 'trigger', p_trigger),
    CASE WHEN p_trigger = 'order_completed' THEN 8 ELSE 5 END
  )
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-sync stock when product stock changes
CREATE OR REPLACE FUNCTION trigger_auto_stock_sync()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if stock changed and product is from Shopee
  IF NEW.stock != OLD.stock AND NEW.source = 'shopee' THEN
    PERFORM queue_stock_sync_to_shopee(NEW.id, NEW.stock, 'auto');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto stock sync
DROP TRIGGER IF EXISTS auto_stock_sync_trigger ON products;
CREATE TRIGGER auto_stock_sync_trigger
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_stock_sync();

-- =====================================================
-- SELESAI! Webhook & Sync Queue Schema Ready
-- =====================================================
