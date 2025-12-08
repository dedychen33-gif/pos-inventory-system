# 🚀 Quick Deploy Guide

Panduan singkat deploy aplikasi POS ke domain dalam 5 menit!

## 🎯 Cara Tercepat: Deploy ke Netlify (GRATIS)

### Step 1: Build Aplikasi
```bash
cd C:\pos-inventory-system
npm run build
```

### Step 2: Deploy
**Opsi A - Drag & Drop (Termudah):**
1. Buka https://app.netlify.com/drop
2. Login/Sign up (bisa pakai Google/GitHub)
3. Drag folder `dist/` ke Netlify Drop
4. Tunggu 30 detik
5. **SELESAI!** ✅ Dapat link: `your-app.netlify.app`

**Opsi B - CLI:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

### Step 3: Custom Domain (Opsional)
1. Di Netlify Dashboard, klik **Domain Settings**
2. Klik **Add custom domain**
3. Masukkan domain Anda: `tokosja.com`
4. Update DNS di registrar domain:
   ```
   A     @     75.2.60.5
   CNAME www   your-app.netlify.app
   ```
5. Tunggu propagasi DNS (5-60 menit)
6. **HTTPS otomatis aktif!** 🔒

---

## ⚡ Alternative: Vercel (GRATIS)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (1 command!)
vercel --prod
```

Ikuti prompt, pilih project settings, **DONE!** ✅

---

## 🏢 Deploy ke cPanel (Shared Hosting)

### 1. Build
```bash
npm run build
```

### 2. Upload
- Login cPanel
- File Manager → `public_html/`
- Upload semua file dari folder `dist/`
- Extract jika ZIP

### 3. Done! ✅
Akses: `https://yourdomain.com`

---

## 🖥️ Deploy ke VPS (Ubuntu)

### Quick Install Script:
```bash
# SSH ke VPS
ssh root@your-vps-ip

# Install Node.js & Nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Clone & Build
cd /var/www/
sudo git clone https://github.com/your-repo/pos-inventory.git
cd pos-inventory
npm install
npm run build

# Configure Nginx
sudo nano /etc/nginx/sites-available/default
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/pos-inventory/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Restart Nginx
sudo systemctl restart nginx

# Install SSL (HTTPS)
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

**DONE!** ✅ Akses: `https://yourdomain.com`

---

## ✅ Checklist Deploy

- [ ] Build production (`npm run build`)
- [ ] Pilih platform (Netlify/Vercel/cPanel/VPS)
- [ ] Deploy aplikasi
- [ ] Setup domain (jika ada)
- [ ] Test aplikasi di browser
- [ ] Backup database (download JSON)
- [ ] Share link ke tim! 🎉

---

## 🐛 Troubleshooting

**Q: White screen setelah deploy?**
A: Buka console browser (F12), check error. Biasanya masalah routing.

**Q: 404 saat refresh page?**
A: Tambahkan redirect config (sudah ada di `netlify.toml` / `vercel.json` / `.htaccess`)

**Q: CSS tidak load?**
A: Check `vite.config.js`, pastikan `base: '/'`

**Q: Data hilang setelah deploy?**
A: Normal! Data di LocalStorage. Export backup dari local, import di production.

---

## 📞 Butuh Bantuan?

- 📖 [Full Deployment Guide](./DEPLOYMENT-GUIDE.md)
- 🐛 [Report Issues](https://github.com/yourusername/pos-inventory/issues)
- 💬 Email: support@example.com

---

**⏱️ Total waktu deploy: ~5 menit**  
**💰 Biaya: GRATIS (Netlify/Vercel)**  
**🔒 HTTPS: Otomatis**

**Happy Deploying! 🚀**
