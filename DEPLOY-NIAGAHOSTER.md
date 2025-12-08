# 🚀 Panduan Deploy ke Niagahoster

## 📋 Yang Anda Butuhkan:
1. ✅ Akun Niagahoster (daftar di niagahoster.co.id)
2. ✅ Paket hosting (minimal Paket Pelajar Rp 20K/bulan)
3. ✅ Folder `dist` yang sudah di-build (sudah siap!)

---

## 🎯 Langkah-Langkah Deploy:

### **STEP 1: Daftar & Beli Hosting**

1. Buka: **https://niagahoster.co.id**
2. Pilih paket **"Pelajar"** (Rp 20.000/bulan)
3. Pilih domain gratis (misalnya: `tokosaya.com`)
4. Checkout & bayar (transfer bank/e-wallet)
5. Tunggu email konfirmasi (5-30 menit)

---

### **STEP 2: Login cPanel**

1. Buka email dari Niagahoster
2. Cari link **"Login cPanel"** dan kredensial
3. Login ke cPanel
4. URL biasanya: `https://cpanel.niagahoster.com`

---

### **STEP 3: Upload File**

#### **Cara A: Via File Manager (Mudah)**

1. Di cPanel, klik **"File Manager"**
2. Masuk ke folder **`public_html`**
3. **Hapus semua file default** (index.html, dll)
4. Klik **"Upload"** di toolbar atas
5. **Upload semua file dari folder `dist`:**
   - Buka folder: `C:\pos-inventory-system\dist`
   - Select All (Ctrl+A)
   - Drag ke area upload
6. Tunggu sampai selesai (progress bar 100%)
7. Klik **"Go Back"** setelah selesai

#### **Cara B: Via FTP (Alternatif)**

1. Download FileZilla: https://filezilla-project.org
2. Koneksi FTP (cek kredensial di email Niagahoster):
   - Host: `ftp.domainanda.com`
   - Username: (dari email)
   - Password: (dari email)
   - Port: 21
3. Upload semua isi folder `dist` ke `public_html`

---

### **STEP 4: Cek File .htaccess**

File `.htaccess` sudah otomatis terupload. Jika tidak terlihat:

1. Di File Manager, klik **"Settings"** (kanan atas)
2. Centang **"Show Hidden Files (dotfiles)"**
3. Klik **"Save"**

Jika file `.htaccess` tidak ada, buat manual:

1. Klik **"+ File"** di toolbar
2. Nama file: `.htaccess`
3. Edit dan paste kode ini:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Gzip Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/x-javascript application/json
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType text/html "access plus 1 hour"
</IfModule>
```

---

### **STEP 5: Test Website**

1. Buka domain Anda: `https://domainanda.com`
2. Login dengan:
   - Username: `admin`
   - Password: `admin123`
3. Test semua fitur:
   - ✅ Tambah Produk
   - ✅ Tambah Varian
   - ✅ POS / Kasir
   - ✅ Cetak Invoice
   - ✅ Laporan

---

## 🔐 Setting SSL (HTTPS)

1. Di cPanel, cari **"SSL/TLS Status"**
2. Klik **"Run AutoSSL"**
3. Tunggu 5-10 menit
4. Website otomatis jadi HTTPS ✅

---

## 🎨 Custom Domain (Opsional)

Jika punya domain sendiri:

1. Di cPanel, klik **"Addon Domains"**
2. Masukkan domain baru
3. Update DNS/Nameserver domain ke Niagahoster
4. Tunggu propagasi 1-24 jam

---

## 📊 Performa & Optimasi

Website Anda sudah dioptimasi dengan:
- ✅ Gzip Compression (ukuran file lebih kecil)
- ✅ Browser Caching (loading lebih cepat)
- ✅ Minified CSS/JS (sudah otomatis dari build)
- ✅ PWA Ready (bisa install seperti aplikasi)

---

## 🔄 Update Website (Jika Ada Perubahan)

1. Di VS Code, jalankan: `npm run build`
2. Login cPanel
3. Buka File Manager → `public_html`
4. **Hapus file lama** (kecuali .htaccess)
5. Upload file baru dari folder `dist`
6. Refresh browser (Ctrl+F5)

---

## ❓ Troubleshooting

### **Problem: Halaman 404 Not Found**
**Solusi:** Cek file `.htaccess` sudah benar

### **Problem: CSS tidak muncul**
**Solusi:** Clear cache browser (Ctrl+Shift+Delete)

### **Problem: File tidak terupload**
**Solusi:** 
- Cek quota hosting (jangan full)
- Upload file satu-satu jika banyak

### **Problem: Website lambat**
**Solusi:**
- Aktifkan Cloudflare di Niagahoster
- Compress gambar produk

---

## 📞 Support

- **Niagahoster Support:** https://niagahoster.co.id/livechat
- **WA:** 0804-1-808-888
- **Email:** support@niagahoster.co.id

---

## 💡 Tips Hemat

1. Pilih billing tahunan (dapat diskon)
2. Gunakan kode promo (cari di Google)
3. Upgrade hanya jika traffic tinggi

---

## ✅ Checklist Sebelum Go Live

- [ ] File sudah diupload semua
- [ ] .htaccess sudah ada
- [ ] SSL aktif (HTTPS)
- [ ] Login berfungsi
- [ ] Semua menu bisa diakses
- [ ] Print invoice berfungsi
- [ ] Ganti password default
- [ ] Backup database (Export)
- [ ] Test di mobile
- [ ] Test di berbagai browser

---

## 🎉 Selamat! Website POS Anda Sudah Online!

**URL:** https://domainanda.com
**Username:** admin
**Password:** admin123 (GANTI SEGERA!)

**PENTING:** Segera ganti password default di menu **Pengaturan → Admin**

---

**📁 File sudah siap di folder:** `C:\pos-inventory-system\dist`
**📦 Total size:** ~360 KB (sangat ringan!)
**🚀 Deploy time:** 10-15 menit

Happy selling! 🛒💰
