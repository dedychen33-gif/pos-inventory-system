# Shopee Dashboard Integration

Aplikasi backend untuk integrasi dengan Shopee Open Platform API.

## Tech Stack
- Node.js 18+
- Express.js
- MySQL 8.0
- Redis
- Sequelize ORM

## Installation

```bash
# Clone repository
cd shopee-dashboard

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migration
npm run db:migrate

# Start development server
npm run dev
```

## API Endpoints

### Products
```
GET    /api/products           # List produk dengan pagination
GET    /api/products/low-stock # Produk stok rendah
GET    /api/products/export    # Export produk ke Excel/CSV
POST   /api/products/sync      # Manual sync produk dari Shopee
GET    /api/products/:id       # Detail produk
```

### Orders
```
GET    /api/orders             # List order
GET    /api/orders/report      # Laporan penjualan
PUT    /api/orders/:id/status  # Update status order
GET    /api/orders/export      # Export order ke Excel
```

### Dashboard
```
GET    /api/dashboard/summary  # Dashboard summary
GET    /api/dashboard/chart    # Data chart penjualan
```

### System
```
POST   /webhook/shopee         # Webhook dari Shopee
GET    /health                 # Health check
```

## Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Scheduled Jobs

- **Product Sync**: Every hour (0 * * * *)
- **Order Sync**: Every 30 minutes (*/30 * * * *)
- **Inventory Check**: Every 6 hours (0 */6 * * *)
- **Daily Report**: At 23:59 (59 23 * * *)

## Environment Variables

See `.env.example` for all required environment variables.

## Quick Start

```bash
# 1. Clone dan masuk ke direktori
git clone <repository-url>
cd shopee-dashboard

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env
# Edit .env file dengan konfigurasi Anda

# 4. Setup database
# Buat database MySQL dengan nama yang sesuai di .env
# atau jalankan dengan Docker:
docker-compose up -d mysql redis

# 5. Migrasi database
npm run db:migrate

# 6. Jalankan aplikasi
# Development:
npm run dev

# Production:
npm start

# 7. Akses aplikasi
# API: http://localhost:3000
# Health check: http://localhost:3000/health
```

## Features

- ✅ Integrasi API Shopee - Auth, produk, order, inventory
- ✅ Database MySQL dengan Sequelize ORM
- ✅ Background Jobs sync otomatis
- ✅ Export Excel/CSV untuk laporan
- ✅ Dashboard dengan chart dan statistik
- ✅ Webhook Handler untuk real-time update
- ✅ Authentication & Authorization
- ✅ Error Handling & Logging
- ✅ Docker & Deployment ready
- ✅ Rate Limiting & Security

## Customization

Anda bisa custom sesuai kebutuhan:

- **Database**: Ganti MySQL dengan PostgreSQL/MongoDB
- **Queue**: Ganti Bull dengan RabbitMQ/Kafka
- **Cache**: Tambah Redis untuk caching
- **Monitoring**: Integrasi dengan Prometheus/Grafana
- **Notification**: Tambah WhatsApp/Telegram bot
- **ML Features**: Prediksi stok dengan Python microservice

## License

MIT
