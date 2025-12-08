# Setup Auto Refresh Token Shopee dengan Supabase

## Langkah 1: Jalankan SQL Schema

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy-paste isi file `supabase-token-refresh.sql`
3. Klik **Run**

Ini akan membuat:
- Tabel `shopee_tokens` - menyimpan token
- Tabel `shopee_logs` - log aktivitas
- Function helper untuk logging

---

## Langkah 2: Deploy Edge Function

### Opsi A: Via Supabase CLI

```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
supabase functions deploy refresh-shopee-token
```

### Opsi B: Via Dashboard

1. Buka **Supabase Dashboard** → **Edge Functions**
2. Klik **New Function**
3. Nama: `refresh-shopee-token`
4. Copy-paste kode dari `supabase/functions/refresh-shopee-token/index.ts`
5. Klik **Deploy**

---

## Langkah 3: Setup Cron Job (Pilih salah satu)

### Opsi A: Menggunakan cron-job.org (Gratis)

1. Daftar di https://cron-job.org
2. Buat cron job baru:
   - **URL:** `https://YOUR_PROJECT.supabase.co/functions/v1/refresh-shopee-token`
   - **Headers:** 
     ```
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
     ```
   - **Schedule:** Every 3 hours (0 */3 * * *)
3. Aktifkan cron job

### Opsi B: Menggunakan GitHub Actions (Gratis)

Buat file `.github/workflows/refresh-token.yml`:

```yaml
name: Refresh Shopee Token

on:
  schedule:
    # Setiap 3 jam
    - cron: '0 */3 * * *'
  workflow_dispatch: # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - name: Refresh Token
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://YOUR_PROJECT.supabase.co/functions/v1/refresh-shopee-token
```

Tambahkan secret `SUPABASE_ANON_KEY` di GitHub repository settings.

### Opsi C: Menggunakan Supabase pg_cron (Pro Plan)

Jika menggunakan Supabase Pro, bisa pakai pg_cron:

```sql
-- Enable pg_cron (hanya Pro plan)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh setiap 3 jam
SELECT cron.schedule(
  'refresh-shopee-token',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/refresh-shopee-token',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

---

## Langkah 4: Simpan Token ke Database

Update aplikasi untuk menyimpan token ke Supabase saat OAuth berhasil.

Di `Marketplace.jsx`, setelah dapat token dari Shopee:

```javascript
// Simpan ke Supabase
const { error } = await supabase
  .from('shopee_tokens')
  .upsert({
    shop_id: shopId,
    partner_id: partnerId,
    partner_key: partnerKey,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expiry: new Date(Date.now() + expireIn * 1000).toISOString()
  }, { onConflict: 'shop_id' });
```

---

## Langkah 5: Update Frontend untuk Ambil Token dari Supabase

```javascript
// Ambil token terbaru dari Supabase
const { data } = await supabase
  .from('shopee_tokens')
  .select('access_token, refresh_token, token_expiry')
  .eq('shop_id', shopId)
  .single();

if (data) {
  setShopeeConfig(prev => ({
    ...prev,
    accessToken: data.access_token,
    refreshToken: data.refresh_token
  }));
}
```

---

## Testing

### Test Edge Function:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"shop_id": "669903315"}' \
  https://YOUR_PROJECT.supabase.co/functions/v1/refresh-shopee-token
```

### Cek Logs:

```sql
SELECT * FROM shopee_logs ORDER BY created_at DESC LIMIT 20;
```

### Cek Token Status:

```sql
SELECT * FROM shopee_token_status;
```

---

## Troubleshooting

### Token tidak refresh:
1. Cek apakah `refresh_token` ada di database
2. Cek logs di `shopee_logs`
3. Pastikan cron job berjalan

### Edge Function error:
1. Cek Supabase Dashboard → Edge Functions → Logs
2. Pastikan environment variables benar

### Cron job tidak jalan:
1. Cek status di cron-job.org atau GitHub Actions
2. Pastikan URL dan headers benar

---

## Summary

| Komponen | Fungsi |
|----------|--------|
| `shopee_tokens` | Simpan token persisten |
| `shopee_logs` | Log aktivitas refresh |
| `refresh-shopee-token` | Edge Function untuk refresh |
| Cron Job | Trigger refresh setiap 3 jam |
