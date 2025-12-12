# Shopee Webhook Setup Guide - Full 2-Way Sync

## Overview
Panduan lengkap untuk setup **Full 2-Way Sync** antara POS dan Shopee:
- ✅ **Order Sync**: Order baru dari Shopee → Auto kurangi stok di POS
- ✅ **Stock Sync**: Stok berubah di POS → Auto update ke Shopee
- ✅ **Product Sync**: Sinkronisasi data produk 2 arah

---

## 📋 Prerequisites

1. **Shopee Partner Account** sudah terdaftar
2. **Partner ID & Partner Key** dari Shopee
3. **Shop ID** toko Shopee kamu
4. **Access Token** yang valid (dari OAuth flow)
5. **Webhook URL** yang bisa diakses publik (HTTPS)

---

## 🔧 Step 1: Setup Database Schema

Jalankan SQL schema di Supabase Dashboard → SQL Editor:

```bash
# File yang perlu dijalankan (urutan penting):
1. supabase-full-schema.sql          # Schema utama (jika belum)
2. supabase-shopee-webhook-schema.sql # Schema webhook & sync queue
```

**Verifikasi:**
```sql
-- Cek tabel sudah dibuat
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('shopee_webhook_logs', 'shopee_sync_queue', 'shopee_stock_sync_history');
```

---

## 🌐 Step 2: Deploy Webhook Endpoint

### Option A: Vercel (Recommended)

Webhook URL kamu akan jadi:
```
https://your-project.vercel.app/api/shopee/webhook
```

**Deploy:**
```bash
vercel --prod
```

### Option B: Custom Server

Pastikan endpoint ini accessible:
```
POST https://yourdomain.com/api/shopee/webhook
```

**Test endpoint:**
```bash
curl -X POST https://your-webhook-url/api/shopee/webhook \
  -H "Content-Type: application/json" \
  -d '{"code": 0, "data": {}, "shop_id": "123", "timestamp": 1234567890}'
```

---

## 🔐 Step 3: Configure di Shopee Open Platform

### 3.1 Login ke Shopee Open Platform Console
1. Buka: https://open.shopee.com/
2. Login dengan akun Partner kamu
3. Pilih App kamu

### 3.2 Set Callback URL (Deployment Service Area)
1. Klik **Push Mechanism** → **Set Push**
2. **The Deployment Service Area of your Call Back URL**: Pilih region (Singapore/Vietnam/dll)
3. **Callback URL**: Masukkan webhook URL kamu
   ```
   https://your-project.vercel.app/api/shopee/webhook
   ```
4. Klik **Verify** untuk validasi endpoint
   - Shopee akan kirim test request
   - Endpoint kamu harus return 200 OK

### 3.3 Aktifkan Push Events

Di bagian **Live Push Settings**, aktifkan event berikut:

| Event Code | Push Mechanism | Fungsi | Aktifkan? |
|------------|----------------|--------|-----------|
| **0** | `order_status_change` | Order status berubah | ✅ **WAJIB** |
| **3** | `buyer_cancel_order` | Buyer cancel order | ✅ **WAJIB** |
| **7** | `reserved_stock_change_push` | Stok reserved berubah | ✅ **WAJIB** |
| **8** | `item_promotion_update` | Promo produk update | ⚪ Optional |
| **11** | `video_upload_push` | Video upload selesai | ⚪ Optional |
| **13** | `brand_register_result` | Hasil registrasi brand | ⚪ Optional |
| **16** | `violation_item_push` | Item violation | ⚪ Optional |

**Cara aktifkan:**
1. Toggle switch di kolom **Push (on/off)** untuk setiap event
2. Klik **Save** atau **Submit**

### 3.4 Copy Live Push Partner Key

Di bagian **Live Push Partner Key**, copy key tersebut dan simpan di `.env`:

```env
SHOPEE_PUSH_PARTNER_KEY=your_live_push_partner_key_here
```

---

## ⚙️ Step 4: Configure Environment Variables

Update file `.env` kamu:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Shopee API
SHOPEE_PARTNER_ID=your_partner_id
SHOPEE_PARTNER_KEY=your_partner_key
SHOPEE_SHOP_ID=your_shop_id

# Shopee Webhook
SHOPEE_PUSH_PARTNER_KEY=your_push_partner_key

# Environment
NODE_ENV=production
```

---

## 🔄 Step 5: Setup Auto Sync Processor

### 5.1 Vercel Cron Job (Recommended)

Tambahkan di `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/shopee/sync-processor",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Ini akan jalankan sync processor **setiap 5 menit**.

### 5.2 Manual Trigger (Alternative)

Buat cron job di server kamu:

```bash
# Crontab
*/5 * * * * curl -X POST https://your-project.vercel.app/api/shopee/sync-processor
```

---

## 🧪 Step 6: Testing

### Test 1: Webhook Receiving

1. Buat order test di Shopee Seller Center
2. Ubah status order
3. Cek log di database:

```sql
SELECT * FROM shopee_webhook_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Test 2: Auto Stock Sync (POS → Shopee)

1. Update stok produk Shopee di POS:
```javascript
// Di POS, update stok produk yang source = 'shopee'
await supabase
  .from('products')
  .update({ stock: 50 })
  .eq('id', product_id);
