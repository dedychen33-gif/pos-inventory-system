# 🛒 Sistem POS & Manajemen Inventory

Aplikasi web lengkap untuk Point of Sale (POS) dan manajemen stok dengan fitur-fitur modern.

## ✨ Fitur Utama

### 📊 Dashboard
- Statistik penjualan real-time
- Alert stok menipis
- Quick actions untuk akses cepat
- Grafik performa penjualan

### 💰 POS / Kasir
- Interface kasir yang responsif dan mudah digunakan
- Scan barcode atau input manual
- Multi payment method (Cash, Card, E-Wallet, Transfer)
- Perhitungan otomatis (subtotal, diskon, pajak, total)
- Hold & recall transaksi
- Void transaksi dengan approval
- Print receipt thermal
- Pengurangan stok otomatis

### 📦 Manajemen Produk
- CRUD produk lengkap
- Kategori produk
- Barcode management
- Stok minimum & maksimum
- Multi satuan (pcs, kg, liter, dll)
- Filter & pencarian cepat

### 🏪 Manajemen Stok
- Real-time stock tracking
- Stock adjustment manual
- Stock opname
- Transfer antar gudang
- Alert stok menipis
- Nilai stok total

### 🛍️ Pembelian
- Purchase Order (PO)
- Penerimaan barang
- Retur ke supplier
- Riwayat pembelian

### 👥 Manajemen Pelanggan
- Database pelanggan
- Program loyalty & points
- Member tiers (Walk-in, Member, VIP)
- Riwayat transaksi pelanggan
- Total belanja tracking

### 📈 Laporan & Analytics
- Laporan penjualan
- Laporan stok
- Produk terlaris
- Laporan laba rugi
- Export ke Excel
- Print reports

### ⚙️ Pengaturan
- Informasi toko
- Pengaturan pajak
- Konfigurasi printer
- Notifikasi & alerts
- User management
- Role-based access control

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js 18+ 
- npm atau yarn

### Instalasi

```bash
# Clone atau download project
cd pos-inventory-system

# Install dependencies
npm install

# Jalankan development server
npm run dev

# Build untuk production
npm run build
```

Aplikasi akan berjalan di: http://localhost:3000

## 🔐 Login Default

```
Admin:
Username: admin
Password: admin123
Akses: Full access ke semua modul

Kasir:
Username: kasir
Password: kasir123
Akses: POS, view products, view customers
```

## 🎯 Teknologi yang Digunakan

- **React 18** - UI Framework
- **Vite** - Build tool & dev server
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Routing
- **Lucide Icons** - Icon library
- **Recharts** - Charts & graphs
- **date-fns** - Date utilities

## 📱 Fitur Interface

### Tombol-tombol Penting

#### POS/Kasir
- **BAYAR** (Hijau, Besar) - Proses pembayaran
- **HOLD** (Kuning) - Simpan transaksi sementara
- **VOID** (Merah) - Batalkan transaksi
- **DISKON** - Apply diskon
- Metode Pembayaran: TUNAI, KARTU, E-WALLET, TRANSFER

#### Produk
- **Tambah Produk** - Input produk baru
- **Edit** - Ubah data produk
- **Hapus** - Hapus produk
- **Import/Export** - Bulk operations

#### Stok
- **Adjust Stok** - Penyesuaian manual
- **Transfer Stok** - Antar gudang
- **Stock Opname** - Penghitungan fisik

#### Laporan
- **Export Excel** - Download data
- **Print** - Cetak laporan
- Filter periode (Hari ini, Minggu, Bulan, Tahun)

## 🎨 Design Principles

### Warna Coding
- 🟢 **Hijau** - Aksi positif (Save, Approve, Bayar)
- 🔴 **Merah** - Aksi negatif (Delete, Void, Cancel)
- 🔵 **Biru** - Aksi netral (Edit, View, Detail)
- 🟡 **Kuning** - Warning (Hold, Pending)
- ⚪ **Abu-abu** - Secondary (Draft, Filter)

### Prioritas Tombol
- **Besar & Mencolok** - Aksi utama (BAYAR, PROSES)
- **Sedang** - Aksi umum (EDIT, DELETE)
- **Kecil** - Aksi tambahan (VIEW, DETAIL)

## 📊 Struktur Data

### Products
```javascript
{
  id: number,
  code: string,
  name: string,
  category: string,
  price: number,
  stock: number,
  minStock: number,
  unit: string,
  barcode: string
}
```

### Transactions
```javascript
{
  id: string,
  date: ISO date,
  items: array,
  customer: object,
  subtotal: number,
  discount: number,
  tax: number,
  total: number,
  paymentMethod: string,
  status: 'completed' | 'void'
}
```

### Customers
```javascript
{
  id: number,
  name: string,
  phone: string,
  email: string,
  type: 'walk-in' | 'member' | 'vip',
  points: number,
  totalSpent: number
}
```

## 🔒 Keamanan

- Role-based access control (RBAC)
- Protected routes
- Session management
- Audit trail untuk semua transaksi
- Approval workflow untuk aksi kritis

## 📝 Workflow Transaksi

1. **Kasir Login** - Masuk dengan akun dan shift
2. **Pilih Pelanggan** - Member atau walk-in
3. **Scan/Tambah Produk** - Ke cart
4. **Apply Diskon** - Jika ada promo
5. **Pilih Metode Pembayaran** - Cash/Card/E-wallet/Transfer
6. **Proses Pembayaran** - Hitung total & kembalian
7. **Print Receipt** - Struk transaksi
8. **Update Stok** - Otomatis berkurang
9. **Update Points** - Jika member

## 🛠️ Development

### Struktur Folder
```
src/
├── components/      # Reusable components
│   └── Layout.jsx   # Main layout dengan sidebar
├── pages/          # Page components
│   ├── Dashboard.jsx
│   ├── POS.jsx
│   ├── Products.jsx
│   ├── Stock.jsx
│   ├── Purchase.jsx
│   ├── Sales.jsx
│   ├── Customers.jsx
│   ├── Reports.jsx
│   └── Settings.jsx
├── store/          # Zustand stores
│   ├── authStore.js
│   ├── productStore.js
│   ├── cartStore.js
│   ├── customerStore.js
│   └── transactionStore.js
├── App.jsx         # Main app component
├── main.jsx        # Entry point
└── index.css       # Global styles
```

### Menambah Fitur Baru

1. **Tambah Store** - Buat store di `/store`
2. **Tambah Page** - Buat komponen di `/pages`
3. **Tambah Route** - Update di `App.jsx`
4. **Tambah Menu** - Update di `Layout.jsx`

## 🚀 Fitur Mendatang

- [ ] Multi-outlet management
- [ ] Integrasi e-commerce (Shopee, Tokopedia)
- [ ] Batch & expiry tracking
- [ ] Advanced reporting dengan charts
- [ ] Mobile app (React Native)
- [ ] Barcode printing
- [ ] WhatsApp notification
- [ ] Email marketing
- [ ] API Integration
- [ ] Cloud backup

## 📞 Support

Untuk bantuan dan pertanyaan, silakan buka issue di repository atau hubungi developer.

## 📄 License

Copyright © 2025 POS System. All rights reserved.

---

**Made with ❤️ using React + Vite + TailwindCSS**
