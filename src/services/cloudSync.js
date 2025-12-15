/**
 * Cloud-First Sync Service
 * 
 * ARSITEKTUR ROBUST:
 * 1. Semua operasi data (CRUD) HARUS melalui service ini
 * 2. Data SELALU disimpan ke Supabase DULU (Cloud-First)
 * 3. Jika berhasil, update local state
 * 4. Jika gagal (offline), simpan ke queue untuk retry
 * 5. Supabase Realtime broadcast ke semua device
 * 6. Polling fallback untuk Android (setiap 10 detik)
 * 
 * FLOW:
 * [Input Data] → [Supabase Cloud] → [Broadcast] → [Web + Android]
 *                      ↓
 *              [Local State Update]
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isAndroid } from '../utils/platform';

// Sync state
let pollingInterval = null;
let realtimeChannel = null;
let isInitialized = false;
let lastFetchTime = {};

// Store references (will be set by stores)
const storeRefs = {
  products: null,
  customers: null,
  transactions: null,
  suppliers: null,
  purchases: null,
  salesOrders: null,
  settings: null,
  users: null,
  categories: null,
  units: null
};

// Table configurations
const TABLE_CONFIG = {
  products: {
    table: 'products',
    transform: (row) => ({
      id: row.id,
      code: row.code,
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      description: row.description,
      category: row.category,
      unit: row.unit,
      costPrice: Number(row.cost_price) || 0,
      sellingPrice: Number(row.selling_price) || 0,
      stock: Number(row.stock) || 0,
      minStock: Number(row.min_stock) || 0,
      maxStock: Number(row.max_stock) || 0,
      image: row.image,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  },
  customers: {
    table: 'customers',
    transform: (row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      type: row.type || 'regular',
      points: Number(row.points) || 0,
      totalSpent: Number(row.total_spent) || 0,
      visitCount: Number(row.visit_count) || 0,
      notes: row.notes,
      createdAt: row.created_at
    })
  },
  transactions: {
    table: 'transactions',
    transform: (row) => ({
      id: row.id,
      transactionNumber: row.transaction_number,
      items: row.items || [],
      subtotal: Number(row.subtotal) || 0,
      discount: Number(row.discount) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      customerId: row.customer_id,
      customerName: row.customer_name,
      cashierId: row.cashier_id,
      cashierName: row.cashier_name,
      notes: row.notes,
      createdAt: row.created_at
    })
  },
  suppliers: {
    table: 'suppliers',
    transform: (row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      notes: row.notes,
      createdAt: row.created_at
    })
  },
  purchases: {
    table: 'purchases',
    transform: (row) => ({
      id: row.id,
      purchaseNumber: row.purchase_number,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      items: row.items || [],
      subtotal: Number(row.subtotal) || 0,
      discount: Number(row.discount) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      status: row.status,
      notes: row.notes,
      date: row.purchase_date,
      createdAt: row.created_at
    })
  },
  salesOrders: {
    table: 'sales_orders',
    transform: (row) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customerName: row.customer_name,
      items: row.items || [],
      subtotal: Number(row.subtotal) || 0,
      discount: Number(row.discount) || 0,
      tax: Number(row.tax) || 0,
      total: Number(row.total) || 0,
      downPayment: Number(row.down_payment) || 0,
      remainingPayment: Number(row.remaining_payment) || 0,
      status: row.status,
      dueDate: row.due_date,
      notes: row.notes,
      createdAt: row.created_at
    })
  },
  categories: {
    table: 'categories',
    transform: (row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at
    })
  },
  units: {
    table: 'units',
    transform: (row) => ({
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      createdAt: row.created_at
    })
  },
  settings: {
    table: 'settings',
    transform: (row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at
    })
  }
};

/**
 * Register store reference for updates
 */
export function registerStore(name, store) {
  storeRefs[name] = store;
  console.log(`📦 Store registered: ${name}`);
}

/**
 * Fetch all data from a table
 */
