# Fitur Update Produk ke Marketplace

## 📋 Deskripsi
Fitur ini memungkinkan Anda untuk mengupdate informasi produk (nama, harga, SKU, stok) dari **Master Produk** dan secara otomatis menyinkronkan perubahan tersebut ke marketplace yang terhubung.

## ✨ Fitur yang Tersedia

### 1. Update Multi-Field
- ✅ **Nama Produk** - Update nama produk di marketplace
- ✅ **Harga Jual** - Update harga jual produk
- ✅ **SKU** - Update kode SKU produk
- ✅ **Stok** - Update jumlah stok produk

### 2. Support Multi-Platform
- ✅ **Shopee** - Full support
- ✅ **Lazada** - Full support
- ✅ **Tokopedia** - Full support
- ✅ **TikTok Shop** - Full support

## 🚀 Cara Menggunakan

### Langkah 1: Buka Master Produk
1. Buka menu **Master Produk**
2. Cari produk yang ingin diupdate (produk harus dari marketplace)

### Langkah 2: Edit Produk
1. Klik tombol **Edit** (icon pensil) pada produk
2. Form edit akan terbuka

### Langkah 3: Aktifkan Sync ke Marketplace
1. Jika produk berasal dari marketplace, akan muncul **checkbox biru** di bagian atas form
2. Centang checkbox **"Update juga ke [Nama Marketplace]"**
3. Akan muncul informasi: *"Nama, harga, stok, dan SKU akan diperbarui di marketplace saat menyimpan"*

### Langkah 4: Ubah Data Produk
1. Ubah **Nama Produk** sesuai keinginan
2. Ubah **Harga Jual** jika perlu
3. Ubah **SKU** jika perlu
4. Ubah **Stok** jika perlu

### Langkah 5: Simpan & Sync
1. Klik tombol **"Update Produk + Sync"**
2. Sistem akan:
   - Menyimpan perubahan ke database lokal
   - Mengirim update ke marketplace
   - Menampilkan notifikasi hasil sync

## 📊 Status Sync

### Status yang Muncul:
- 🔵 **Menyinkronkan...** - Sedang proses update ke marketplace
- ✅ **Berhasil update ke [Platform]!** - Update berhasil
- ❌ **Gagal update: [Error]** - Update gagal dengan pesan error

## ⚙️ Teknis Implementation

### File yang Dimodifikasi:

#### 1. `src/services/marketplaceApi.js`
Ditambahkan fungsi `updateProduct` untuk setiap platform:

```javascript
// Shopee
shopeeApi.updateProduct(store, itemId, modelId, updates)

// Lazada
lazadaApi.updateProduct(store, itemId, skuId, updates)

// Tokopedia
tokopediaApi.updateProduct(store, productId, updates)

// TikTok
tiktokApi.updateProduct(store, productId, updates)

// Unified Service
marketplaceService.updateProduct(store, productId, variantId, updates)
```

#### 2. `src/pages/Products.jsx`
- Import `marketplaceService`
- Ubah state `syncToShopee` menjadi `syncToMarketplace` (universal)
- Modifikasi checkbox untuk support semua platform
- Update logika `handleSubmit` untuk call API marketplace

### Parameter Update:
```javascript
const updates = {
  name: "Nama Produk Baru",
  price: 150000,
  stock: 100,
  sku: "SKU123456"
}
```

### Mapping Product ID per Platform:
- **Shopee**: `shopeeItemId` + `shopeeModelId` (untuk variant)
- **Lazada**: `lazadaItemId` + `lazadaSkuId` (untuk variant)
- **Tokopedia**: `tokopediaProductId`
- **TikTok**: `tiktokProductId`

## 🔐 Keamanan

### Validasi:
1. ✅ Cek apakah produk berasal dari marketplace
2. ✅ Cek apakah toko marketplace aktif
3. ✅ Cek apakah credentials tersedia
4. ✅ Error handling untuk setiap platform

### Credentials Required:
- **Shopee**: `partnerId`, `partnerKey`, `shopId`, `accessToken`
- **Lazada**: `appKey`, `appSecret`, `accessToken`
- **Tokopedia**: `fsId`, `accessToken`
- **TikTok**: `shopId`, `accessToken`

## ⚠️ Catatan Penting

### 1. Produk Lokal vs Marketplace
- Fitur ini **HANYA** untuk produk yang berasal dari marketplace
- Produk lokal (bukan dari marketplace) tidak akan menampilkan checkbox sync

### 2. Koneksi Internet
- Pastikan koneksi internet stabil saat melakukan sync
- Jika gagal, akan muncul pesan error yang jelas

### 3. Token Expired
- Jika token marketplace expired, sync akan gagal
- Silakan re-authorize marketplace di menu **Marketplace Integration**

### 4. Rate Limiting
- Beberapa marketplace memiliki rate limit API
- Jangan melakukan update terlalu sering dalam waktu singkat

## 🐛 Troubleshooting

### Error: "Toko [Platform] tidak ditemukan atau tidak aktif"
**Solusi**: 
- Pastikan toko sudah terhubung di menu Marketplace Integration
- Pastikan status toko "Active"

### Error: "Token expired" atau "Unauthorized"
**Solusi**:
- Re-authorize marketplace di menu Marketplace Integration
- Klik tombol "Connect" atau "Re-authorize"

### Error: "Product ID not found"
**Solusi**:
- Produk mungkin sudah dihapus di marketplace
- Sync ulang produk dari marketplace

### Update berhasil di lokal tapi gagal di marketplace
**Solusi**:
- Cek koneksi internet
- Cek log error untuk detail masalah
- Pastikan data yang diupdate sesuai format marketplace

## 📝 Contoh Penggunaan

### Skenario 1: Update Harga Produk Shopee
1. Buka produk dari Shopee di Master Produk
2. Klik Edit
3. Centang "Update juga ke Shopee"
4. Ubah harga dari Rp 100.000 → Rp 120.000
5. Klik "Update Produk + Sync"
6. ✅ Harga berubah di lokal DAN di Shopee

### Skenario 2: Update Stok Produk Lazada
1. Buka produk dari Lazada
2. Klik Edit
3. Centang "Update juga ke Lazada"
4. Ubah stok dari 50 → 100
5. Klik "Update Produk + Sync"
6. ✅ Stok berubah di lokal DAN di Lazada

### Skenario 3: Update Nama & SKU Tokopedia
1. Buka produk dari Tokopedia
2. Klik Edit
3. Centang "Update juga ke Tokopedia"
4. Ubah nama dan SKU
5. Klik "Update Produk + Sync"
6. ✅ Nama & SKU berubah di lokal DAN di Tokopedia

## 🎯 Keuntungan Fitur Ini

1. ✅ **Efisiensi Waktu** - Update sekali, sync otomatis
2. ✅ **Konsistensi Data** - Data lokal dan marketplace selalu sinkron
3. ✅ **Multi-Platform** - Support 4 marketplace sekaligus
4. ✅ **User-Friendly** - Cukup centang checkbox
5. ✅ **Error Handling** - Notifikasi jelas jika ada error

## 📞 Support

Jika ada masalah atau pertanyaan:
1. Cek dokumentasi ini terlebih dahulu
2. Cek log error di console browser (F12)
3. Pastikan backend API berjalan dengan baik
4. Hubungi developer untuk bantuan lebih lanjut

---

**Version**: 1.0.0  
**Last Updated**: 11 Desember 2025  
**Author**: POS Inventory System Team
