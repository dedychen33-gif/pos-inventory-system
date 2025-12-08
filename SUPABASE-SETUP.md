# Setup Supabase untuk POS System

## 📋 Langkah-langkah Setup

### 1. Buat Akun Supabase (Gratis)
1. Buka https://supabase.com
2. Klik "Start your project"
3. Login dengan GitHub atau email
4. Klik "New Project"
5. Isi:
   - **Name**: `pos-inventory`
   - **Database Password**: (buat password kuat, simpan!)
   - **Region**: Pilih yang terdekat (Singapore)
6. Klik "Create new project"
7. Tunggu 1-2 menit sampai project ready

### 2. Jalankan SQL Schema
1. Di dashboard Supabase, klik **SQL Editor** (icon database di sidebar kiri)
2. Klik **New Query**
3. Copy semua isi file `supabase-schema.sql` dari project ini
4. Paste ke SQL Editor
5. Klik **Run** (atau Ctrl+Enter)
6. Pastikan tidak ada error (hijau = sukses)

### 3. Ambil Kredensial API
1. Di dashboard, klik **Settings** (gear icon) di sidebar
2. Klik **API** di submenu
3. Copy:
   - **Project URL** → contoh: `https://xxxxx.supabase.co`
   - **anon public key** → string panjang dimulai dengan `eyJ...`

### 4. Konfigurasi di Project
Buat file `.env` di root project (copy dari `.env.example`):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Enable Realtime
1. Di dashboard, klik **Database** → **Replication**
2. Pastikan tabel berikut sudah enabled untuk Realtime:
   - ✅ products
   - ✅ categories
   - ✅ units
   - ✅ customers
   - ✅ transactions
   - ✅ suppliers
   - ✅ purchases

### 6. Build & Test
```bash
# Build ulang
npm run build

# Test di browser
npm run dev

# Sync ke Android
npm run android:build
```

---

## 🔄 Cara Kerja Realtime Sync

1. **Optimistic Update**: Perubahan langsung tampil di device yang mengubah
2. **Sync to Cloud**: Data dikirim ke Supabase
3. **Broadcast**: Supabase broadcast ke semua device yang terhubung
4. **Auto Update**: Device lain otomatis update tanpa refresh

```
[Android App] ←→ [Supabase Cloud] ←→ [Web Browser]
     ↓                   ↓                   ↓
  Local State    PostgreSQL DB         Local State
```

---

## ⚠️ Troubleshooting

### Data tidak sinkron?
1. Cek koneksi internet
2. Pastikan `.env` sudah benar
3. Cek console browser untuk error
4. Pastikan Realtime enabled di Supabase

### Error "relation does not exist"?
- Jalankan ulang SQL schema di Supabase SQL Editor

### Slow sync?
- Supabase free tier ada limit, upgrade jika perlu

---

## 💰 Supabase Pricing (Free Tier)

| Feature | Limit |
|---------|-------|
| Database | 500 MB |
| Bandwidth | 5 GB/bulan |
| Realtime | 200 concurrent |
| API Requests | Unlimited |

Cukup untuk bisnis kecil-menengah!