export async function fetchFromCloud(entityName) {
  if (!isSupabaseConfigured()) {
    console.log(`⚠️ Supabase not configured, skipping fetch for ${entityName}`);
    return [];
  }

  const config = TABLE_CONFIG[entityName];
  if (!config) {
    console.error(`❌ Unknown entity: ${entityName}`);
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(config.table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Fetch ${entityName} error:`, error.message);
      return [];
    }

    const transformed = (data || []).map(config.transform);
    console.log(`✅ Fetched ${entityName}: ${transformed.length} rows`);
    lastFetchTime[entityName] = Date.now();
    return transformed;
  } catch (err) {
    console.error(`❌ Fetch ${entityName} exception:`, err);
    return [];
  }
}

/**
 * Fetch ALL data from cloud and update local stores
 */
export async function fetchAllFromCloud() {
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured');
    return;
  }

  console.log('🔄 Fetching all data from cloud...');

  const entities = ['products', 'customers', 'transactions', 'suppliers', 'purchases', 'salesOrders', 'categories', 'units'];
  
  for (const entity of entities) {
    const data = await fetchFromCloud(entity);
    
    // Update local store if registered
    if (storeRefs[entity] && data.length > 0) {
      const store = storeRefs[entity];
      if (store.getState && store.setState) {
        const stateKey = entity === 'salesOrders' ? 'salesOrders' : entity;
        store.setState({ [stateKey]: data });
        console.log(`📥 Updated local ${entity} store with ${data.length} items`);
      }
    }
  }

  console.log('✅ All data fetched from cloud');
}

/**
 * Setup realtime subscriptions
 */
export function setupRealtimeSubscriptions() {
  if (!isSupabaseConfigured() || realtimeChannel) return;

  console.log('🔌 Setting up realtime subscriptions...');

  const tables = Object.values(TABLE_CONFIG).map(c => c.table);
  
  realtimeChannel = supabase
    .channel('cloud-sync-all')
    .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
      const tableName = payload.table;
      const entityName = Object.keys(TABLE_CONFIG).find(k => TABLE_CONFIG[k].table === tableName);
      
      if (!entityName) return;

      console.log(`📡 Realtime update: ${tableName} - ${payload.eventType}`);
      
      // Refetch the entire table to ensure consistency
      fetchFromCloud(entityName).then(data => {
        if (storeRefs[entityName] && data.length >= 0) {
          const store = storeRefs[entityName];
          if (store.getState && store.setState) {
            store.setState({ [entityName]: data });
            console.log(`📥 Realtime: Updated ${entityName} with ${data.length} items`);
          }
        }
      });
    })
    .subscribe((status) => {
      console.log(`📡 Realtime subscription status: ${status}`);
    });
}

/**
 * Setup polling for Android (fallback for unreliable WebSocket)
 */
export function setupPolling(intervalMs = 10000) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log(`⏱️ Setting up polling every ${intervalMs / 1000}s`);

  pollingInterval = setInterval(async () => {
    console.log('🔄 Polling: Fetching latest data...');
    await fetchAllFromCloud();
  }, intervalMs);

  // Initial fetch
  fetchAllFromCloud();
}

/**
 * Stop polling
 */
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    console.log('⏹️ Polling stopped');
  }
}

/**
 * Initialize cloud sync
 * - Web: Use realtime subscriptions
 * - Android: Use polling (more reliable)
 */
export async function initCloudSync() {
  if (isInitialized) return;
  if (!isSupabaseConfigured()) {
    console.log('⚠️ Supabase not configured, cloud sync disabled');
    return;
  }

  isInitialized = true;
  console.log('🚀 Initializing Cloud Sync...');
  console.log(`📱 Platform: ${isAndroid ? 'Android' : 'Web'}`);

  // Initial data fetch
  await fetchAllFromCloud();

  // Setup sync method based on platform
  if (isAndroid) {
    // Android: Use polling (WebSocket unreliable on mobile)
    setupPolling(10000); // Every 10 seconds
    // Also try realtime as backup
    setupRealtimeSubscriptions();
  } else {
    // Web: Use realtime subscriptions (more efficient)
    setupRealtimeSubscriptions();
    // Polling as fallback every 30 seconds
    setupPolling(30000);
  }

  console.log('✅ Cloud Sync initialized');
}

/**
 * Force sync - manually trigger a full sync
 */
export async function forceSync() {
  console.log('🔄 Force sync triggered...');
  await fetchAllFromCloud();
  console.log('✅ Force sync complete');
}

/**
 * Cleanup
 */
export function cleanup() {
  stopPolling();
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  isInitialized = false;
  console.log('🧹 Cloud sync cleaned up');
}

// Export for global access
if (typeof window !== 'undefined') {
  window.__cloudSync = {
    forceSync,
    fetchAllFromCloud,
    fetchFromCloud,
    initCloudSync
  };
}

export default {
  registerStore,
  fetchFromCloud,
  fetchAllFromCloud,
  setupRealtimeSubscriptions,
  setupPolling,
  stopPolling,
  initCloudSync,
  forceSync,
  cleanup
};
