// Real-Time Sync Hook (WebSocket Mode)
// Syncs data between localStorage and Supabase using WebSocket for instant updates
// IMPORTANT: Only syncs if cloud has data, never overwrites local with empty cloud

import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useProductStore } from '../store/productStore';
import { useCustomerStore } from '../store/customerStore';
import { useTransactionStore } from '../store/transactionStore';

// Transform functions - DB to Local
const transformProductFromDB = (p) => ({
  id: p.id,
  code: p.code,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  description: p.description,
  category: p.category_id,
  unit: p.unit_id,
  cost: parseFloat(p.cost_price) || 0,
  price: parseFloat(p.selling_price) || 0,
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
  phone: c.phone,
  email: c.email,
  address: c.address,
  type: c.customer_type || 'walk-in',
  points: c.points || 0,
  totalSpent: parseFloat(c.total_spent) || 0,
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

export function useRealtimeSync() {
  const isInitialized = useRef(false);
  const channelRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    mode: 'realtime'
  });

  useEffect(() => {
    if (!isSupabaseConfigured() || isInitialized.current) return;
    
    isInitialized.current = true;
    
    const initSync = async () => {
      // Check if data was just restored - skip initial sync to preserve restored data
      const justRestored = localStorage.getItem('just-restored');
      if (justRestored === 'true') {
        console.log('⏭️ Skipping initial cloud sync - data just restored from backup');
        localStorage.removeItem('just-restored');
        setSyncStatus({
          isOnline: true,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          mode: 'realtime'
        });
        // Still setup realtime subscriptions
        setupRealtimeSubscriptions();
        return;
      }
      
      console.log('🔄 Initializing REAL-TIME cloud sync...');
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      try {
        // Initial sync - fetch existing data from cloud
        await syncFromCloud();
        
        // Setup realtime subscriptions for instant updates
        setupRealtimeSubscriptions();
        
        setSyncStatus({
          isOnline: true,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          mode: 'realtime'
        });
        
        console.log('✅ Real-time sync ACTIVE - instant updates enabled!');
          
      } catch (error) {
        console.error('❌ Sync error:', error.message);
        setSyncStatus(prev => ({ ...prev, isSyncing: false, isOnline: false }));
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
        .subscribe((status) => {
          console.log('🔌 Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time sync connected!');
            setSyncStatus(prev => ({ ...prev, isOnline: true }));
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('❌ Real-time sync disconnected');
            setSyncStatus(prev => ({ ...prev, isOnline: false }));
          }
        });
    };

    // Sync from cloud - ADD new items only, never remove existing local data
    const syncFromCloud = async () => {
      // === PRODUCTS ===
      try {
        const { data: cloudProducts, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
        
        if (!error && cloudProducts && cloudProducts.length > 0) {
          const localProducts = useProductStore.getState().products;
          
          // Create lookup maps
          const localById = new Map(localProducts.map(p => [p.id, p]));
          const localBySku = new Map(localProducts.filter(p => p.sku).map(p => [p.sku, p]));
          const localByCode = new Map(localProducts.filter(p => p.code).map(p => [p.code, p]));
          
          // Find new products from cloud that don't exist locally
          let newFromCloud = 0;
          let updatedFromCloud = 0;
          const updatedProducts = [...localProducts];
          
          cloudProducts.forEach(cloudP => {
            const transformed = transformProductFromDB(cloudP);
            
            // Check if already exists locally
            const existsById = localById.has(cloudP.id);
            const existsBySku = cloudP.sku && localBySku.has(cloudP.sku);
            const existsByCode = cloudP.code && localByCode.has(cloudP.code);
            
            if (!existsById && !existsBySku && !existsByCode) {
              // New product from cloud - add it
              updatedProducts.push(transformed);
              newFromCloud++;
            } else if (existsById) {
              // Update existing product with cloud data
              const index = updatedProducts.findIndex(p => p.id === cloudP.id);
              if (index !== -1) {
                updatedProducts[index] = transformed;
                updatedFromCloud++;
              }
            }
          });
          
          if (newFromCloud > 0 || updatedFromCloud > 0) {
            useProductStore.setState({ products: updatedProducts });
            console.log(`📦 Products: +${newFromCloud} new, ~${updatedFromCloud} updated (total: ${updatedProducts.length})`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Products sync:', err.message);
      }
      
      // === CUSTOMERS ===
      try {
        const { data: cloudCustomers, error } = await supabase
          .from('customers')
          .select('*');
        
        if (!error && cloudCustomers && cloudCustomers.length > 0) {
          const localCustomers = useCustomerStore.getState().customers;
          const localById = new Map(localCustomers.map(c => [c.id, c]));
          
          let newFromCloud = 0;
          let updatedFromCloud = 0;
          const updatedCustomers = [...localCustomers];
          
          cloudCustomers.forEach(cloudC => {
            const transformed = transformCustomerFromDB(cloudC);
            if (!localById.has(cloudC.id)) {
              updatedCustomers.push(transformed);
              newFromCloud++;
            } else {
              const index = updatedCustomers.findIndex(c => c.id === cloudC.id);
              if (index !== -1) {
                updatedCustomers[index] = transformed;
                updatedFromCloud++;
              }
            }
          });
          
          if (newFromCloud > 0 || updatedFromCloud > 0) {
            useCustomerStore.setState({ customers: updatedCustomers });
            console.log(`👤 Customers: +${newFromCloud} new, ~${updatedFromCloud} updated`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Customers sync:', err.message);
      }
      
      // === TRANSACTIONS ===
      try {
        const { data: cloudTransactions, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        
        if (!error && cloudTransactions && cloudTransactions.length > 0) {
          const localTransactions = useTransactionStore.getState().transactions;
          const localByCode = new Map(localTransactions.filter(t => t.transactionCode).map(t => [t.transactionCode, t]));
          const localById = new Map(localTransactions.map(t => [t.id, t]));
          
          let newFromCloud = 0;
          const updatedTransactions = [...localTransactions];
          
          cloudTransactions.forEach(cloudT => {
            const existsByCode = cloudT.transaction_code && localByCode.has(cloudT.transaction_code);
            const existsById = localById.has(cloudT.id);
            
            if (!existsByCode && !existsById) {
              updatedTransactions.push(transformTransactionFromDB(cloudT));
              newFromCloud++;
            }
          });
          
          if (newFromCloud > 0) {
            // Sort by date
            updatedTransactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
            useTransactionStore.setState({ transactions: updatedTransactions });
            console.log(`💳 Transactions: +${newFromCloud} new from cloud`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Transactions sync:', err.message);
      }
      
      console.log('✅ Initial sync complete');
    };

    initSync();

    // Cleanup
    return () => {
      if (channelRef.current) {
        console.log('🔌 Unsubscribing from realtime...');
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return syncStatus;
}

// Component wrapper
export function RealtimeSyncProvider({ children }) {
  const syncStatus = useRealtimeSync();
  
  useEffect(() => {
    window.__syncStatus = syncStatus;
  }, [syncStatus]);
  
  return children;
}
