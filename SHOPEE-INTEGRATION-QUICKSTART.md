# 🚀 Shopee Integration Quick Start

## Setup dalam 5 Langkah

### 1️⃣ Setup Database (5 menit)

Buka **Supabase Dashboard** → **SQL Editor**, jalankan file ini **berurutan**:

```bash
1. supabase-full-schema.sql              # Jika belum pernah dijalankan
2. supabase-shopee-webhook-schema.sql    # WAJIB - Schema webhook & sync
```

**Verifikasi berhasil:**
```sql
SELECT COUNT(*) FROM shopee_webhook_logs;
SELECT COUNT(*) FROM shopee_sync_queue;
```

---

### 2️⃣ Deploy ke Vercel (3 menit)

```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Deploy
vercel --prod

# Catat URL yang muncul, contoh:
# https://pos-inventory-system.vercel.app
```

**Webhook URL kamu:**
```
https://[your-project].vercel.app/api/shopee/webhook
```

---

### 3️⃣ Konfigurasi di Shopee Console (5 menit)

1. **Login**: https://open.shopee.com/
2. **Pilih App** kamu
3. **Push Mechanism** → **Set Push**

**A. Set Callback URL:**
- **Deployment Service Area**: Pilih **Singapore**
- **Callback URL**: `https://[your-project].vercel.app/api/shopee/webhook`
- Klik **Verify** (harus hijau ✅)

**B. Aktifkan Push Events:**

Toggle ON untuk event ini:

| Push Code | Event Name | Fungsi |
|-----------|------------|--------|
| **8** | `reserved_stock_change_push` | Stok reserved berubah |
| **0** | Order status change | Order status update |
| **3** | Buyer cancel | Order dibatalkan |

**C. Copy Partner Key:**
- Di bagian **Live Push Partner Key**
- Copy key tersebut

---

### 4️⃣ Environment Variables

Update `.env`:

```env
# Supabase (sudah ada)
VITE_SUPABASE_URL=https://naydyhkqodppdhzwkctr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Shopee Credentials (dari Shopee Console)
SHOPEE_PARTNER_ID=your_partner_id
SHOPEE_PARTNER_KEY=your_partner_key
SHOPEE_SHOP_ID=your_shop_id

# PENTING: Push Partner Key (dari step 3C)
SHOPEE_PUSH_PARTNER_KEY=your_push_partner_key
```

**Deploy ulang setelah update .env:**
```bash
vercel --prod
```

---

### 5️⃣ Test Integration (5 menit)

**Test 1: Webhook Receiving**
1. Buat order test di Shopee Seller Center
2. Ubah status order ke **READY_TO_SHIP**
3. Cek log:
```sql
SELECT * FROM shopee_webhook_logs 
ORDER BY created_at DESC LIMIT 5;
```

**Test 2: Auto Stock Sync**
1. Sync produk dari Shopee dulu (jika belum):
   - Buka POS → Master Produk
   - Klik "Sync dari Shopee"
   
2. Update stok produk Shopee di POS:
   - Edit produk yang `source = 'shopee'`
   - Ubah stok, simpan
   
3. Cek sync queue:
```sql
SELECT * FROM shopee_sync_queue 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

4. Tunggu 5 menit (auto-sync via cron) atau trigger manual:
```bash
curl -X POST https://[your-project].vercel.app/api/shopee/sync-processor
```

5. Cek di Shopee Seller Center → stok sudah berubah ✅

---

## 🎯 Cara Kerja

### Order Flow (Shopee → POS)
```
Order baru di Shopee
  ↓
Webhook diterima (code: 0)
  ↓
Simpan ke shopee_orders
  ↓
Status = COMPLETED
  ↓
Auto kurangi stok di products
  ↓
Catat di stock_movements
```

### Stock Flow (POS → Shopee)
```
Update stok di POS
  ↓
Database trigger: auto_stock_sync_trigger
  ↓
