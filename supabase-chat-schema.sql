-- =====================================================
-- MARKETPLACE CHAT SCHEMA FOR SUPABASE
-- Jalankan di: Supabase Dashboard → SQL Editor
-- =====================================================

-- ==================== MARKETPLACE CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(100) UNIQUE NOT NULL,
  marketplace VARCHAR(20) NOT NULL, -- 'shopee', 'lazada', 'tokopedia', 'tiktok'
  shop_id VARCHAR(50),
  
  -- Buyer info
  buyer_id VARCHAR(100),
  buyer_name VARCHAR(255),
  buyer_avatar TEXT,
  
  -- Last message preview
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  last_message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'order', 'product'
  
  -- Status
  unread_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  order_id VARCHAR(100),
  product_id VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_conversations_marketplace ON marketplace_conversations(marketplace);
CREATE INDEX IF NOT EXISTS idx_conversations_shop_id ON marketplace_conversations(shop_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON marketplace_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_unread ON marketplace_conversations(unread_count) WHERE unread_count > 0;

-- ==================== CHAT MESSAGES ====================
CREATE TABLE IF NOT EXISTS marketplace_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id VARCHAR(100) NOT NULL REFERENCES marketplace_conversations(conversation_id) ON DELETE CASCADE,
  message_id VARCHAR(100) UNIQUE,
  
  -- Message content
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'sticker', 'order', 'product', 'offer'
  
  -- Sender info
  sender_type VARCHAR(20) NOT NULL, -- 'buyer', 'seller'
  sender_id VARCHAR(100),
  sender_name VARCHAR(255),
  
  -- Media attachments
  media_url TEXT,
  media_type VARCHAR(20), -- 'image', 'video', 'file'
  thumbnail_url TEXT,
  
  -- Order/Product reference
  order_id VARCHAR(100),
  product_id VARCHAR(100),
  product_name VARCHAR(255),
  product_image TEXT,
  product_price DECIMAL(15,2),
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON marketplace_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON marketplace_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON marketplace_messages(is_read) WHERE is_read = FALSE;

-- ==================== MARKETPLACE TOKENS ====================
-- Untuk menyimpan access token marketplace (encrypted)
CREATE TABLE IF NOT EXISTS marketplace_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace VARCHAR(20) NOT NULL, -- 'shopee', 'lazada', 'tokopedia', 'tiktok'
  shop_id VARCHAR(50),
  shop_name VARCHAR(255),
  
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(marketplace, shop_id)
);

-- ==================== ENABLE REALTIME ====================
-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_messages;

-- ==================== RLS POLICIES ====================
-- Enable Row Level Security
ALTER TABLE marketplace_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_tokens ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust based on your needs)
CREATE POLICY "Allow all for authenticated users" ON marketplace_conversations
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON marketplace_messages
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON marketplace_tokens
  FOR ALL USING (true);

-- ==================== FUNCTIONS ====================

-- Function to update conversation when new message arrives
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_conversations
  SET 
    last_message = NEW.content,
    last_message_time = NEW.sent_at,
    last_message_type = NEW.message_type,
    unread_count = CASE WHEN NEW.sender_type = 'buyer' THEN unread_count + 1 ELSE unread_count END,
    updated_at = NOW()
  WHERE conversation_id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-update conversation
DROP TRIGGER IF EXISTS trigger_update_conversation ON marketplace_messages;
CREATE TRIGGER trigger_update_conversation
  AFTER INSERT ON marketplace_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id VARCHAR)
RETURNS void AS $$
BEGIN
  -- Mark all messages as read
  UPDATE marketplace_messages
  SET is_read = TRUE
  WHERE conversation_id = p_conversation_id AND is_read = FALSE;
  
  -- Reset unread count
  UPDATE marketplace_conversations
  SET unread_count = 0, updated_at = NOW()
  WHERE conversation_id = p_conversation_id;
END;
$$ LANGUAGE plpgsql;
