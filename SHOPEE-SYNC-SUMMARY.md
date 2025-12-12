# 📦 Shopee Full 2-Way Sync - Implementation Summary

## ✅ Yang Sudah Diimplementasikan

### 1. **Database Schema** ✅
**File:** `supabase-shopee-webhook-schema.sql`

**Tables:**
- `shopee_webhook_logs` - Log semua webhook yang diterima dari Shopee
- `shopee_sync_queue` - Queue untuk sync POS → Shopee (auto-retry)
- `shopee_stock_sync_history` - History semua stock sync

**Triggers:**
- `auto_stock_sync_trigger` - Auto-queue stock sync saat stok produk berubah
- `trigger_auto_stock_sync()` - Function untuk handle auto-sync

**Functions:**
- `queue_stock_sync_to_shopee()` - Queue stock update ke Shopee
- `release_pending_stock()` - Release reserved stock saat order selesai

---

### 2. **Webhook Endpoint** ✅
**File:** `api/shopee/webhook.js`

**Fitur:**
- ✅ Signature verification (keamanan)
- ✅ Webhook logging otomatis
- ✅ Handle 6+ event types:
  - **Code 0**: Order status change → Update order & kurangi stok
  - **Code 3**: Buyer cancel → Cancel order & restore stock
  - **Code 7**: Reserved stock → Track pending stock
  - **Code 8/11/13/16**: Product updates → Queue sync

**URL:** `https://[your-project].vercel.app/api/shopee/webhook`

---

### 3. **Auto Sync Processor** ✅
**File:** `api/shopee/sync-processor.js`

**Fitur:**
- ✅ Process sync queue otomatis
- ✅ Batch processing (10 items per run)
- ✅ Auto-retry (3x dengan delay)
- ✅ Priority-based queue
- ✅ Error handling & logging

**Cron:** Jalan setiap **5 menit** via Vercel Cron

---

### 4. **Frontend Service** ✅
**File:** `src/services/shopeeWebhookService.js`

**Methods:**
- `getWebhookLogs()` - Ambil webhook logs
- `getSyncQueue()` - Ambil sync queue
- `getSyncHistory()` - History sync per produk
- `queueStockSync()` - Manual queue sync
- `processSyncQueue()` - Trigger sync manual
- `retryFailedSync()` - Retry failed sync
- `getWebhookStats()` - Dashboard stats

---

### 5. **Monitoring Dashboard** ✅
**File:** `src/components/ShopeeWebhookMonitor.jsx`

**Fitur:**
- ✅ Real-time stats (webhook & sync queue)
- ✅ Webhook logs table
- ✅ Sync queue table dengan retry button
- ✅ Auto-refresh setiap 30 detik
- ✅ Manual process queue button

---

### 6. **Vercel Configuration** ✅
**File:** `vercel.json`

**Cron Jobs:**
- Token refresh: Daily (00:00)
- Sync processor: **Every 5 minutes** ⚡

---

### 7. **Documentation** ✅

**Files:**
- `SHOPEE-WEBHOOK-SETUP.md` - Setup lengkap & troubleshooting
- `SHOPEE-INTEGRATION-QUICKSTART.md` - Quick start 5 langkah
- `SHOPEE-SYNC-SUMMARY.md` - Summary implementasi (file ini)

---

## 🔄 Flow Diagram

### A. Order Sync (Shopee → POS)

```
┌─────────────────────────────────────────────────────┐
│ 1. Customer buat order di Shopee                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Shopee kirim webhook (POST /api/shopee/webhook) │
│    - code: 0 (order_status_change)                  │
│    - data: { ordersn, status }                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Webhook handler:                                 │
│    - Verify signature                               │
│    - Log ke shopee_webhook_logs                     │
│    - Update shopee_orders                           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Jika status = COMPLETED:                         │
│    - Kurangi stok di products                       │
│    - Catat di stock_movements                       │
│    - Set is_synced_to_stock = true                  │
└─────────────────────────────────────────────────────┘
```

### B. Stock Sync (POS → Shopee)

