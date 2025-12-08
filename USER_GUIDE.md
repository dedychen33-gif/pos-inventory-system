# Panduan Penggunaan Sistem POS

## 📋 Daftar Isi
1. [Login ke Sistem](#1-login-ke-sistem)
2. [Dashboard](#2-dashboard)
3. [Transaksi Kasir (POS)](#3-transaksi-kasir-pos)
4. [Manajemen Produk](#4-manajemen-produk)
5. [Manajemen Stok](#5-manajemen-stok)
6. [Manajemen Pelanggan](#6-manajemen-pelanggan)
7. [Laporan](#7-laporan)
8. [Pengaturan](#8-pengaturan)

---

## 1. Login ke Sistem

### Langkah-langkah:
1. Buka browser dan akses: `http://localhost:3000`
2. Masukkan username dan password
3. Klik tombol **LOGIN**

### Akun Default:
- **Admin**: admin / admin123 (Akses penuh)
- **Kasir**: kasir / kasir123 (Akses terbatas)

---

## 2. Dashboard

Dashboard menampilkan ringkasan bisnis Anda:

### Informasi yang Ditampilkan:
- 💰 **Penjualan Hari Ini** - Total pendapatan hari ini
- 🛒 **Transaksi Hari Ini** - Jumlah transaksi
- 📦 **Total Produk** - Jumlah item produk
- 👥 **Total Pelanggan** - Database pelanggan

### Quick Actions:
- **Transaksi Baru** - Langsung ke POS
- **Tambah Produk** - Input produk baru
- **Cek Stok** - Lihat stok produk
- **Barang Masuk** - Input pembelian

### Alert:
- 🔔 **Stok Menipis** - Produk yang perlu restock
- 📈 **Transaksi Terbaru** - 5 transaksi terakhir

---

## 3. Transaksi Kasir (POS)

### Memulai Transaksi:

#### A. Tambah Produk ke Keranjang
1. Ketik nama produk di kotak pencarian ATAU
2. Scan barcode produk
3. Klik produk untuk menambahkan ke cart
4. Produk masuk ke keranjang di sebelah kanan

#### B. Edit Keranjang
- **➕ Plus** - Tambah quantity
- **➖ Minus** - Kurangi quantity
- **🗑️ Hapus** - Remove item dari cart

#### C. Pilih Pelanggan
1. Klik tombol **"Pilih Pelanggan"**
2. Pilih dari daftar atau gunakan Walk-in Customer
3. Member otomatis dapat poin

#### D. Apply Diskon (Opsional)
1. Klik tombol **DISKON**
2. Pilih persentase atau nominal
3. Diskon otomatis terhitung

#### E. Proses Pembayaran
1. Klik tombol **BAYAR** (hijau, besar)
2. Pilih metode pembayaran:
   - **TUNAI** - Masukkan jumlah uang, sistem hitung kembalian
   - **KARTU** - Langsung proses
   - **E-WALLET** - Pilih provider (GoPay, OVO, Dana)
   - **TRANSFER** - Proses transfer bank
3. Klik **Selesaikan Transaksi**

#### F. Print Struk
1. Struk otomatis muncul
2. Klik **Print Struk** untuk cetak
3. Klik **Tutup** untuk transaksi baru

### Fungsi Tambahan:

#### HOLD Transaksi
- Klik tombol **HOLD** (kuning)
- Transaksi disimpan sementara
- Bisa dilanjutkan nanti

#### VOID Transaksi
- Klik tombol **VOID** (merah)
- Konfirmasi pembatalan
- Keranjang dikosongkan

---

## 4. Manajemen Produk

### Melihat Daftar Produk:
- Semua produk tampil dalam tabel
- Informasi: Kode, Nama, Kategori, Harga, Stok, Status

### Menambah Produk Baru:
1. Klik **Tambah Produk** (kanan atas)
2. Isi form:
   - **Kode Produk** - Unik untuk setiap produk
   - **Nama Produk** - Nama lengkap
   - **Barcode** - Untuk scan
   - **Kategori** - Pilih kategori
   - **Satuan** - Pcs, Kg, Liter, dll
   - **Harga** - Harga jual
   - **Stok** - Stok awal
   - **Stok Minimum** - Alert jika dibawah ini
3. Klik **Simpan**

### Mengedit Produk:
1. Klik icon **✏️ Edit** pada produk
2. Ubah data yang diperlukan
3. Klik **Update**

### Menghapus Produk:
1. Klik icon **🗑️ Hapus**
2. Konfirmasi penghapusan
3. Produk dihapus dari sistem

### Filter & Pencarian:
- **Kotak Pencarian** - Cari berdasarkan nama/kode
- **Dropdown Kategori** - Filter by kategori

---

## 5. Manajemen Stok

### Tab Overview:
- Lihat semua stok produk
- Status: Rendah, Perhatian, Aman
- Nilai stok total

### Tab Penyesuaian Stok:
1. Pilih produk
2. Pilih tipe:
   - **Tambah Stok** - Menambahkan
   - **Kurangi Stok** - Mengurangi
   - **Set Stok** - Set langsung jumlah
3. Masukkan jumlah
4. Isi alasan penyesuaian
5. Klik **Sesuaikan Stok**

### Tab Stock Opname:
- Untuk penghitungan fisik stok
- Cocokkan stok sistem dengan stok fisik

### Tab Transfer Stok:
- Transfer stok antar gudang
- Untuk multi-lokasi

---

## 6. Manajemen Pelanggan

### Melihat Daftar Pelanggan:
- Informasi: Nama, Kontak, Tipe, Points, Total Belanja

### Menambah Pelanggan Baru:
1. Klik **Tambah Pelanggan**
2. Isi form:
   - **Nama Lengkap**
   - **No. Telepon**
   - **Email** (opsional)
   - **Tipe** - Member atau VIP
3. Klik **Simpan**

### Tipe Pelanggan:
- **Walk-in** - Pelanggan umum, tidak dapat poin
- **Member** - Dapat poin loyalty
- **VIP** - Prioritas khusus, benefit lebih

### Program Loyalty:
- Setiap transaksi Member/VIP dapat poin
- Poin bisa ditukar reward
- Tracking total belanja

---

## 7. Laporan

### Jenis Laporan:

#### A. Laporan Penjualan
- Total transaksi
- Total penjualan (rupiah)
- Total pajak
- Total diskon
- Rincian per transaksi

#### B. Laporan Stok
- Total produk
- Nilai stok
- Stok rendah
- Detail per produk

#### C. Produk Terlaris
- Top 10 produk
- Jumlah terjual
- Total revenue

#### D. Laporan Laba Rugi
- Pendapatan
- HPP (Harga Pokok Penjualan)
- Laba bersih

### Filter Laporan:
- **Hari Ini** - Data hari ini
- **7 Hari Terakhir** - Seminggu terakhir
- **30 Hari Terakhir** - Sebulan terakhir
- **Tahun Ini** - Sepanjang tahun

### Export & Print:
- **Export Excel** - Download ke Excel
- **Print** - Cetak laporan

---

## 8. Pengaturan

### Informasi Toko:
- Nama toko
- Alamat
- No. telepon
- Logo (coming soon)

### Pengaturan Pajak:
- Aktif/Non-aktif PPN
- Persentase pajak (default 11%)
- Harga include/exclude pajak

### Pengaturan Printer:
- Pilih printer
- Ukuran kertas (58mm, 80mm, A4)
- Auto-print setelah transaksi

### Notifikasi:
- ✅ Alert stok menipis
- ✅ Alert produk expired
- ⬜ Email harian
- ⬜ WhatsApp notification

### Manajemen User:
- Lihat daftar user
- Tambah user baru
- Edit role & permission
- Nonaktifkan user

---

## ⌨️ Keyboard Shortcuts

- **F1** - Help
- **F2** - Discount
- **F3** - Payment
- **F4** - Hold
- **Ctrl+S** - Save
- **Ctrl+P** - Print
- **Esc** - Cancel/Close

---

## 🆘 Troubleshooting

### Produk tidak muncul di POS:
- Pastikan produk memiliki stok > 0
- Cek kategori produk sudah benar

### Transaksi tidak bisa di-void:
- Hanya user dengan permission bisa void
- Login sebagai admin

### Stok tidak update:
- Refresh halaman
- Cek koneksi internet
- Cek apakah transaksi selesai sempurna

### Printer tidak berfungsi:
- Cek koneksi printer
- Test print dari settings
- Pastikan driver terinstall

---

## 💡 Tips & Best Practices

### Untuk Kasir:
1. Selalu cek stok sebelum jual
2. Konfirmasi total sebelum bayar
3. Hitung kembalian dengan teliti
4. Print struk untuk setiap transaksi
5. Gunakan HOLD untuk transaksi yang tertunda

### Untuk Admin:
1. Lakukan stock opname rutin (mingguan/bulanan)
2. Review laporan penjualan harian
3. Monitor stok rendah dan restock tepat waktu
4. Backup data secara berkala
5. Update harga produk sesuai pasar

### Untuk Owner:
1. Analisis produk terlaris setiap bulan
2. Hilangkan produk slow-moving
3. Optimalkan modal dengan stok minimum
4. Monitor performa kasir
5. Gunakan data untuk strategi marketing

---

## 📞 Kontak Support

Jika mengalami masalah atau butuh bantuan:
- Email: support@possystem.com
- WhatsApp: +62 812-3456-7890
- Jam Kerja: Senin-Jumat, 09:00-17:00 WIB

---

**Terima kasih telah menggunakan Sistem POS!** 🎉
