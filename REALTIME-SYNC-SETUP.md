# 🔄 Real-Time Sync Setup Guide

Panduan untuk mengaktifkan sinkronisasi real-time antara **Android App** dan **Web App**.

## Cara Kerja

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Android    │ ◄─────► │    Supabase      │ ◄─────► │    Web      │
│    App      │         │   (Real-time)    │         │    App      │
└─────────────┘         └──────────────────┘         └─────────────┘
                              WebSocket
                           (~100ms latency)
```

- Ketika data berubah di **Web** → Supabase broadcast ke **Android** secara instant
- Ketika data berubah di **Android** → Supabase broadcast ke **Web** secara instant
- Latency: **~100-300ms** (hampir real-time)

## Setup (Satu Kali)

### Step 1: Enable Realtime di Supabase

1. Buka **Supabase Dashboard** → Project Anda
2. Klik **SQL Editor** di sidebar kiri
3. Copy-paste isi file `supabase-enable-realtime.sql`
4. Klik **Run** untuk menjalankan SQL

```sql
-- Quick version (jalankan ini di SQL Editor):
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE units;
```

### Step 2: Verifikasi Realtime Aktif

Jalankan query ini di SQL Editor untuk memastikan tables sudah terdaftar:

```sql
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Harus muncul: `products`, `customers`, `transactions`, dll.

### Step 3: Build & Deploy

```bash
# Build web app
npm run build

# Sync ke Android
npx cap sync android

# Build Android APK
cd android && ./gradlew assembleDebug
```

## Testing Real-Time Sync

1. **Buka Web App** di browser komputer
2. **Buka Android App** di HP
3. **Login** dengan akun yang sama di kedua device
4. **Test sync:**
   - Tambah produk baru di Web → Cek muncul di Android (instant)
   - Edit stok di Android → Cek berubah di Web (instant)
   - Tambah customer di Android → Cek muncul di Web (instant)

## Indikator Status Sync

Di header app ada icon cloud:

| Icon | Status |
|------|--------|
| ☁️ (hijau) | Real-time connected - sync aktif |
| ☁️ (kuning, berkedip) | Connecting... |
| ☁️ (abu-abu) | Offline mode |
| 🔄 (spinning) | Syncing data... |

## Data yang Di-Sync

| Data | Sync Real-time | Keterangan |
|------|---------------|------------|
| Products | ✅ | Nama, harga, stok, dll |
| Customers | ✅ | Data pelanggan |
| Transactions | ✅ | Penjualan POS |
| Users | ✅ | Login credentials |
| Categories | ✅ | Kategori produk |
| Units | ✅ | Satuan produk |

## Troubleshooting

### Sync tidak berjalan?

1. **Cek Supabase configured:**
   - Pastikan `.env` sudah diisi dengan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`

2. **Cek Realtime enabled:**
   - Jalankan SQL di Step 2 untuk verifikasi

3. **Cek Console browser:**
   - Buka DevTools (F12) → Console
   - Cari log: `✅ Real-time sync connected!`

4. **Cek Network:**
   - Pastikan tidak ada firewall yang memblokir WebSocket

### Data tidak muncul di device lain?

1. **Refresh app** di device yang tidak menerima update
2. **Cek internet connection** di kedua device
3. **Logout & login ulang** untuk force re-sync

### Android app lambat sync?

1. Pastikan app tidak di-kill oleh battery optimization
2. Tambahkan app ke whitelist battery optimization
3. Cek apakah ada VPN yang mengganggu WebSocket

## Architecture Details

```
src/
├── hooks/
│   └── useRealtimeSync.js    # Central realtime subscription hub
├── store/
│   ├── productStore.js       # Products + push to Supabase
│   ├── customerStore.js      # Customers + push to Supabase
│   └── transactionStore.js   # Transactions + push to Supabase
└── lib/
    └── supabase.js           # Supabase client config
```

**Flow:**
1. User melakukan aksi (tambah/edit/hapus) di app
2. Store langsung push ke Supabase
3. Supabase broadcast perubahan via WebSocket
4. `useRealtimeSync.js` menerima event dan update store
5. UI otomatis re-render dengan data terbaru

## Performance Tips

1. **Batasi data yang di-fetch:** Transactions dibatasi 500 terbaru
2. **Use indexes:** Pastikan ada index di kolom yang sering di-query
3. **Compress images:** Gunakan URL gambar yang sudah dicompress

---

**Last Updated:** December 2024
