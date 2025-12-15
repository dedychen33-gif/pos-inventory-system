// Real-Time Sync Hook (WebSocket Mode)
// ARSITEKTUR: Supabase adalah SUMBER DATA UTAMA (Single Source of Truth)
// 
// FLOW:
// 1. App load → Fetch ALL data dari Supabase
// 2. User tambah/edit/hapus → Push ke Supabase → Supabase broadcast ke semua device
// 3. Semua device (Android/Web) receive update secara instant (~100ms)
//
// TIDAK ADA TOMBOL MANUAL - Semua otomatis!
//
// REQUIRED: Enable Realtime on Supabase tables via SQL:
// ALTER PUBLICATION supabase_realtime ADD TABLE products, customers, transactions, app_users;

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isAndroid } from '../utils/platform';
import { useProductStore } from '../store/productStore';
import { useCustomerStore } from '../store/customerStore';
import { useTransactionStore } from '../store/transactionStore';
import { useAuthStore } from '../store/authStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSalesOrderStore } from '../store/salesOrderStore';

// Transform functions - DB to Local
const transformProductFromDB = (p) => ({
  id: p.id,
  code: p.code,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  description: p.description,
  category: p.category_id || p.category,
  unit: p.unit_id || p.unit,
  cost: parseFloat(p.cost || p.cost_price) || 0,
  costPrice: parseFloat(p.cost || p.cost_price) || 0,
  price: parseFloat(p.price || p.selling_price) || 0,
  stock: p.stock || 0,
  minStock: p.min_stock || 0,
  maxStock: p.max_stock || 0,
  image: p.image_url,
  shopeeItemId: p.shopee_item_id,
  shopeeModelId: p.shopee_model_id,
  source: p.source || 'local',
  isVariant: p.is_variant || false,
  parentId: p.parent_product_id,
  variantName: p.variant_name,
  isActive: p.is_active,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

const transformCustomerFromDB = (c) => ({
  id: c.id,
  code: c.code,
  name: c.name,
  phone: c.phone || '',
  email: c.email || '',
  address: c.address || '',
  type: c.type || c.customer_type || 'member',
  points: c.points || 0,
  totalSpent: parseFloat(c.total_spent) || 0,
  customPrices: c.custom_prices || {},
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

const transformTransactionFromDB = (t) => ({
  id: t.id,
  transactionCode: t.transaction_code,
  date: t.transaction_date,
  customerId: t.customer_id,
  subtotal: parseFloat(t.subtotal) || 0,
  discountType: t.discount_type,
  discountValue: parseFloat(t.discount_value) || 0,
  discount: parseFloat(t.discount_amount) || 0,
  taxPercent: parseFloat(t.tax_percent) || 11,
  tax: parseFloat(t.tax_amount) || 0,
  total: parseFloat(t.total) || 0,
  paymentMethod: t.payment_method,
  cashAmount: parseFloat(t.payment_amount) || 0,
  change: parseFloat(t.change_amount) || 0,
  status: t.status || 'completed',
  voidReason: t.void_reason,
  notes: t.notes,
  cashierId: t.cashier_id,
  cashierName: t.cashier_name,
  source: t.source || 'pos',
  createdAt: t.created_at
});

const transformUserFromDB = (u) => ({
  id: u.id,
  username: u.username,
  password: u.password_hash,
  name: u.name,
  role: u.role,
  permissions: u.permissions || ['pos', 'products_view'],
  isActive: u.is_active,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
  marketplaceCredentials: {
    shopee: {
      partnerId: '',
      partnerKey: '',
      shopId: '',
      accessToken: '',
      refreshToken: '',
      shopName: '',
      isConnected: false,
      lastSync: null
    }
  }
});

// Transform Supplier from DB
const transformSupplierFromDB = (s) => ({
  id: s.id,
  name: s.name,
  phone: s.phone || '',
  email: s.email || '',
  address: s.address || '',
  notes: s.notes || '',
  createdAt: s.created_at
});

// Transform Purchase from DB
const transformPurchaseFromDB = (p) => ({
  id: p.id,
  purchaseNumber: p.purchase_number,
  supplierId: p.supplier_id,
  supplierName: p.supplier_name,
  items: p.items || [],
  subtotal: parseFloat(p.subtotal) || 0,
  discount: parseFloat(p.discount) || 0,
  tax: parseFloat(p.tax) || 0,
  total: parseFloat(p.total) || 0,
  paymentMethod: p.payment_method || 'cash',
  paymentStatus: p.payment_status || 'paid',
  status: p.status || 'completed',
  notes: p.notes || '',
  date: p.purchase_date || p.created_at,
  createdAt: p.created_at
});

// Transform Settings from DB
const transformSettingsFromDB = (s) => ({
  id: s.id,
  storeName: s.store_name,
  storeAddress: s.store_address,
  storePhone: s.store_phone,
  storeEmail: s.store_email,
  logo: s.logo_url,
  taxPercent: s.tax_percent || 11,
  currency: s.currency || 'Rp',
  receiptFooter: s.receipt_footer,
  updatedAt: s.updated_at
});

// Transform Sales Order from DB
const transformSalesOrderFromDB = (o) => ({
  id: o.id,
  orderNumber: o.order_number,
  customer: { id: o.customer_id, name: o.customer_name },
  items: o.items || [],
  subtotal: parseFloat(o.subtotal) || 0,
  discount: parseFloat(o.discount) || 0,
  total: parseFloat(o.total) || 0,
  status: o.status || 'pending',
  dueDate: o.due_date,
  date: o.order_date,
  notes: o.notes || '',
  createdAt: o.created_at
});

export function useRealtimeSync() {
  const isInitialized = useRef(false);
  const channelRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    mode: 'realtime',
    connectedAt: null,
    reconnectAttempts: 0
  });

  useEffect(() => {
    if (!isSupabaseConfigured() || isInitialized.current) return;
    
    isInitialized.current = true;
    
    const initSync = async () => {
      // Check if data was just restored from backup - skip cloud sync to preserve restored data
      // Use timestamp to allow multiple refreshes within 5 minutes after restore
      const restoreTimestamp = localStorage.getItem('restore-timestamp');
      if (restoreTimestamp) {
        const restoreTime = parseInt(restoreTimestamp, 10);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (now - restoreTime < fiveMinutes) {
          console.log('⏭️ Skipping cloud sync - data restored from backup within last 5 minutes');
          
          // Still setup realtime subscriptions for future updates
          setupRealtimeSubscriptions();
          
          setSyncStatus({
            isOnline: true,
            isSyncing: false,
            lastSync: new Date().toISOString(),
            mode: 'realtime',
            connectedAt: new Date().toISOString(),
            reconnectAttempts: 0
          });
          return;
        } else {
          // More than 5 minutes passed, remove the flag
          localStorage.removeItem('restore-timestamp');
          console.log('⏰ Restore protection expired, resuming normal sync');
        }
      }
      
      // Also check old flag format for backward compatibility
      const justRestored = localStorage.getItem('just-restored');
      if (justRestored === 'true') {
        console.log('⏭️ Skipping cloud sync - data just restored from backup (legacy flag)');
        localStorage.removeItem('just-restored');
        // Set new timestamp format
        localStorage.setItem('restore-timestamp', Date.now().toString());
        
        setupRealtimeSubscriptions();
        
        setSyncStatus({
          isOnline: true,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          mode: 'realtime',
          connectedAt: new Date().toISOString(),
          reconnectAttempts: 0
        });
        return;
      }
      
      console.log('🔄 Auto-sync: Starting BI-DIRECTIONAL sync...');
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      try {
        // STEP 1: Upload local data to Supabase first (if any)
        await uploadLocalToSupabase();
        
        // STEP 2: Fetch and merge from Supabase
        await fetchAllFromSupabase();
        
        // Setup realtime subscriptions for instant updates
        setupRealtimeSubscriptions();
        
        setSyncStatus({
          isOnline: true,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          mode: 'realtime',
          connectedAt: new Date().toISOString(),
          reconnectAttempts: 0
        });
        
        console.log('✅ BI-DIRECTIONAL sync ACTIVE! Web ↔ Supabase ↔ Android');
          
      } catch (error) {
        console.error('❌ Sync error:', error.message);
        setSyncStatus(prev => ({ ...prev, isSyncing: false, isOnline: false }));
      }
    };
    
    // Upload local data to Supabase (for bi-directional sync)
    const uploadLocalToSupabase = async () => {
      console.log('⬆️ Uploading local data to Supabase...');
      
      // === UPLOAD ALL LOCAL PRODUCTS (upsert to ensure sync) ===
      try {
        const localProducts = useProductStore.getState().products;
        console.log(`📦 Local products count: ${localProducts.length}`);
        
        if (localProducts.length > 0) {
          // Upsert ALL local products to ensure they exist in cloud
          const batchSize = 50;
          let uploadedCount = 0;
          
          for (let i = 0; i < localProducts.length; i += batchSize) {
            const batch = localProducts.slice(i, i + batchSize).map(p => ({
              id: String(p.id),
              code: p.code || '',
              sku: p.sku || '',
              barcode: p.barcode || '',
              name: p.name || 'Unnamed',
              description: p.description || '',
              category: p.category || '',
              unit: p.unit || 'pcs',
              price: Number(p.price) || 0,
              cost: Number(p.cost || p.costPrice) || 0,
              stock: Number(p.stock) || 0,
              min_stock: Number(p.minStock) || 0,
              max_stock: Number(p.maxStock) || 0,
              image_url: p.image || '',
              source: p.source || 'manual',
              is_active: true,
              updated_at: new Date().toISOString()
            }));
            
            const { error } = await supabase.from('products').upsert(batch, { onConflict: 'id' });
            if (!error) {
              uploadedCount += batch.length;
            } else {
              console.warn('⚠️ Products upload batch error:', error.message);
            }
          }
          
          if (uploadedCount > 0) {
            console.log(`⬆️ Products: ${uploadedCount} synced to Supabase`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Products upload:', err.message);
      }
      
      // === UPLOAD LOCAL CUSTOMERS (only those with valid integer IDs) ===
      try {
        const localCustomers = useCustomerStore.getState().customers;
        console.log(`👤 Local customers count: ${localCustomers.length}`);
        
        // Filter customers that have numeric IDs (already synced with Supabase)
        const customersToSync = localCustomers.filter(c => {
          const id = Number(c.id);
          return !isNaN(id) && id > 0 && id < 9999999999; // Valid integer ID
        });
        
        if (customersToSync.length > 0) {
          const batchSize = 50;
          let uploadedCount = 0;
          
          for (let i = 0; i < customersToSync.length; i += batchSize) {
            const batch = customersToSync.slice(i, i + batchSize).map(c => ({
              id: Number(c.id),
              name: c.name || 'Unknown',
              phone: c.phone || '',
              email: c.email || '',
              address: c.address || '',
              points: Number(c.points) || 0,
              total_spent: Number(c.totalSpent) || 0
            }));
            
            const { error } = await supabase.from('customers').upsert(batch, { onConflict: 'id' });
            if (!error) {
              uploadedCount += batch.length;
            } else {
              console.warn('⚠️ Customers upload error:', error.message);
            }
          }
          
          if (uploadedCount > 0) {
            console.log(`⬆️ Customers: ${uploadedCount} synced to Supabase`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Customers upload:', err.message);
      }
      
      // === UPLOAD LOCAL TRANSACTIONS ===
      try {
        const localTransactions = useTransactionStore.getState().transactions;
        console.log(`💳 Local transactions count: ${localTransactions.length}`);
        
        if (localTransactions.length > 0) {
          const { data: cloudTransactions } = await supabase.from('transactions').select('id');
          const cloudIds = new Set((cloudTransactions || []).map(t => t.id));
          
          const newTransactions = localTransactions.filter(t => !cloudIds.has(t.id));
          
          if (newTransactions.length > 0) {
            const batch = newTransactions.slice(0, 100).map(t => ({
              id: String(t.id),
              transaction_code: t.transactionCode || t.invoiceNumber || t.id,
              transaction_date: t.date || t.createdAt || new Date().toISOString(),
              customer_id: t.customerId ? String(t.customerId) : null,
              items: t.items || [],
              subtotal: Number(t.subtotal) || 0,
              discount_type: t.discountType || 'percent',
              discount_value: Number(t.discountValue) || 0,
              discount_amount: Number(t.discount) || 0,
              tax_percent: Number(t.taxPercent) || 11,
              tax_amount: Number(t.tax) || 0,
              total: Number(t.total) || 0,
              payment_method: t.paymentMethod || 'cash',
              payment_amount: Number(t.cashAmount) || Number(t.amountPaid) || 0,
              change_amount: Number(t.change) || 0,
              status: t.status || 'completed',
              void_reason: t.voidReason || null,
              notes: t.notes || '',
              cashier_id: t.cashierId || null,
              cashier_name: t.cashierName || 'System',
              source: t.source || 'pos',
              created_at: t.date || t.createdAt || new Date().toISOString()
            }));
            
            const { error } = await supabase.from('transactions').upsert(batch, { onConflict: 'id' });
            if (!error) {
              console.log(`⬆️ Transactions: ${batch.length} uploaded to Supabase`);
            } else {
              console.warn('⚠️ Transactions upload error:', error.message);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Transactions upload:', err.message);
      }
      
      // === UPLOAD LOCAL SUPPLIERS ===
      try {
        const localSuppliers = usePurchaseStore.getState().suppliers;
        console.log(`🏭 Local suppliers count: ${localSuppliers.length}`);
        
        if (localSuppliers.length > 0) {
          const batchSize = 50;
          let uploadedCount = 0;
          
          for (let i = 0; i < localSuppliers.length; i += batchSize) {
            const batch = localSuppliers.slice(i, i + batchSize).map(s => ({
              id: String(s.id),
              name: s.name || 'Unknown Supplier',
              phone: s.phone || '',
              email: s.email || '',
              address: s.address || '',
              notes: s.notes || '',
              created_at: s.createdAt || new Date().toISOString()
            }));
            
            const { error } = await supabase.from('suppliers').upsert(batch, { onConflict: 'id' });
            if (!error) {
              uploadedCount += batch.length;
            } else {
              console.warn('⚠️ Suppliers upload error:', error.message);
            }
          }
          
          if (uploadedCount > 0) {
            console.log(`⬆️ Suppliers: ${uploadedCount} synced to Supabase`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Suppliers upload:', err.message);
      }
      
      // === UPLOAD LOCAL PURCHASES ===
      try {
        const localPurchases = usePurchaseStore.getState().purchases;
        console.log(`📥 Local purchases count: ${localPurchases.length}`);
        
        if (localPurchases.length > 0) {
          const batchSize = 50;
          let uploadedCount = 0;
          
          for (let i = 0; i < localPurchases.length; i += batchSize) {
            const batch = localPurchases.slice(i, i + batchSize).map(p => ({
              id: String(p.id),
              purchase_number: p.purchaseNumber || p.id,
              supplier_id: p.supplierId ? String(p.supplierId) : null,
              supplier_name: p.supplierName || '',
              items: p.items || [],
              subtotal: Number(p.subtotal) || 0,
              discount: Number(p.discount) || 0,
              tax: Number(p.tax) || 0,
              total: Number(p.total) || 0,
              payment_method: p.paymentMethod || 'cash',
              payment_status: p.paymentStatus || 'paid',
              status: p.status || 'completed',
              notes: p.notes || '',
              purchase_date: p.date || new Date().toISOString(),
              created_at: p.createdAt || new Date().toISOString()
            }));
            
            const { error } = await supabase.from('purchases').upsert(batch, { onConflict: 'id' });
            if (!error) {
              uploadedCount += batch.length;
            } else {
              console.warn('⚠️ Purchases upload error:', error.message);
            }
          }
          
          if (uploadedCount > 0) {
            console.log(`⬆️ Purchases: ${uploadedCount} synced to Supabase`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Purchases upload:', err.message);
      }
      
      // === UPLOAD LOCAL SETTINGS ===
      try {
        const settings = useSettingsStore.getState();
        if (settings.storeInfo && settings.storeInfo.name) {
          const settingsData = {
            id: 'default',
            store_name: settings.storeInfo.name || '',
            store_address: settings.storeInfo.address || '',
            store_phone: settings.storeInfo.phone || '',
            store_email: settings.storeInfo.email || '',
            logo_url: settings.storeInfo.logo || '',
            tax_percent: settings.storeInfo.taxPercent || 11,
            currency: 'Rp',
            receipt_footer: settings.storeInfo.receiptFooter || '',
            updated_at: new Date().toISOString()
          };
          
          const { error } = await supabase.from('settings').upsert(settingsData, { onConflict: 'id' });
          if (!error) {
            console.log(`⬆️ Settings synced to Supabase`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Settings upload:', err.message);
      }
    };

    // Setup Supabase Realtime subscriptions
    const setupRealtimeSubscriptions = () => {
      // Create a single channel for all tables
      channelRef.current = supabase
        .channel('db-changes')
        // Products changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'products' }, 
          (payload) => {
            console.log('📦 [REALTIME] New product:', payload.new.name);
            const transformed = transformProductFromDB(payload.new);
            const localProducts = useProductStore.getState().products;
            
            // Check if already exists
            if (!localProducts.find(p => p.id === transformed.id || p.sku === transformed.sku)) {
              useProductStore.setState({ products: [...localProducts, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'products' }, 
          (payload) => {
            console.log('📦 [REALTIME] Product updated:', payload.new.name);
            const transformed = transformProductFromDB(payload.new);
            const localProducts = useProductStore.getState().products;
            
            // Update existing product
            const updatedProducts = localProducts.map(p => 
              p.id === transformed.id ? transformed : p
            );
            useProductStore.setState({ products: updatedProducts });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'products' }, 
          (payload) => {
            console.log('📦 [REALTIME] Product deleted:', payload.old.id);
            const localProducts = useProductStore.getState().products;
            const updatedProducts = localProducts.filter(p => p.id !== payload.old.id);
            useProductStore.setState({ products: updatedProducts });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Customers changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'customers' }, 
          (payload) => {
            console.log('👤 [REALTIME] New customer:', payload.new.name);
            const transformed = transformCustomerFromDB(payload.new);
            const localCustomers = useCustomerStore.getState().customers;
            
            if (!localCustomers.find(c => c.id === transformed.id)) {
              useCustomerStore.setState({ customers: [...localCustomers, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'customers' }, 
          (payload) => {
            console.log('👤 [REALTIME] Customer updated:', payload.new.name);
            const transformed = transformCustomerFromDB(payload.new);
            const localCustomers = useCustomerStore.getState().customers;
            
            const updatedCustomers = localCustomers.map(c => 
              c.id === transformed.id ? transformed : c
            );
            useCustomerStore.setState({ customers: updatedCustomers });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'customers' }, 
          (payload) => {
            console.log('👤 [REALTIME] Customer deleted:', payload.old.id);
            const localCustomers = useCustomerStore.getState().customers;
            const updatedCustomers = localCustomers.filter(c => c.id !== payload.old.id);
            useCustomerStore.setState({ customers: updatedCustomers });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Transactions changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'transactions' }, 
          (payload) => {
            console.log('💳 [REALTIME] New transaction:', payload.new.transaction_code);
            const transformed = transformTransactionFromDB(payload.new);
            const localTransactions = useTransactionStore.getState().transactions;
            
            if (!localTransactions.find(t => t.id === transformed.id || t.transactionCode === transformed.transactionCode)) {
              const updatedTransactions = [transformed, ...localTransactions];
              updatedTransactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
              useTransactionStore.setState({ transactions: updatedTransactions });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'transactions' }, 
          (payload) => {
            console.log('💳 [REALTIME] Transaction updated:', payload.new.transaction_code);
            const transformed = transformTransactionFromDB(payload.new);
            const localTransactions = useTransactionStore.getState().transactions;
            
            const updatedTransactions = localTransactions.map(t => 
              t.id === transformed.id ? transformed : t
            );
            useTransactionStore.setState({ transactions: updatedTransactions });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Users changes - sync username/password between devices
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'app_users' }, 
          (payload) => {
            console.log('👤 [REALTIME] New user:', payload.new.username);
            const transformed = transformUserFromDB(payload.new);
            const localUsers = useAuthStore.getState().users;
            
            if (!localUsers.find(u => u.id === transformed.id || u.username === transformed.username)) {
              useAuthStore.setState({ users: [...localUsers, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'app_users' }, 
          (payload) => {
            console.log('👤 [REALTIME] User updated:', payload.new.username);
            const transformed = transformUserFromDB(payload.new);
            const localUsers = useAuthStore.getState().users;
            const currentUser = useAuthStore.getState().user;
            
            // Update user in local store
            const updatedUsers = localUsers.map(u => 
              u.id === transformed.id ? { ...u, ...transformed, marketplaceCredentials: u.marketplaceCredentials } : u
            );
            useAuthStore.setState({ users: updatedUsers });
            
            // If current logged-in user was updated, update session too
            if (currentUser?.id === transformed.id) {
              const { password: _, ...userWithoutPassword } = transformed;
              useAuthStore.setState({ user: { ...currentUser, ...userWithoutPassword } });
            }
            
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'app_users' }, 
          (payload) => {
            console.log('👤 [REALTIME] User deleted:', payload.old.id);
            const localUsers = useAuthStore.getState().users;
            const updatedUsers = localUsers.filter(u => u.id !== payload.old.id);
            useAuthStore.setState({ users: updatedUsers });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Suppliers changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'suppliers' }, 
          (payload) => {
            console.log('🏭 [REALTIME] New supplier:', payload.new.name);
            const transformed = transformSupplierFromDB(payload.new);
            const localSuppliers = usePurchaseStore.getState().suppliers;
            
            if (!localSuppliers.find(s => s.id === transformed.id)) {
              usePurchaseStore.setState({ suppliers: [...localSuppliers, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'suppliers' }, 
          (payload) => {
            console.log('🏭 [REALTIME] Supplier updated:', payload.new.name);
            const transformed = transformSupplierFromDB(payload.new);
            const localSuppliers = usePurchaseStore.getState().suppliers;
            
            const updatedSuppliers = localSuppliers.map(s => 
              s.id === transformed.id ? transformed : s
            );
            usePurchaseStore.setState({ suppliers: updatedSuppliers });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'suppliers' }, 
          (payload) => {
            console.log('🏭 [REALTIME] Supplier deleted:', payload.old.id);
            const localSuppliers = usePurchaseStore.getState().suppliers;
            const updatedSuppliers = localSuppliers.filter(s => s.id !== payload.old.id);
            usePurchaseStore.setState({ suppliers: updatedSuppliers });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Purchases changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'purchases' }, 
          (payload) => {
            console.log('📥 [REALTIME] New purchase:', payload.new.purchase_number);
            const transformed = transformPurchaseFromDB(payload.new);
            const localPurchases = usePurchaseStore.getState().purchases;
            
            if (!localPurchases.find(p => p.id === transformed.id)) {
              usePurchaseStore.setState({ purchases: [...localPurchases, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'purchases' }, 
          (payload) => {
            console.log('📥 [REALTIME] Purchase updated:', payload.new.purchase_number);
            const transformed = transformPurchaseFromDB(payload.new);
            const localPurchases = usePurchaseStore.getState().purchases;
            
            const updatedPurchases = localPurchases.map(p => 
              p.id === transformed.id ? transformed : p
            );
            usePurchaseStore.setState({ purchases: updatedPurchases });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'purchases' }, 
          (payload) => {
            console.log('📥 [REALTIME] Purchase deleted:', payload.old.id);
            const localPurchases = usePurchaseStore.getState().purchases;
            const updatedPurchases = localPurchases.filter(p => p.id !== payload.old.id);
            usePurchaseStore.setState({ purchases: updatedPurchases });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        // Settings changes
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'settings' }, 
          (payload) => {
            console.log('⚙️ [REALTIME] Settings updated');
            if (payload.new) {
              const settings = transformSettingsFromDB(payload.new);
              useSettingsStore.setState({ 
                storeInfo: {
                  name: settings.storeName || '',
                  address: settings.storeAddress || '',
                  phone: settings.storePhone || '',
                  email: settings.storeEmail || '',
                  logo: settings.logo || '',
                  taxPercent: settings.taxPercent || 11,
                  receiptFooter: settings.receiptFooter || ''
                }
              });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        // Sales Orders changes
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'sales_orders' }, 
          (payload) => {
            console.log('📋 [REALTIME] New sales order:', payload.new.order_number);
            const transformed = transformSalesOrderFromDB(payload.new);
            const localOrders = useSalesOrderStore.getState().salesOrders;
            
            if (!localOrders.find(o => o.id === transformed.id)) {
              useSalesOrderStore.setState({ salesOrders: [...localOrders, transformed] });
              setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
            }
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'sales_orders' }, 
          (payload) => {
            console.log('📋 [REALTIME] Sales order updated:', payload.new.order_number);
            const transformed = transformSalesOrderFromDB(payload.new);
            const localOrders = useSalesOrderStore.getState().salesOrders;
            
            const updatedOrders = localOrders.map(o => 
              o.id === transformed.id ? transformed : o
            );
            useSalesOrderStore.setState({ salesOrders: updatedOrders });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .on('postgres_changes', 
          { event: 'DELETE', schema: 'public', table: 'sales_orders' }, 
          (payload) => {
            console.log('📋 [REALTIME] Sales order deleted:', payload.old.id);
            const localOrders = useSalesOrderStore.getState().salesOrders;
            const updatedOrders = localOrders.filter(o => o.id !== payload.old.id);
            useSalesOrderStore.setState({ salesOrders: updatedOrders });
            setSyncStatus(prev => ({ ...prev, lastSync: new Date().toISOString() }));
          }
        )
        .subscribe((status) => {
          console.log('🔌 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync connected!');
            setSyncStatus(prev => ({ 
              ...prev, 
              isOnline: true, 
              connectedAt: new Date().toISOString(),
              reconnectAttempts: 0 
            }));
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('❌ Real-time sync disconnected, attempting reconnect...');
            setSyncStatus(prev => ({ 
              ...prev, 
              isOnline: false,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
            
            // Auto-reconnect after 3 seconds
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Attempting to reconnect...');
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
              }
              setupRealtimeSubscriptions();
            }, 3000);
          }
        });
    };

    // Fetch ALL data from Supabase - Supabase is SINGLE SOURCE OF TRUTH
    const fetchAllFromSupabase = async () => {
      console.log('📡 Fetching all data from Supabase...');
      
      // === PRODUCTS - Always replace local with Supabase data ===
      try {
        const { data: cloudProducts, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
        
        if (!error && cloudProducts) {
          const allProducts = cloudProducts.map(transformProductFromDB);
          useProductStore.setState({ products: allProducts });
          console.log(`📦 Products: ${allProducts.length} loaded from Supabase`);
        } else if (error) {
          console.warn('⚠️ Products fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Products sync:', err.message);
      }
      
      // === CUSTOMERS - Merge cloud with local, keep Walk-in Customer ===
      try {
        const { data: cloudCustomers, error } = await supabase
          .from('customers')
          .select('*');
        
        if (!error && cloudCustomers) {
          const localCustomers = useCustomerStore.getState().customers;
          const walkinCustomer = localCustomers.find(c => c.id === '00000000-0000-0000-0000-000000000001' || c.type === 'walk-in');
          
          // Transform cloud customers
          const transformedCloud = cloudCustomers.map(transformCustomerFromDB);
          
          // Merge: cloud customers + walk-in if not in cloud
          let allCustomers = [...transformedCloud];
          if (walkinCustomer && !allCustomers.find(c => c.id === walkinCustomer.id)) {
            allCustomers = [walkinCustomer, ...allCustomers];
          }
          
          // If cloud is empty but local has data, keep local
          if (cloudCustomers.length === 0 && localCustomers.length > 0) {
            console.log(`👤 Customers: Cloud empty, keeping ${localCustomers.length} local customers`);
          } else {
            useCustomerStore.setState({ customers: allCustomers });
            console.log(`👤 Customers: ${allCustomers.length} loaded from Supabase`);
          }
        } else if (error) {
          console.warn('⚠️ Customers fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Customers sync:', err.message);
      }
      
      // === TRANSACTIONS - Always replace local with Supabase data ===
      try {
        const { data: cloudTransactions, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (!error && cloudTransactions) {
          const allTransactions = cloudTransactions.map(transformTransactionFromDB);
          allTransactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
          useTransactionStore.setState({ transactions: allTransactions });
          console.log(`💳 Transactions: ${allTransactions.length} loaded from Supabase`);
        } else if (error) {
          console.warn('⚠️ Transactions fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Transactions sync:', err.message);
      }
      
      // === USERS - Only sync if cloud has users, otherwise keep local defaults ===
      try {
        const { data: cloudUsers, error } = await supabase
          .from('app_users')
          .select('*');
        
        if (!error && cloudUsers && cloudUsers.length > 0) {
          // Cloud has users - merge with local (don't lose local users)
          const localUsers = useAuthStore.getState().users;
          const cloudUserIds = new Set(cloudUsers.map(u => u.id));
          const cloudUsernames = new Set(cloudUsers.map(u => u.username.toLowerCase()));
          
          // Keep local users that don't exist in cloud
          const localOnlyUsers = localUsers.filter(u => 
            !cloudUserIds.has(u.id) && !cloudUsernames.has(u.username.toLowerCase())
          );
          
          const allUsers = [...cloudUsers.map(transformUserFromDB), ...localOnlyUsers];
          useAuthStore.setState({ users: allUsers });
          console.log(`🔐 Users: ${cloudUsers.length} from cloud + ${localOnlyUsers.length} local-only`);
        } else if (error) {
          // Table might not exist - keep local users
          console.warn('⚠️ Users fetch error (keeping local):', error.message);
        } else {
          // Cloud is empty - keep local default users
          console.log('🔐 Users: Cloud empty, keeping local users');
        }
      } catch (err) {
        console.warn('⚠️ Users sync (keeping local):', err.message);
      }
      
      // === CATEGORIES - Sync from Supabase ===
      try {
        const { data: cloudCategories, error } = await supabase
          .from('categories')
          .select('name')
          .order('name');
        
        if (!error && cloudCategories && cloudCategories.length > 0) {
          const categoryNames = cloudCategories.map(c => c.name);
          useProductStore.setState({ categories: categoryNames });
          console.log(`📁 Categories: ${categoryNames.length} loaded from Supabase`);
        } else if (error) {
          console.warn('⚠️ Categories fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Categories sync:', err.message);
      }
      
      // === UNITS - Sync from Supabase ===
      try {
        const { data: cloudUnits, error } = await supabase
          .from('units')
          .select('name')
          .order('name');
        
        if (!error && cloudUnits && cloudUnits.length > 0) {
          const unitNames = cloudUnits.map(u => u.name);
          useProductStore.setState({ units: unitNames });
          console.log(`📏 Units: ${unitNames.length} loaded from Supabase`);
        } else if (error) {
          console.warn('⚠️ Units fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Units sync:', err.message);
      }
      
      // === SUPPLIERS - Sync from Supabase (merge with local) ===
      try {
        const { data: cloudSuppliers, error } = await supabase
          .from('suppliers')
          .select('*')
          .order('name');
        
        if (!error && cloudSuppliers) {
          const localSuppliers = usePurchaseStore.getState().suppliers;
          const cloudIds = new Set(cloudSuppliers.map(s => s.id));
          
          // Keep local suppliers that are not in cloud
          const localOnlySuppliers = localSuppliers.filter(s => !cloudIds.has(s.id));
          
          // Merge: cloud suppliers + local-only suppliers
          const allSuppliers = [
            ...cloudSuppliers.map(transformSupplierFromDB),
            ...localOnlySuppliers
          ];
          
          usePurchaseStore.setState({ suppliers: allSuppliers });
          console.log(`🏭 Suppliers: ${cloudSuppliers.length} from cloud + ${localOnlySuppliers.length} local-only`);
        } else if (error) {
          console.warn('⚠️ Suppliers fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Suppliers sync:', err.message);
      }
      
      // === PURCHASES - Sync from Supabase (merge with local) ===
      try {
        const { data: cloudPurchases, error } = await supabase
          .from('purchases')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (!error && cloudPurchases) {
          const localPurchases = usePurchaseStore.getState().purchases;
          const cloudIds = new Set(cloudPurchases.map(p => p.id));
          
          // Keep local purchases that are not in cloud (not yet synced)
          const localOnlyPurchases = localPurchases.filter(p => !cloudIds.has(p.id));
          
          // Merge: cloud purchases + local-only purchases
          const allPurchases = [
            ...cloudPurchases.map(transformPurchaseFromDB),
            ...localOnlyPurchases
          ];
          
          usePurchaseStore.setState({ purchases: allPurchases });
          console.log(`📥 Purchases: ${cloudPurchases.length} from cloud + ${localOnlyPurchases.length} local-only`);
        } else if (error) {
          console.warn('⚠️ Purchases fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Purchases sync:', err.message);
      }
      
      // === SETTINGS - Sync from Supabase ===
      try {
        const { data: cloudSettings, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 'default')
          .single();
        
        if (!error && cloudSettings) {
          const settings = transformSettingsFromDB(cloudSettings);
          useSettingsStore.setState({ 
            storeInfo: {
              name: settings.storeName || '',
              address: settings.storeAddress || '',
              phone: settings.storePhone || '',
              email: settings.storeEmail || '',
              logo: settings.logo || '',
              taxPercent: settings.taxPercent || 11,
              receiptFooter: settings.receiptFooter || ''
            }
          });
          console.log(`⚙️ Settings loaded from Supabase`);
        } else if (error && error.code !== 'PGRST116') {
          console.warn('⚠️ Settings fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Settings sync:', err.message);
      }
      
      // === SALES ORDERS - Sync from Supabase ===
      try {
        const { data: cloudSalesOrders, error } = await supabase
          .from('sales_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (!error && cloudSalesOrders) {
          const allSalesOrders = cloudSalesOrders.map(transformSalesOrderFromDB);
          useSalesOrderStore.setState({ salesOrders: allSalesOrders });
          console.log(`📋 Sales Orders: ${allSalesOrders.length} loaded from Supabase`);
        } else if (error) {
          console.warn('⚠️ Sales Orders fetch error:', error.message);
        }
      } catch (err) {
        console.warn('⚠️ Sales Orders sync:', err.message);
      }
      
      console.log('✅ All data loaded from Supabase (Single Source of Truth)');
    };

    initSync();

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from realtime...');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Force sync function - completely replace local with cloud data
  const forceSync = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase not configured');
      return { success: false, error: 'Supabase not configured' };
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    console.log('🔄 Force syncing ALL data from cloud...');

    try {
      // === FORCE SYNC PRODUCTS ===
      const { data: cloudProducts, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (!prodError && cloudProducts) {
        const allProducts = cloudProducts.map(transformProductFromDB);
        useProductStore.setState({ products: allProducts });
        console.log(`📦 Force synced ${allProducts.length} products`);
      }

      // === FORCE SYNC CUSTOMERS ===
      const { data: cloudCustomers, error: custError } = await supabase
        .from('customers')
        .select('*');

      if (!custError && cloudCustomers) {
        const allCustomers = cloudCustomers.map(transformCustomerFromDB);
        useCustomerStore.setState({ customers: allCustomers });
        console.log(`👤 Force synced ${allCustomers.length} customers`);
      }

      // === FORCE SYNC TRANSACTIONS ===
      const { data: cloudTransactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!transError && cloudTransactions) {
        const allTransactions = cloudTransactions.map(transformTransactionFromDB);
        allTransactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        useTransactionStore.setState({ transactions: allTransactions });
        console.log(`💳 Force synced ${allTransactions.length} transactions`);
      }

      // === FORCE SYNC USERS ===
      const { data: cloudUsers, error: userError } = await supabase
        .from('app_users')
        .select('*');

      if (!userError && cloudUsers && cloudUsers.length > 0) {
        const allUsers = cloudUsers.map(transformUserFromDB);
        useAuthStore.setState({ users: allUsers });
        console.log(`🔐 Force synced ${allUsers.length} users`);
      }

      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSync: new Date().toISOString() 
      }));

      console.log('✅ Force sync complete!');
      return { success: true };

    } catch (error) {
      console.error('❌ Force sync error:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    }
  }, []);

  // Expose forceSync globally
  useEffect(() => {
    window.__forceSync = forceSync;
  }, [forceSync]);

  return { ...syncStatus, forceSync };
}

// Component wrapper
export function RealtimeSyncProvider({ children }) {
  const syncStatus = useRealtimeSync();
  const autoRefreshRef = useRef(null);
  
  useEffect(() => {
    window.__syncStatus = syncStatus;
    window.__forceSync = syncStatus.forceSync;
  }, [syncStatus]);

  // Auto-refresh for Android (WebSocket can be unstable on mobile)
  // Using 10 second interval for more reliable sync
  useEffect(() => {
    if (isAndroid && syncStatus.forceSync) {
      console.log('📱 Android detected - enabling auto-refresh every 10 seconds');
      
      // Initial sync after 1 second
      const initialTimeout = setTimeout(() => {
        console.log('🔄 Android initial sync...');
        syncStatus.forceSync();
      }, 1000);

      // Auto-refresh every 10 seconds for reliable sync
      autoRefreshRef.current = setInterval(() => {
        console.log('🔄 Android auto-refresh triggered');
        syncStatus.forceSync();
      }, 10000);

      return () => {
        clearTimeout(initialTimeout);
        if (autoRefreshRef.current) {
          clearInterval(autoRefreshRef.current);
        }
      };
    }
  }, [syncStatus.forceSync]);
  
  return children;
}
