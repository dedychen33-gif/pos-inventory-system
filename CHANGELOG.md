# Changelog

## [Update] - 6 Desember 2025

### ✨ Perubahan Struktur Modul

#### 📦 Modul "Penjualan" → "Sales Order"
**Sebelumnya:** Menampilkan riwayat transaksi kasir  
**Sekarang:** Modul untuk membuat sales order khusus pelanggan member/VIP

**Fitur Sales Order:**
- ✅ Buat sales order untuk pelanggan member/VIP
- ✅ Pilih multiple produk dengan quantity
- ✅ Set tanggal order dan jatuh tempo
- ✅ Apply diskon khusus
- ✅ Tracking status order:
  - Pending - Order baru masuk
  - Dikonfirmasi - Order sudah dikonfirmasi
  - Diproses - Sedang diproses
  - Terkirim - Sudah terkirim ke customer
  - Dibatalkan - Order dibatalkan
- ✅ Catatan pengiriman dan alamat
- ✅ Edit dan hapus sales order
- ✅ Dashboard statistik SO

**Use Case:**
- Pre-order untuk member
- Penjualan grosir ke pelanggan tetap
- Order khusus dengan termin pembayaran
- Penjualan dalam jumlah besar

#### 📊 Modul "Laporan" - Tab Baru
**Ditambahkan:** Tab "Transaksi Kasir" di modul Laporan

**Fitur Transaksi Kasir di Laporan:**
- ✅ Riwayat lengkap transaksi kasir
- ✅ Filter periode (Hari ini, 7 hari, 30 hari, Tahun ini)
- ✅ Pencarian berdasarkan ID transaksi
- ✅ Detail lengkap setiap transaksi
- ✅ Statistik summary (total transaksi, penjualan, void)
- ✅ Export & Print ready
- ✅ View detail transaksi dengan modal

**Tab Laporan Lengkap:**
1. **Transaksi Kasir** (Baru) - Riwayat transaksi POS
2. **Laporan Penjualan** - Summary penjualan
3. **Laporan Stok** - Status stok produk
4. **Produk Terlaris** - Top 10 produk
5. **Laba Rugi** - Analisis profit

### 🎯 Alur Bisnis Baru

#### Untuk Transaksi Kasir (Walk-in/Retail):
```
POS/Kasir → Scan/Pilih Produk → Bayar → Selesai
           ↓
      View riwayat di "Laporan > Transaksi Kasir"
```

#### Untuk Penjualan Member (Pre-order/Grosir):
```
Sales Order → Pilih Member → Tambah Produk → Set Tanggal & Status → Simpan
             ↓
        Track & Update Status sampai Terkirim
```

### 🔄 Perbedaan Utama

| Aspek | POS/Kasir | Sales Order |
|-------|-----------|-------------|
| **Customer** | Walk-in / Member | Member / VIP only |
| **Pembayaran** | Langsung (Cash/Card/E-wallet) | Bisa kredit/termin |
| **Quantity** | Retail (satuan) | Grosir (bulk) |
| **Proses** | Instant | Ada tahapan (pending→delivered) |
| **Stok** | Langsung dikurangi | Dikurangi saat delivered |
| **Riwayat** | Laporan > Transaksi Kasir | Sales Order module |

### 📱 Menu Sidebar Update
- "Penjualan" → **"Sales Order"** (untuk membedakan dengan POS)

### 🎨 UI/UX Improvements
- Sales Order menggunakan status badge berwarna
- Form sales order dengan drag-and-drop items
- Modal detail yang informatif
- Filter dan search di semua view

---

**Note:** Semua data existing tetap aman dan terintegrasi dengan sistem.
