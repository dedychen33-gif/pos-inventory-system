# Fitur Update Produk ke Marketplace

## Overview
Fitur ini memungkinkan Anda mengubah data produk dari Master Produk dan langsung menyinkronkan perubahan ke marketplace (Shopee, Lazada, Tokopedia, TikTok).

## Field yang Bisa Diupdate ke Marketplace

### ✅ Yang Bisa Diupdate:
1. **Nama Produk** - Mengubah nama produk di marketplace
2. **Harga Jual** - Mengubah harga jual produk
3. **SKU** - Mengubah kode SKU produk
4. **Stok** - Mengubah jumlah stok produk

### ❌ Yang TIDAK Bisa Diupdate ke Marketplace:
1. **Harga Modal/Beli** - Marketplace tidak menyimpan harga beli, hanya tersimpan di database lokal
2. **Kategori** - Kategori marketplace berbeda dengan kategori lokal
3. **Foto Produk** - Memerlukan proses upload terpisah di dashboard marketplace

## Cara Menggunakan

### 1. Edit Produk dari Marketplace
1. Buka **Master Produk**
2. Cari produk yang berasal dari marketplace (ada badge Shopee/Lazada/dll)
3. Klik tombol **Edit** pada produk tersebut

### 2. Ubah Data Produk
Ubah salah satu atau semua field berikut:
- **Nama Produk** - Ketik nama baru
- **Harga Jual** - Masukkan harga baru
- **SKU** - Ubah kode SKU
- **Stok** - Ubah jumlah stok

### 3. Aktifkan Sync ke Marketplace
- ✅ **Centang checkbox** "Update juga ke [Nama Marketplace]"
- Checkbox ini hanya muncul untuk produk dari marketplace

### 4. Simpan Perubahan
- Klik tombol **"Update Produk + Sync"**
- Tunggu proses sync selesai
- Anda akan melihat notifikasi:
  - ✅ **"Berhasil update ke Shopee!"** - Jika berhasil
  - ❌ **"Gagal update: [error]"** - Jika gagal

## Contoh Penggunaan

### Contoh 1: Update Harga Produk Shopee
```
1. Edit produk "Speaker Bluetooth XYZ" dari Shopee
2. Ubah harga dari Rp 150.000 → Rp 135.000
3. Centang "Update juga ke Shopee"
4. Klik "Update Produk + Sync"
5. ✅ Harga di Shopee berubah menjadi Rp 135.000
```

### Contoh 2: Update SKU Produk Lazada
```
1. Edit produk "Headphone ABC" dari Lazada
2. Ubah SKU dari "OLD-SKU-123" → "NEW-SKU-456"
3. Centang "Update juga ke Lazada"
4. Klik "Update Produk + Sync"
5. ✅ SKU di Lazada berubah menjadi "NEW-SKU-456"
```

### Contoh 3: Update Nama dan Harga Sekaligus
```
1. Edit produk "Mic Wireless" dari Tokopedia
2. Ubah nama → "Mic Wireless Premium Edition"
3. Ubah harga → Rp 250.000
4. Centang "Update juga ke Tokopedia"
5. Klik "Update Produk + Sync"
6. ✅ Nama dan harga di Tokopedia terupdate
```

## Platform yang Didukung

| Platform | Update Nama | Update Harga | Update SKU | Update Stok |
|----------|-------------|--------------|------------|-------------|
| Shopee | ✅ | ✅ | ✅ | ✅ |
| Lazada | ✅ | ✅ | ✅ | ✅ |
| Tokopedia | ✅ | ✅ | ✅ | ✅ |
| TikTok Shop | ✅ | ✅ | ✅ | ✅ |

## Catatan Penting

### 1. Harga Modal Tidak Tersync
- **Harga modal/beli** hanya tersimpan di database lokal Anda
- Marketplace tidak menyimpan harga beli, hanya harga jual
- Anda tetap bisa ubah harga modal di form, tapi tidak akan tersync ke marketplace

