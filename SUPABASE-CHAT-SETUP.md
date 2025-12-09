# Setup Chat Marketplace dengan Supabase

## Langkah 1: Jalankan SQL Schema

Buka **Supabase Dashboard** → **SQL Editor** → jalankan file `supabase-chat-schema.sql`:

```sql
-- Copy paste isi file supabase-chat-schema.sql
```

Ini akan membuat tabel:
- `marketplace_conversations` - Daftar percakapan
- `marketplace_messages` - Pesan chat
- `marketplace_tokens` - Token marketplace

## Langkah 2: Deploy Edge Function (Webhook Handler)

```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login ke Supabase
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy chat-webhook
```

## Langkah 3: Dapatkan Webhook URL

Setelah deploy, URL webhook Anda adalah:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/shopee
https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/lazada
https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/tokopedia
https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/tiktok
```

## Langkah 4: Daftarkan Webhook di Marketplace

### Shopee Open Platform
1. Buka https://open.shopee.com/
2. Masuk ke App Anda → **Push Mechanism**
3. Enable **webchat_push** (code 10)
4. Masukkan URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/shopee`
5. Save

### Lazada Open Platform
1. Buka Seller Center → Developer Settings
2. Tambahkan Webhook URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/lazada`

### Tokopedia Open API
1. Buka https://developer.tokopedia.com/
2. Masuk ke App → Webhook Settings
3. Masukkan URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/tokopedia`

### TikTok Shop
1. Buka TikTok Shop Seller Center
2. Developer Settings → Webhook
3. Masukkan URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/tiktok`

## Langkah 5: Set Environment Variables (Optional)

Di Supabase Dashboard → Settings → Edge Functions → Environment Variables:

```
SHOPEE_PARTNER_KEY=your_partner_key
LAZADA_APP_SECRET=your_app_secret
TOKOPEDIA_FS_SECRET=your_fs_secret
TIKTOK_APP_SECRET=your_app_secret
```

## Cara Kerja

```
┌─────────────────┐     Webhook      ┌────────────────────┐
│  Shopee/Lazada  │ ───────────────> │  Supabase Edge     │
│  /Tokopedia     │                  │  Function          │
└─────────────────┘                  └─────────┬──────────┘
                                               │
                                               ▼
                                     ┌─────────────────────┐
                                     │  Supabase Database  │
                                     │  (marketplace_      │
                                     │   messages table)   │
                                     └─────────┬───────────┘
                                               │ Realtime
                                               ▼
                                     ┌─────────────────────┐
                                     │  Frontend React     │
                                     │  (MarketplaceChat)  │
                                     │  🔔 Sound + Notif   │
                                     └─────────────────────┘
```

## Fitur

- ✅ **Realtime Chat** - Pesan masuk langsung muncul tanpa refresh
- ✅ **Sound Notification** - Bunyi notifikasi saat ada chat baru
- ✅ **Browser Notification** - Notifikasi di desktop
- ✅ **Multi Marketplace** - Shopee, Lazada, Tokopedia, TikTok dalam satu dashboard
- ✅ **Unread Counter** - Badge jumlah pesan belum dibaca
- ✅ **Demo Mode** - Bisa digunakan tanpa Supabase (data demo)

## Troubleshooting

### Chat tidak realtime?
1. Pastikan Supabase URL dan Key sudah benar di `.env`
2. Pastikan tabel sudah di-enable untuk realtime (cek schema SQL)
3. Cek browser console untuk error

### Webhook tidak masuk?
1. Cek log Edge Function di Supabase Dashboard
2. Pastikan URL webhook benar di marketplace
3. Test webhook dengan curl:
```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/chat-webhook/shopee \
  -H "Content-Type: application/json" \
  -d '{"code": 10, "data": {"conversation_id": "test", "content": {"text": "Test message"}}}'
```

### Sound tidak bunyi?
1. Pastikan sound enabled di Settings → Chat Notification
2. Browser mungkin block autoplay - klik halaman dulu
3. Cek volume browser dan sistem
