# 🚀 Panduan Deploy POS & Inventory Management ke Domain

## 📋 Daftar Isi
1. [Persiapan](#persiapan)
2. [Build Aplikasi](#build-aplikasi)
3. [Deploy ke Hosting](#deploy-ke-hosting)
4. [Konfigurasi Domain](#konfigurasi-domain)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Persiapan

### Kebutuhan:
- ✅ Aplikasi POS sudah jalan di local (localhost:3000)
- ✅ Domain sudah dibeli (contoh: tokosja.com)
- ✅ Hosting/VPS dengan salah satu:
  - **Shared Hosting** (cPanel): Hostinger, Niagahoster, dll
  - **VPS/Cloud**: DigitalOcean, AWS, Google Cloud, Vultr
  - **Static Hosting**: Netlify, Vercel, GitHub Pages (GRATIS!)

---

## 📦 Build Aplikasi

### 1. Build Production
```bash
# Di folder pos-inventory-system
npm run build
```

Ini akan membuat folder `dist/` yang berisi file siap deploy:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 2. Test Build Local
```bash
# Install serve globally (optional)
npm install -g serve

# Test hasil build
serve -s dist -p 5000
```
Buka: `http://localhost:5000` untuk test

---

## 🌐 Deploy ke Hosting

### Opsi 1: Netlify (GRATIS & MUDAH) ⭐ RECOMMENDED

#### A. Via Netlify Drop
1. Buka [netlify.com](https://netlify.com)
2. Sign up/Login (bisa pakai GitHub)
3. Drag & drop folder `dist/` ke Netlify Drop
4. Tunggu deploy selesai
5. Dapat subdomain gratis: `random-name.netlify.app`
6. (Opsional) Setting custom domain

#### B. Via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

**Konfigurasi Netlify:**
Buat file `netlify.toml` di root project:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### Opsi 2: Vercel (GRATIS)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Konfigurasi Vercel:**
Buat file `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

### Opsi 3: cPanel / Shared Hosting

1. **Build aplikasi:**
   ```bash
   npm run build
   ```

2. **Upload ke hosting:**
   - Login ke cPanel
   - Buka **File Manager**
   - Masuk ke folder `public_html/` (atau `www/`)
   - Upload semua isi folder `dist/`
   - Extract jika di-zip

3. **Konfigurasi `.htaccess`:**
   Buat file `.htaccess` di folder public_html:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

4. **Set permissions:**
   ```
   Folders: 755
   Files: 644
   ```

---

### Opsi 4: VPS (Ubuntu/Debian)

#### A. Install Node.js & Nginx
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install nginx -y
```

#### B. Upload & Build
```bash
# Upload source code ke VPS (via scp, git, atau FileZilla)
cd /var/www/
sudo git clone https://github.com/your-repo/pos-inventory-system.git
cd pos-inventory-system

# Install dependencies & build
npm install
npm run build
```

#### C. Konfigurasi Nginx
```bash
sudo nano /etc/nginx/sites-available/tokosja.com
```

Paste config ini:
```nginx
server {
    listen 80;
    server_name tokosja.com www.tokosja.com;
    root /var/www/pos-inventory-system/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tokosja.com /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### D. Install SSL (HTTPS) - GRATIS
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d tokosja.com -d www.tokosja.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 🌍 Konfigurasi Domain

### Di Registrar Domain (Namecheap, GoDaddy, dll):

#### Untuk Netlify/Vercel:
```
Type    Name    Value
A       @       75.2.60.5 (IP Netlify)
CNAME   www     your-site.netlify.app
```

#### Untuk VPS:
```
Type    Name    Value
A       @       123.45.67.89 (IP VPS Anda)
A       www     123.45.67.89
```

**Propagasi DNS:** 5 menit - 48 jam (biasanya < 1 jam)

---

## 🔒 Keamanan & Optimasi

### 1. Environment Variables
Jika ada API key/secret (untuk fitur masa depan):
```bash
# Di Netlify/Vercel: Settings > Environment Variables
VITE_API_URL=https://api.tokosja.com
```

### 2. PWA (Progressive Web App)
Install sebagai aplikasi di HP/Desktop:

Tambah `vite-plugin-pwa`:
```bash
npm install -D vite-plugin-pwa
```

Update `vite.config.js`:
```javascript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'POS & Inventory Management',
        short_name: 'POS',
        theme_color: '#3b82f6',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
```

### 3. Optimasi Loading
```javascript
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          store: ['zustand']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

---

## 🐛 Troubleshooting

### ❌ Error: "404 Not Found" saat refresh page
**Solusi:** Tambahkan redirect config (`.htaccess`, `netlify.toml`, atau `vercel.json`)

### ❌ Error: "White screen" setelah deploy
**Solusi:** 
```bash
# Check console browser (F12)
# Biasanya masalah base path

# Update vite.config.js jika deploy di subfolder
export default defineConfig({
  base: '/subfolder/' // atau '/' untuk root
})
```

### ❌ Error: LocalStorage tidak berfungsi
**Solusi:** HTTPS wajib untuk production. Install SSL certificate.

### ❌ Error: Assets tidak load (CSS/JS)
**Solusi:** Check relative path. Pastikan `base: '/'` di vite.config.js

---

## 📱 Deploy Mobile App (Opsional)

### Cordova / Capacitor
Wrap aplikasi web jadi APK/IPA:

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize
npx cap init

# Add Android
npx cap add android

# Build & Copy
npm run build
npx cap copy android
npx cap open android
```

---

## 💰 Estimasi Biaya

| Platform | Biaya | Kecepatan Deploy | Rekomendasi |
|----------|-------|------------------|-------------|
| **Netlify** | GRATIS | ⚡⚡⚡ Sangat Cepat | ⭐⭐⭐⭐⭐ |
| **Vercel** | GRATIS | ⚡⚡⚡ Sangat Cepat | ⭐⭐⭐⭐⭐ |
| **GitHub Pages** | GRATIS | ⚡⚡ Cepat | ⭐⭐⭐ |
| **cPanel Hosting** | Rp 15k-50k/bulan | ⚡ Sedang | ⭐⭐⭐ |
| **VPS DigitalOcean** | $6/bulan (~Rp 90k) | ⚡⚡ Cepat | ⭐⭐⭐⭐ |

---

## ✅ Checklist Deploy

- [ ] Build production berhasil (`npm run build`)
- [ ] Test build di local (`serve -s dist`)
- [ ] Pilih platform hosting
- [ ] Upload/deploy aplikasi
- [ ] Konfigurasi redirect (SPA routing)
- [ ] Setup domain (DNS)
- [ ] Install SSL certificate (HTTPS)
- [ ] Test aplikasi di domain
- [ ] Backup database (download backup JSON)
- [ ] Monitor performa

---

## 🎯 Quick Deploy (Tercepat)

```bash
# 1. Build
npm run build

# 2. Deploy ke Netlify (1 command!)
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist

# SELESAI! 🎉
```

---

## 📞 Support

Jika ada masalah:
1. Check console browser (F12 > Console)
2. Check network tab untuk error loading
3. Verify DNS propagation: https://dnschecker.org
4. Test SSL: https://www.ssllabs.com/ssltest/

---

**📌 Catatan Penting:**
- Data disimpan di **LocalStorage browser**, jadi data per-device
- Untuk multi-device, perlu backend API (database server)
- Backup database rutin via menu Settings
- HTTPS wajib untuk fitur modern browser

**🚀 Selamat mencoba deploy!**