```
┌─────────────────────────────────────────────────────┐
│ 1. User update stok produk di POS                   │
│    UPDATE products SET stock = 50 WHERE id = 123    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Database trigger: auto_stock_sync_trigger        │
│    - Cek: NEW.stock != OLD.stock                    │
│    - Cek: NEW.source = 'shopee'                     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Function: queue_stock_sync_to_shopee()           │
│    INSERT INTO shopee_sync_queue                    │
│    - sync_type: 'stock_update'                      │
│    - direction: 'pos_to_shopee'                     │
│    - data: { stock: 50 }                            │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Cron job (setiap 5 menit):                       │
│    POST /api/shopee/sync-processor                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Sync processor:                                  │
│    - Ambil pending queue (max 10)                   │
│    - Call Shopee API update_stock                   │
│    - Update status: success/failed                  │
│    - Catat di shopee_stock_sync_history             │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 Event Mapping

| Webhook Code | Event Name | Handler | Action |
|--------------|------------|---------|--------|
| **0** | Order Status Change | `handleOrderStatusChange()` | Update order, kurangi stok jika COMPLETED |
| **1** | Tracking Number | - | (Not implemented) |
| **2** | Shopee Update | - | (Not implemented) |
| **3** | Buyer Cancel | `handleBuyerCancel()` | Cancel order, release pending stock |
| **5** | Promotion Update | - | (Not implemented) |
| **7** | Reserved Stock | `handleReservedStockChange()` | Track pending stock |
| **8** | Item Promotion | `handleProductUpdate()` | Queue product sync |
| **9** | Shop Update | - | (Not implemented) |
| **11** | Video Upload | `handleProductUpdate()` | Queue product sync |
| **13** | Brand Register | `handleProductUpdate()` | Queue product sync |
| **16** | Violation Item | `handleProductUpdate()` | Queue product sync |

---

## 📊 Database Tables

### shopee_webhook_logs
```sql
- id (serial)
- webhook_code (integer) -- Event code dari Shopee
- webhook_name (varchar) -- Nama event
- shop_id (varchar)
- payload (jsonb) -- Full webhook payload
- signature (varchar)
- is_verified (boolean) -- Signature valid?
- status (varchar) -- pending/processing/success/failed
- error_message (text)
- processed_at (timestamptz)
- created_at (timestamptz)
```

### shopee_sync_queue
```sql
- id (serial)
- sync_type (varchar) -- stock_update/price_update/product_update
- direction (varchar) -- pos_to_shopee/shopee_to_pos
- product_id (integer)
- shopee_item_id (bigint)
- shopee_model_id (bigint)
- data (jsonb) -- Data to sync
- status (varchar) -- pending/processing/success/failed/retry
- retry_count (integer)
- max_retries (integer) -- Default: 3
- error_message (text)
- processed_at (timestamptz)
- priority (integer) -- 1-10, higher = urgent
- scheduled_at (timestamptz)
- created_at (timestamptz)
```

### shopee_stock_sync_history
```sql
- id (serial)
- product_id (integer)
- shopee_item_id (bigint)
- shopee_model_id (bigint)
- stock_before (integer)
- stock_after (integer)
- sync_direction (varchar) -- pos_to_shopee/shopee_to_pos
- sync_trigger (varchar) -- webhook/manual/auto/order_completed
- success (boolean)
- error_message (text)
- created_at (timestamptz)
```

---

## 🔐 Security

### Webhook Signature Verification
```javascript
// Shopee kirim signature di header Authorization
const signature = req.headers['authorization'];

// Verify dengan Partner Key
const computed = crypto
  .createHmac('sha256', partnerKey)
  .update(JSON.stringify(payload))
  .digest('hex');

if (computed !== signature) {
  return 401 Unauthorized;
}
```

### Environment Variables
```env
SHOPEE_PARTNER_ID=xxx        # Public
SHOPEE_PARTNER_KEY=xxx       # SECRET - untuk API signature
SHOPEE_SHOP_ID=xxx           # Public
SHOPEE_PUSH_PARTNER_KEY=xxx  # SECRET - untuk webhook signature
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Database schema sudah dijalankan
- [ ] Environment variables sudah di-set
- [ ] Shopee credentials valid

