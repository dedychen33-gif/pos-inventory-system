# POS & Inventory System - AI Coding Instructions

## Project Overview
React-based Point of Sale and inventory management system with Indonesian localization. Multi-platform: **Web (Vite)**, **Desktop (Electron)**, **Android (Capacitor)**. Hybrid data layer: localStorage (offline-first) + optional Supabase cloud sync.

## Architecture

### Multi-Platform Deployment
- **Web**: `npm run dev` / `npm run build` - Vite SPA, deploy to Vercel/Netlify
- **Desktop**: `npm run electron:dev` / `npm run electron:pack` - Windows portable exe
- **Android**: `npm run android:build` - Capacitor with ML Kit barcode scanning

Platform detection via `src/utils/platform.js`:
```javascript
import { isAndroid, isWeb, isNative } from './utils/platform'
// POS page hidden on Android (uses RemoteScanner instead)
// Barcode scanner only works on Android native
```

### Data Layer (Dual Mode)
1. **Offline-first**: Zustand stores + localStorage persistence (always works)
2. **Cloud sync**: Optional Supabase realtime sync via `src/hooks/useRealtimeSync.js`

Check Supabase status: `isSupabaseConfigured()` from `src/lib/supabase.js`. Configure via env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Database schema in `supabase-full-schema.sql`.

### Zustand Store Pattern
All state management uses Zustand with persistence middleware. Pattern:
```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // State and actions here
    }),
    { name: 'storage-key' }
  )
)
```

**Critical stores** (see `src/store/`):
- `authStore.js` - Role-based authentication (admin/cashier), stored users array, permissions checking
- `productStore.js` - Products, categories, units, stock tracking, barcode lookup
- `cartStore.js` - POS cart with line-item discounts, payment methods, tax calculation (11% PPN)
- `transactionStore.js` - Completed sales, void transactions, date filtering
- `customerStore.js` - Customer loyalty points, custom pricing per customer per product
- `purchaseStore.js` - Suppliers and purchase orders

All data persists to localStorage automatically via Zustand middleware.

### ID Generation Pattern
- Products: `Date.now()` for ID, `PRD###` for code, `SJA######` for SKU
- Transactions: `TRX${Date.now()}` 
- Purchase Orders: `PO###` with zero-padded sequence

## Component Patterns

### Modal Forms
Large forms (Products, POS payment) use conditional modal rendering with `showModal` state. Form data stored in component state, submitted to Zustand store. See `src/pages/Products.jsx` lines 230-600 for reference implementation.

### Search & Filter
Common pattern: controlled input + `.filter()` on store data. Example from `POS.jsx`:
```javascript
const filteredProducts = products.filter((p) =>
  p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
  p.barcode?.includes(searchTerm)
)
```

### Permission-Based UI
Check permissions via `authStore.hasPermission()`. Layout menu items conditionally render based on `user.permissions` array. Permission strings: `'pos'`, `'products'`, `'stock'`, etc., or `'all'` for admin.

## POS Workflow (Critical)
1. Add products to cart (checks stock > 0)
2. Apply per-item discounts (`itemDiscount`) or cart-level discount (percent/fixed)
3. Select customer (optional, affects loyalty points)
4. Choose payment method: `'cash'`, `'card'`, `'ewallet'`, `'transfer'`
5. On completion:
   - Create transaction in `transactionStore`
   - Update stock in `productStore` (subtract quantities)
   - Add loyalty points to customer (if selected)
   - Clear cart
   - Show receipt modal

See `src/pages/POS.jsx` `handleCompleteTransaction()` for full flow.

## Styling Conventions

### Tailwind Utility Classes
Custom classes defined in `src/index.css`:
- Buttons: `.btn`, `.btn-primary`, `.btn-success`, `.btn-danger`, `.btn-secondary`, `.btn-outline`
- Cards: `.card` (white bg, rounded-xl, shadow, padding)
- Inputs: `.input` (with focus ring)
- Badges: `.badge`, `.badge-success`, `.badge-danger`, `.badge-warning`

Use Lucide React icons throughout (imported from `lucide-react`).

### Color Theme
Tailwind extended colors in `tailwind.config.js`:
- `primary`: #3b82f6 (blue)
- `success`: #10b981 (green)
- `danger`: #ef4444 (red)
- `warning`: #f59e0b (orange)
- `dark`: #1f2937 (gray-800)

## Development Commands
```bash
npm run dev      # Starts Vite dev server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
```

## Localization
All UI text in **Indonesian**. Common terms:
- "Produk" (Products), "Stok" (Stock), "Pelanggan" (Customers)
- "Kasir" (Cashier/POS), "Penjualan" (Sales), "Pembelian" (Purchases)
- "Laporan" (Reports), "Pengaturan" (Settings)

## Key Business Logic

### Tax Calculation
Fixed 11% tax (PPN) on subtotal after discount. Implemented in `cartStore.getTax()`:
```javascript
getTax: () => {
  const subtotal = get().getSubtotal()
  const discount = get().getDiscount()
  return (subtotal - discount) * 0.11
}
```

### Stock Management
Stock updates via `productStore.updateStock(id, quantity, type)` where `type` is:
- `'set'` - absolute value
- `'add'` - increase
- `'subtract'` - decrease

Always check stock > 0 before adding to cart.

### Customer Tiers
Types: `'walk-in'`, `'member'`, `'vip'`. Customer ID 1 is reserved for default walk-in customer. Members accumulate `points` and track `totalSpent`.

## Common Pitfalls
- Don't mutate store state directly - always use store actions
- Transaction IDs must be unique (use `Date.now()` or timestamp-based)
- Check product stock before cart operations
- Payment modal requires validation: cash amount >= total for cash payments
- Product variants store `parentId` reference, not embedded objects

## Testing Authentication
Default credentials (see `authStore.js`):
- Admin: `admin` / `admin123` (all permissions)
- Cashier: `kasir` / `kasir123` (limited: POS, view products/customers)