```

2. Cek sync queue:
```sql
SELECT * FROM shopee_sync_queue 
WHERE product_id = YOUR_PRODUCT_ID
ORDER BY created_at DESC;
```

3. Tunggu 5 menit (atau trigger manual):
```bash
curl -X POST https://your-project.vercel.app/api/shopee/sync-processor
```

4. Cek di Shopee Seller Center apakah stok sudah berubah

### Test 3: Order Sync (Shopee → POS)

1. Buat order di Shopee
2. Ubah status ke **COMPLETED**
3. Cek apakah stok di POS berkurang:

```sql
SELECT p.name, p.stock, sm.* 
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
WHERE sm.reference_type = 'shopee_order'
ORDER BY sm.created_at DESC;
```

---

## 📊 Monitoring & Logs

### Dashboard Webhook Stats

```javascript
import shopeeWebhookService from './services/shopeeWebhookService';

// Get stats
const stats = await shopeeWebhookService.getWebhookStats();
console.log(stats);
```

### View Webhook Logs

```javascript
// Last 50 webhooks
const logs = await shopeeWebhookService.getWebhookLogs({ limit: 50 });

// Failed webhooks only
const failed = await shopeeWebhookService.getWebhookLogs({ 
  status: 'failed',
  limit: 20 
});
```

### View Sync Queue

```javascript
// Pending syncs
const pending = await shopeeWebhookService.getSyncQueue({ 
  status: 'pending' 
});

// Failed syncs
const failed = await shopeeWebhookService.getSyncQueue({ 
  status: 'failed' 
});
```

### Retry Failed Sync

```javascript
await shopeeWebhookService.retryFailedSync(queueId);
```

---

## 🔍 Troubleshooting

### Error: "Webhook verification failed"

**Penyebab:**
- Partner Key salah
- Signature tidak match

**Solusi:**
1. Cek `SHOPEE_PUSH_PARTNER_KEY` di `.env`
2. Pastikan sama dengan **Live Push Partner Key** di Shopee Console
3. Restart server setelah update `.env`

### Error: "Product not found" saat sync

**Penyebab:**
- Produk belum di-sync dari Shopee
- `shopee_item_id` tidak terisi

**Solusi:**
1. Sync produk dari Shopee dulu:
```javascript
await productsApi.sync();
```

2. Verifikasi produk punya `shopee_item_id`:
```sql
SELECT id, name, shopee_item_id, source 
FROM products 
WHERE source = 'shopee';
```

### Sync Queue Stuck di "processing"

**Penyebab:**
- Sync processor crash
- API timeout

**Solusi:**
1. Reset stuck items:
```sql
UPDATE shopee_sync_queue 
SET status = 'pending', retry_count = 0
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '10 minutes';
```

2. Trigger processor manual:
```bash
curl -X POST https://your-project.vercel.app/api/shopee/sync-processor
```

### Webhook tidak diterima

**Penyebab:**
- URL tidak accessible
- HTTPS certificate invalid
- Firewall blocking

**Solusi:**
1. Test endpoint dari luar:
```bash
curl -X POST https://your-webhook-url/api/shopee/webhook \
  -H "Content-Type: application/json" \
  -d '{"code": 0, "data": {}, "shop_id": "123", "timestamp": 1234567890}'
```

2. Pastikan return 200 OK
3. Cek Vercel logs untuk error

---

## 📈 Flow Diagram

### Order Flow (Shopee → POS)
```
1. Customer buat order di Shopee
   ↓
2. Shopee kirim webhook (code: 0) ke endpoint kamu
   ↓
3. Webhook handler simpan order ke shopee_orders
   ↓
4. Order status = COMPLETED
   ↓
5. Auto kurangi stok di products
   ↓
6. Catat di stock_movements
```

### Stock Flow (POS → Shopee)
```
1. User update stok produk di POS
   ↓
2. Trigger auto_stock_sync_trigger (database trigger)
   ↓
3. Insert ke shopee_sync_queue
   ↓
4. Sync processor (cron job setiap 5 menit)
   ↓
5. Call Shopee API update_stock
   ↓
6. Catat di shopee_stock_sync_history
```

---

## 🎯 Best Practices

1. **Monitor webhook logs** secara berkala
2. **Set up alerts** untuk failed webhooks/syncs
3. **Backup database** sebelum production
4. **Test di sandbox** Shopee dulu sebelum production
5. **Rate limiting**: Jangan sync terlalu sering (max 1x per produk per menit)
6. **Retry logic**: Failed sync akan auto-retry 3x dengan delay

---

## 📞 Support

Jika ada masalah:
1. Cek logs di Vercel Dashboard
2. Cek `shopee_webhook_logs` di database
3. Cek `shopee_sync_queue` untuk stuck items
4. Review Shopee API documentation: https://open.shopee.com/documents

---

## ✅ Checklist Setup

- [ ] Database schema sudah dijalankan
- [ ] Webhook endpoint deployed & accessible
- [ ] Callback URL di-verify di Shopee Console
- [ ] Push events sudah diaktifkan (code: 0, 3, 7)
- [ ] Environment variables sudah di-set
- [ ] Cron job sync processor sudah jalan
- [ ] Test webhook receiving (buat order test)
- [ ] Test auto stock sync (update stok di POS)
- [ ] Monitoring dashboard ready

**Selamat! Full 2-Way Sync sudah aktif! 🎉**
