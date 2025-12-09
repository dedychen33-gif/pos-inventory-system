# Panduan Deploy ke Website Sendiri (Hosting/VPS)

Tentu saja **BISA**. Anda bisa menggunakan hosting sendiri (cPanel, VPS, dll) dan tidak wajib menggunakan Vercel.

Berikut adalah panduan untuk men-deploy aplikasi ini ke hosting Anda sendiri.

## Opsi 1: Shared Hosting (cPanel) - Frontend Only
Jika hosting Anda hanya mendukung PHP/HTML biasa (tanpa Node.js), Anda bisa men-deploy bagian **Frontend** saja.
*Catatan: Fitur integrasi Shopee (Backend) mungkin tidak berjalan jika hosting tidak support Node.js.*

### Langkah-langkah:

1.  **Build Project**
    Jalankan perintah berikut di komputer lokal Anda:
    ```bash
    npm run build
    ```
    Ini akan membuat folder `dist` yang berisi file siap upload.

2.  **Upload File**
    *   Buka File Manager di cPanel atau gunakan FTP (FileZilla).
    *   Buka folder `public_html` (atau folder subdomain Anda).
    *   Upload **semua isi** dari folder `dist` (bukan foldernya, tapi isinya) ke sana.

3.  **Konfigurasi Routing (.htaccess)**
    Saya sudah menambahkan file `.htaccess` otomatis di folder `public/`. File ini akan ikut ter-upload saat Anda build. File ini berfungsi agar saat halaman di-refresh tidak error 404 (karena ini aplikasi SPA React).

## Opsi 2: VPS / Hosting dengan Node.js (Full Features)
Jika Anda ingin semua fitur berjalan (termasuk integrasi Shopee), Anda memerlukan hosting yang mendukung **Node.js**.

### 1. Persiapan Backend
Aplikasi ini memiliki backend di folder `backend/`.
1.  Upload folder `backend` ke server Anda.
2.  Install dependencies:
    ```bash
    cd backend
    npm install
    ```
3.  Buat file `.env` di dalam folder `backend` dan isi konfigurasi:
    ```env
    PORT=3001
    SHOPEE_PARTNER_ID=...
    SHOPEE_PARTNER_KEY=...
    SHOPEE_SHOP_ID=...
    ```
4.  Jalankan server (gunakan PM2 agar tetap jalan di background):
    ```bash
    npm install -g pm2
    pm2 start server.js --name "pos-backend"
    ```

### 2. Persiapan Frontend
1.  Edit file `src/pages/Products.jsx` (dan file lain yang memanggil API).
    Pastikan `API_BASE` mengarah ke URL backend Anda jika backend dan frontend beda domain.
    *Namun, cara terbaik adalah menggunakan Reverse Proxy (Nginx/Apache) agar frontend dan backend satu domain.*

2.  Build frontend:
    ```bash
    npm run build
    ```

3.  Upload isi folder `dist` ke server (misal ke `/var/www/html`).

### 3. Konfigurasi Nginx (Contoh untuk VPS)
Agar frontend dan backend berjalan di satu domain (misal: `pos.domainanda.com`), gunakan konfigurasi Nginx seperti ini:

```nginx
server {
    listen 80;
    server_name pos.domainanda.com;

    root /var/www/html; # Lokasi file frontend (dist)
    index index.html;

    # Frontend Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:3001; # Port backend Anda
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Ringkasan
-   **Punya Hosting Biasa?** -> Upload isi folder `dist`. (Fitur dasar POS & Stok aman, Integrasi Shopee mungkin terbatas).
-   **Punya VPS/Node Hosting?** -> Upload `dist` untuk frontend, dan jalankan `backend/server.js` untuk backend.