Insert ke shopee_sync_queue
  ↓
Cron job (setiap 5 menit)
  ↓
Call Shopee API update_stock
  ↓
Catat di shopee_stock_sync_history
```

---

## 📊 Monitoring

### Via SQL
```sql
-- Webhook stats hari ini
SELECT 
  webhook_name,
  status,
  COUNT(*) as count
FROM shopee_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY webhook_name, status;

-- Sync queue pending
SELECT 
  sync_type,
  COUNT(*) as count
FROM shopee_sync_queue
WHERE status = 'pending'
GROUP BY sync_type;

-- Failed syncs
SELECT * FROM shopee_sync_queue
WHERE status = 'failed'
ORDER BY created_at DESC;
```

### Via Dashboard (Coming Soon)
Import component di POS:
```jsx
import ShopeeWebhookMonitor from './components/ShopeeWebhookMonitor';

// Di halaman Settings atau Dashboard
<ShopeeWebhookMonitor />
```

---

## ⚡ Tips & Best Practices

### 1. Auto-Sync Only untuk Produk Shopee
Sistem hanya akan sync produk yang:
- `source = 'shopee'`
- Punya `shopee_item_id`

Produk lokal **tidak** akan di-sync ke Shopee.

### 2. Manual Queue Sync
Jika tidak mau tunggu 5 menit:
```bash
curl -X POST https://[your-project].vercel.app/api/shopee/sync-processor
```

### 3. Retry Failed Sync
```sql
-- Reset failed sync untuk retry
UPDATE shopee_sync_queue 
SET status = 'pending', retry_count = 0
WHERE id = [queue_id];
```

### 4. Monitor Webhook Health
```sql
-- Cek webhook yang gagal
SELECT * FROM shopee_webhook_logs
WHERE status = 'failed'
AND created_at > NOW() - INTERVAL '1 day';
```

---

## 🔧 Troubleshooting

### Webhook tidak diterima
**Cek:**
1. URL accessible? Test: `curl https://[your-url]/api/shopee/webhook`
2. Callback URL di Shopee Console sudah di-verify?
3. Push events sudah diaktifkan?

### Stock tidak sync ke Shopee
**Cek:**
1. Produk punya `shopee_item_id`?
   ```sql
   SELECT id, name, shopee_item_id, source FROM products WHERE id = [product_id];
   ```
2. Ada di sync queue?
   ```sql
   SELECT * FROM shopee_sync_queue WHERE product_id = [product_id];
   ```
3. Cron job jalan? Cek Vercel Dashboard → Logs

### Signature verification failed
**Solusi:**
1. Pastikan `SHOPEE_PUSH_PARTNER_KEY` di `.env` sama dengan **Live Push Partner Key** di Shopee Console
2. Deploy ulang: `vercel --prod`

---

## 📞 Support

**File penting:**
- `SHOPEE-WEBHOOK-SETUP.md` - Setup detail lengkap
- `supabase-shopee-webhook-schema.sql` - Database schema
- `api/shopee/webhook.js` - Webhook handler
- `api/shopee/sync-processor.js` - Auto sync processor

**Logs:**
- Vercel Dashboard → Logs
- Supabase → Table Editor → `shopee_webhook_logs`
- Supabase → Table Editor → `shopee_sync_queue`

---

## ✅ Checklist

- [ ] Database schema sudah dijalankan
- [ ] Deploy ke Vercel berhasil
- [ ] Callback URL di-verify di Shopee Console (hijau ✅)
- [ ] Push events diaktifkan (code: 0, 3, 8)
- [ ] Environment variables sudah di-set
- [ ] Test webhook: buat order test → cek `shopee_webhook_logs`
- [ ] Test stock sync: update stok → cek `shopee_sync_queue`
- [ ] Monitoring dashboard ready

**Selamat! Full 2-Way Sync sudah aktif! 🎉**