### Deployment
- [ ] Deploy ke Vercel: `vercel --prod`
- [ ] Catat webhook URL
- [ ] Set callback URL di Shopee Console
- [ ] Verify callback URL (harus hijau ✅)
- [ ] Aktifkan push events (code: 0, 3, 7)

### Post-Deployment
- [ ] Test webhook: buat order test
- [ ] Test stock sync: update stok produk
- [ ] Monitor logs: cek `shopee_webhook_logs`
- [ ] Monitor queue: cek `shopee_sync_queue`

---

## 📈 Monitoring Queries

### Webhook Health
```sql
-- Webhook stats hari ini
SELECT 
  webhook_name,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_verified = true) as verified
FROM shopee_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_name, status
ORDER BY count DESC;
```

### Sync Queue Status
```sql
-- Queue summary
SELECT 
  sync_type,
  status,
  COUNT(*) as count,
  AVG(retry_count) as avg_retries
FROM shopee_sync_queue
GROUP BY sync_type, status
ORDER BY count DESC;
```

### Failed Syncs
```sql
-- Failed syncs yang perlu attention
SELECT 
  sq.*,
  p.name as product_name,
  p.sku
FROM shopee_sync_queue sq
LEFT JOIN products p ON p.id = sq.product_id
WHERE sq.status = 'failed'
AND sq.retry_count >= sq.max_retries
ORDER BY sq.created_at DESC;
```

### Sync Performance
```sql
-- Stock sync history (last 24h)
SELECT 
  sync_direction,
  sync_trigger,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success = true) as success_count,
  COUNT(*) FILTER (WHERE success = false) as failed_count
FROM shopee_stock_sync_history
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY sync_direction, sync_trigger;
```

---

## 🎯 Next Steps (Optional Enhancements)

### 1. Real-time Sync (WebSocket)
Ganti cron 5 menit dengan real-time processing via Supabase Realtime:
```javascript
supabase
  .channel('sync-queue')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'shopee_sync_queue' },
    (payload) => processSyncQueue()
  )
  .subscribe();
```

### 2. Bulk Stock Sync
Untuk sync banyak produk sekaligus:
```javascript
async function bulkStockSync(productIds) {
  // Queue multiple products at once
  // Process in batches
}
```

### 3. Price Sync
Implementasi sync harga (POS ↔ Shopee):
```javascript
// Similar to stock sync
// sync_type: 'price_update'
```

### 4. Product Sync (Full)
Sync nama, deskripsi, gambar produk:
```javascript
// sync_type: 'product_update'
// Requires image upload handling
```

### 5. Alert System
Email/SMS alert untuk failed syncs:
```javascript
if (failedCount > threshold) {
  sendAlert('Shopee sync failing!');
}
```

---

## 📞 Support & Troubleshooting

**Logs Location:**
- Vercel: Dashboard → Logs
- Database: `shopee_webhook_logs`, `shopee_sync_queue`

**Common Issues:**
1. Webhook tidak diterima → Cek callback URL & firewall
2. Signature failed → Cek `SHOPEE_PUSH_PARTNER_KEY`
3. Stock tidak sync → Cek produk punya `shopee_item_id`
4. Queue stuck → Reset: `UPDATE shopee_sync_queue SET status='pending'`

**Documentation:**
- `SHOPEE-WEBHOOK-SETUP.md` - Full setup guide
- `SHOPEE-INTEGRATION-QUICKSTART.md` - Quick start
- Shopee API Docs: https://open.shopee.com/documents

---

## ✅ Implementation Complete!

**Total Files Created/Modified:**
1. `supabase-shopee-webhook-schema.sql` - Database schema
2. `api/shopee/webhook.js` - Webhook endpoint
3. `api/shopee/sync-processor.js` - Auto sync processor
4. `src/services/shopeeWebhookService.js` - Frontend service
5. `src/components/ShopeeWebhookMonitor.jsx` - Monitoring dashboard
6. `vercel.json` - Cron configuration
7. `SHOPEE-WEBHOOK-SETUP.md` - Setup guide
8. `SHOPEE-INTEGRATION-QUICKSTART.md` - Quick start
9. `SHOPEE-SYNC-SUMMARY.md` - This file

**Ready to Deploy! 🚀**
