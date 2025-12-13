// Two-Way Sync Hook (Polling Mode)
// Syncs data between localStorage and Supabase using polling (no WebSocket)
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
  const pollIntervalRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    mode: 'polling'
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
          mode: 'polling'
        });
        return;
      }
      
      console.log('🔄 Initializing cloud sync (polling mode)...');
      setSyncStatus(prev => ({ ...prev, isSyncing: true }));
      
      try {
        // Initial sync - only add new data from cloud, never remove local data
        await syncFromCloud();
        
        setSyncStatus({
          isOnline: true,
          isSyncing: false,
          lastSync: new Date().toISOString(),
          mode: 'polling'
        });
        
        // Poll every 60 seconds
        pollIntervalRef.current = setInterval(async () => {
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          await syncFromCloud();
          setSyncStatus(prev => ({ 
            ...prev, 
            isSyncing: false, 
            lastSync: new Date().toISOString() 
          }));
        }, 60000);
        
        console.log('✅ Cloud sync active - polling every 60s');
          
      } catch (error) {
        console.error('❌ Sync error:', error.message);
        setSyncStatus(prev => ({ ...prev, isSyncing: false, isOnline: false }));
      }
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
            }
          });
          
          if (newFromCloud > 0) {
            useProductStore.setState({ products: updatedProducts });
            console.log(`📦 Products: +${newFromCloud} new from cloud (total: ${updatedProducts.length})`);
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
          const updatedCustomers = [...localCustomers];
          
          cloudCustomers.forEach(cloudC => {
            if (!localById.has(cloudC.id)) {
              updatedCustomers.push(transformCustomerFromDB(cloudC));
              newFromCloud++;
            }
          });
          
          if (newFromCloud > 0) {
            useCustomerStore.setState({ customers: updatedCustomers });
            console.log(`👤 Customers: +${newFromCloud} new from cloud`);
          }
        }
      } catch (err) {
        console.warn('⚠️ Customers sync:', err.message);
      }
      
      // === TRANSACTIONS (POS only, not Shopee orders) ===
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
      
      console.log('✅ Sync complete - local data preserved');
    };

    initSync();

    // Cleanup
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
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