### 2. Produk Harus dari Marketplace
- Fitur ini hanya bekerja untuk produk yang di-sync dari marketplace
- Produk lokal tidak bisa di-sync ke marketplace (harus upload manual)

### 3. Koneksi Marketplace Harus Aktif
- Pastikan toko marketplace Anda sudah terkoneksi
- Cek di menu **Pengaturan → Marketplace** untuk memastikan koneksi aktif

### 4. Perubahan Real-time
- Perubahan akan langsung terlihat di marketplace
- Refresh halaman produk di marketplace untuk melihat perubahan

## Troubleshooting

### Error: "Toko [Platform] tidak ditemukan atau tidak aktif"
**Solusi:**
1. Buka menu **Pengaturan → Marketplace**
2. Pastikan toko marketplace sudah terkoneksi
3. Cek status koneksi (harus hijau/aktif)

### Error: "Gagal update: Missing required parameters"
**Solusi:**
1. Pastikan semua field wajib terisi (nama, harga, SKU)
2. Pastikan produk punya ID marketplace (shopeeItemId, lazadaItemId, dll)

### Error: "Gagal update: [API Error]"
**Solusi:**
1. Cek koneksi internet
2. Pastikan token marketplace masih valid
3. Refresh token di menu Pengaturan → Marketplace

### Checkbox "Update juga ke Marketplace" Tidak Muncul
**Penyebab:**
- Produk bukan dari marketplace (produk lokal)
- Field `source` produk tidak terisi dengan benar

**Solusi:**
- Fitur ini hanya untuk produk dari marketplace
- Produk lokal harus diupload manual ke marketplace

## Technical Details

### API Endpoint
```
POST /api/shopee/update-product
POST /api/lazada/update-product
POST /api/tokopedia/update-product
POST /api/tiktok/update-product
```

### Request Payload
```json
{
  "partner_id": "xxx",
  "partner_key": "xxx",
  "shop_id": "xxx",
  "access_token": "xxx",
  "item_id": "123456",
  "model_id": "789012",
  "name": "Nama Produk Baru",
  "price": 150000,
  "stock": 100,
  "sku": "SKU-NEW-001",
  "action": "update_all"
}
```

### Response
```json
{
  "success": true,
  "message": "Product updated successfully",
  "results": {
    "name": { "success": true },
    "price": { "success": true },
    "stock": { "success": true },
    "sku": { "success": true }
  }
}
```

## Changelog

### Version 2.0 (Current)
- ✅ Support update nama produk
- ✅ Support update harga jual
- ✅ Support update SKU
- ✅ Support update stok
- ✅ Support semua marketplace (Shopee, Lazada, Tokopedia, TikTok)
- ✅ Notifikasi sukses/error yang jelas
- ✅ Checkbox konfirmasi sebelum sync

### Version 1.0
- ✅ Support update harga dan stok Shopee saja

## FAQ

**Q: Apakah bisa update harga modal ke marketplace?**
A: Tidak. Marketplace tidak menyimpan harga modal/beli. Harga modal hanya tersimpan di database lokal Anda.

**Q: Apakah perubahan langsung terlihat di marketplace?**
A: Ya, perubahan akan langsung terlihat. Refresh halaman produk di marketplace untuk melihat perubahan.

**Q: Apakah bisa update foto produk?**
A: Tidak melalui fitur ini. Upload foto harus dilakukan manual di dashboard marketplace.

**Q: Apakah bisa update kategori produk?**
A: Tidak. Kategori marketplace berbeda dengan kategori lokal dan tidak bisa diubah via API.

**Q: Bagaimana jika gagal update?**
A: Anda akan melihat notifikasi error dengan pesan kesalahan. Cek koneksi marketplace dan coba lagi.

**Q: Apakah bisa update produk varian?**
A: Ya, untuk produk dengan varian, sistem akan update varian yang sesuai berdasarkan model_id.
