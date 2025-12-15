/**
 * Firebase Realtime Sync Hook
 * 
 * Arsitektur Cloud-First dengan Firebase Realtime Database
 * - Semua data disimpan ke Firebase
 * - Realtime sync otomatis ke semua device
 * - Offline support built-in
 */

import { useEffect, useRef, useState } from 'react';
import { firebaseDB } from '../lib/firebase';
import { useProductStore } from '../store/productStore';
import { useCustomerStore } from '../store/customerStore';
import { useTransactionStore } from '../store/transactionStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useSalesOrderStore } from '../store/salesOrderStore';
import { useExpenseStore } from '../store/expenseStore';
import { useDebtStore } from '../store/debtStore';

export function useFirebaseSync() {
  const [syncStatus, setSyncStatus] = useState({
    isConnected: false,
    isSyncing: false,
    lastSync: null
  });
  
  const unsubscribers = useRef([]);
  const isInitialized = useRef(false);

  // Get store setters
  const setProducts = useProductStore(state => state.setProducts);
  const setCustomers = useCustomerStore(state => state.setCustomers);
  const setTransactions = useTransactionStore(state => state.setTransactions);
  const { setSuppliers, setPurchases } = usePurchaseStore();
  const setSalesOrders = useSalesOrderStore(state => state.setSalesOrders);
  const setExpenses = useExpenseStore(state => state.setExpenses);
  const setDebts = useDebtStore(state => state.setDebts);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Check if data was just restored - skip Firebase sync to preserve restored data
    const restoreTimestamp = localStorage.getItem('restore-timestamp');
    if (restoreTimestamp) {
      const restoreTime = parseInt(restoreTimestamp, 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (now - restoreTime < fiveMinutes) {
        console.log('⏭️ Skipping Firebase sync - data restored from backup within last 5 minutes');
        setSyncStatus({
          isConnected: true,
          isSyncing: false,
          lastSync: new Date().toISOString()
        });
        return;
      } else {
        localStorage.removeItem('restore-timestamp');
        console.log('⏰ Restore protection expired, resuming Firebase sync');
      }
    }

    console.log('🔥 Initializing Firebase Realtime Sync...');
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    // Subscribe to Products from Firebase for realtime sync
    const unsubProducts = firebaseDB.onValue('products', (data) => {
      // Check restore protection on every callback
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) {
        console.log('📦 Firebase: Skipping products sync - restore protection active');
        return;
      }
      
      if (data) {
        const products = Object.entries(data).map(([id, item]) => ({ 
          ...item, 
          id,
          // Normalize price fields
          cost: item.cost || item.costPrice || 0,
          costPrice: item.costPrice || item.cost || 0,
          price: item.price || item.sellingPrice || 0
        }));
        console.log(`📦 Firebase: ${products.length} products synced`);
        if (products.length > 0) {
          setProducts(products);
        } else {
          console.log('📦 Firebase: Empty products array, keeping local data');
        }
      } else {
        console.log('📦 Firebase: No products in Firebase, keeping local data');
      }
    });
    unsubscribers.current.push(unsubProducts);

    // Subscribe to Categories from Firebase
    const unsubCategories = firebaseDB.onValue('categories', (data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`📂 Firebase: ${data.length} categories synced`);
        setCategories(data);
      } else {
        console.log('📂 Firebase: No categories, keeping local defaults');
      }
    });
    unsubscribers.current.push(unsubCategories);

    // Subscribe to Customers - only update if Firebase has data
    const unsubCustomers = firebaseDB.onValue('customers', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const customers = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`👥 Firebase: ${customers.length} customers synced`);
        if (customers.length > 0) setCustomers(customers);
      }
    });
    unsubscribers.current.push(unsubCustomers);

    // Subscribe to Transactions - only update if Firebase has data
    const unsubTransactions = firebaseDB.onValue('transactions', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const transactions = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`💰 Firebase: ${transactions.length} transactions synced`);
        if (transactions.length > 0) setTransactions(transactions);
      }
    });
    unsubscribers.current.push(unsubTransactions);

    // Subscribe to Suppliers
    const unsubSuppliers = firebaseDB.onValue('suppliers', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const suppliers = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`🚚 Firebase: ${suppliers.length} suppliers synced`);
        if (suppliers.length > 0) setSuppliers(suppliers);
      }
    });
    unsubscribers.current.push(unsubSuppliers);

    // Subscribe to Purchases
    const unsubPurchases = firebaseDB.onValue('purchases', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const purchases = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`📋 Firebase: ${purchases.length} purchases synced`);
        if (purchases.length > 0) setPurchases(purchases);
      }
    });
    unsubscribers.current.push(unsubPurchases);

    // Subscribe to Sales Orders
    const unsubSalesOrders = firebaseDB.onValue('salesOrders', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const salesOrders = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`📝 Firebase: ${salesOrders.length} sales orders synced`);
        if (salesOrders.length > 0) setSalesOrders(salesOrders);
      }
    });
    unsubscribers.current.push(unsubSalesOrders);

    // Subscribe to Expenses
    const unsubExpenses = firebaseDB.onValue('expenses', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const expenses = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`💸 Firebase: ${expenses.length} expenses synced`);
        if (expenses.length > 0) setExpenses(expenses);
      }
    });
    unsubscribers.current.push(unsubExpenses);

    // Subscribe to Debts
    const unsubDebts = firebaseDB.onValue('debts', (data) => {
      const restoreTs = localStorage.getItem('restore-timestamp');
      if (restoreTs && (Date.now() - parseInt(restoreTs, 10)) < 5 * 60 * 1000) return;
      
      if (data) {
        const debts = Object.entries(data).map(([id, item]) => ({ ...item, id }));
        console.log(`📋 Firebase: ${debts.length} debts synced`);
        if (debts.length > 0) setDebts(debts);
      }
    });
    unsubscribers.current.push(unsubDebts);

    setSyncStatus({
      isConnected: true,
      isSyncing: false,
      lastSync: new Date().toISOString()
    });

    console.log('✅ Firebase Realtime Sync initialized!');

    // Cleanup
    return () => {
      unsubscribers.current.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [setProducts, setCustomers, setTransactions, setSuppliers, setPurchases, setSalesOrders, setExpenses, setDebts]);

  return syncStatus;
}

// Firebase CRUD operations for stores
export const firebaseCRUD = {
  // Products
  addProduct: async (product) => {
    const id = product.id || crypto.randomUUID();
    await firebaseDB.set(`products/${id}`, { ...product, id });
    return id;
  },
  updateProduct: async (id, data) => {
    await firebaseDB.update(`products/${id}`, data);
  },
  deleteProduct: async (id) => {
    await firebaseDB.remove(`products/${id}`);
  },

  // Customers
  addCustomer: async (customer) => {
    const id = customer.id || crypto.randomUUID();
    await firebaseDB.set(`customers/${id}`, { ...customer, id });
    return id;
  },
  updateCustomer: async (id, data) => {
    await firebaseDB.update(`customers/${id}`, data);
  },
  deleteCustomer: async (id) => {
    await firebaseDB.remove(`customers/${id}`);
  },

  // Transactions
  addTransaction: async (transaction) => {
    const id = transaction.id || crypto.randomUUID();
    await firebaseDB.set(`transactions/${id}`, { ...transaction, id });
    return id;
  },
  updateTransaction: async (id, data) => {
    await firebaseDB.update(`transactions/${id}`, data);
  },
  deleteTransaction: async (id) => {
    await firebaseDB.remove(`transactions/${id}`);
  },

  // Suppliers
  addSupplier: async (supplier) => {
    const id = supplier.id || crypto.randomUUID();
    await firebaseDB.set(`suppliers/${id}`, { ...supplier, id });
    return id;
  },
  updateSupplier: async (id, data) => {
    await firebaseDB.update(`suppliers/${id}`, data);
  },
  deleteSupplier: async (id) => {
    await firebaseDB.remove(`suppliers/${id}`);
  },

  // Purchases
  addPurchase: async (purchase) => {
    const id = purchase.id || crypto.randomUUID();
    await firebaseDB.set(`purchases/${id}`, { ...purchase, id });
    return id;
  },
  updatePurchase: async (id, data) => {
    await firebaseDB.update(`purchases/${id}`, data);
  },
  deletePurchase: async (id) => {
    await firebaseDB.remove(`purchases/${id}`);
  },

  // Sales Orders
  addSalesOrder: async (order) => {
    const id = order.id || crypto.randomUUID();
    await firebaseDB.set(`salesOrders/${id}`, { ...order, id });
    return id;
  },
  updateSalesOrder: async (id, data) => {
    await firebaseDB.update(`salesOrders/${id}`, data);
  },
  deleteSalesOrder: async (id) => {
    await firebaseDB.remove(`salesOrders/${id}`);
  }
};

// Migrate all local data to Firebase (one-time upload)
export async function migrateToFirebase() {
  console.log('🚀 Starting migration to Firebase...');
  
  try {
    // Get data from localStorage
    const productStorage = JSON.parse(localStorage.getItem('product-storage') || '{}');
    const customerStorage = JSON.parse(localStorage.getItem('customer-storage') || '{}');
    const transactionStorage = JSON.parse(localStorage.getItem('transaction-storage') || '{}');
    const purchaseStorage = JSON.parse(localStorage.getItem('purchase-storage') || '{}');
    const salesOrderStorage = JSON.parse(localStorage.getItem('sales-order-storage') || '{}');
    
    const products = productStorage.state?.products || [];
    const categories = productStorage.state?.categories || [];
    const customers = customerStorage.state?.customers || [];
    const transactions = transactionStorage.state?.transactions || [];
    const suppliers = purchaseStorage.state?.suppliers || [];
    const purchases = purchaseStorage.state?.purchases || [];
    const salesOrders = salesOrderStorage.state?.salesOrders || [];
    
    let totalUploaded = 0;
    
    // Upload Categories
    if (categories.length > 0) {
      console.log(`📂 Uploading ${categories.length} categories...`);
      console.log('📂 Categories to upload:', categories);
      const result = await firebaseDB.set('categories', categories);
      if (result.success) {
        totalUploaded += categories.length;
        console.log(`✅ Categories uploaded successfully: ${categories.length}`);
      } else {
        console.error('❌ Failed to upload categories:', result.error);
      }
    } else {
      console.log('⚠️ No categories found in localStorage');
    }
    
    // Upload Products
    if (products.length > 0) {
      console.log(`📦 Uploading ${products.length} products...`);
      for (const product of products) {
        const normalizedProduct = {
          ...product,
          cost: product.cost || product.costPrice || 0,
          costPrice: product.costPrice || product.cost || 0,
          price: product.price || product.sellingPrice || 0
        };
        await firebaseDB.set(`products/${product.id}`, normalizedProduct);
      }
      totalUploaded += products.length;
      console.log(`✅ Products uploaded: ${products.length}`);
    }
    
    // Upload Customers
    if (customers.length > 0) {
      console.log(`👥 Uploading ${customers.length} customers...`);
      for (const customer of customers) {
        await firebaseDB.set(`customers/${customer.id}`, customer);
      }
      totalUploaded += customers.length;
      console.log(`✅ Customers uploaded: ${customers.length}`);
    }
    
    // Upload Transactions
    if (transactions.length > 0) {
      console.log(`💰 Uploading ${transactions.length} transactions...`);
      for (const transaction of transactions) {
        await firebaseDB.set(`transactions/${transaction.id}`, transaction);
      }
      totalUploaded += transactions.length;
      console.log(`✅ Transactions uploaded: ${transactions.length}`);
    }
    
    // Upload Suppliers
    if (suppliers.length > 0) {
      console.log(`🚚 Uploading ${suppliers.length} suppliers...`);
      for (const supplier of suppliers) {
        await firebaseDB.set(`suppliers/${supplier.id}`, supplier);
      }
      totalUploaded += suppliers.length;
      console.log(`✅ Suppliers uploaded: ${suppliers.length}`);
    }
    
    // Upload Purchases
    if (purchases.length > 0) {
      console.log(`📋 Uploading ${purchases.length} purchases...`);
      for (const purchase of purchases) {
        await firebaseDB.set(`purchases/${purchase.id}`, purchase);
      }
      totalUploaded += purchases.length;
      console.log(`✅ Purchases uploaded: ${purchases.length}`);
    }
    
    // Upload Sales Orders
    if (salesOrders.length > 0) {
      console.log(`📝 Uploading ${salesOrders.length} sales orders...`);
      for (const order of salesOrders) {
        await firebaseDB.set(`salesOrders/${order.id}`, order);
      }
      totalUploaded += salesOrders.length;
      console.log(`✅ Sales Orders uploaded: ${salesOrders.length}`);
    }
    
    console.log(`🎉 Migration complete! Total items uploaded: ${totalUploaded}`);
    return { success: true, count: totalUploaded };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

// Fix/normalize existing localStorage data
export function fixLocalStorageData() {
  console.log('🔧 Fixing localStorage data...');
  
  try {
    const productStorage = JSON.parse(localStorage.getItem('product-storage') || '{}');
    const products = productStorage.state?.products || [];
    
    console.log(`📦 Found ${products.length} products`);
    
    if (products.length > 0) {
      console.log('First product before fix:', products[0]);
      console.log('First product price:', products[0]?.price);
      
      // Normalize all products
      const fixedProducts = products.map(p => ({
        ...p,
        cost: p.cost || p.costPrice || 0,
        costPrice: p.costPrice || p.cost || 0,
        price: p.price || p.sellingPrice || 0,
        stock: p.stock || 0,
        minStock: p.minStock || p.min_stock || 5
      }));
      
      // Save back to localStorage
      productStorage.state.products = fixedProducts;
      localStorage.setItem('product-storage', JSON.stringify(productStorage));
      
      console.log('First product after fix:', fixedProducts[0]);
      console.log('First product price after fix:', fixedProducts[0]?.price);
      console.log('✅ Fixed! Reload the page to see changes.');
      
      return { success: true, count: fixedProducts.length };
    }
    
    return { success: true, count: 0 };
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { success: false, error: error.message };
  }
}

// Upload only categories to Firebase (helper function)
export async function uploadCategoriesToFirebase() {
  console.log('📂 Uploading categories to Firebase...');
  
  try {
    const productStorage = JSON.parse(localStorage.getItem('product-storage') || '{}');
    const categories = productStorage.state?.categories || [];
    
    if (categories.length > 0) {
      console.log('📂 Categories found:', categories);
      const result = await firebaseDB.set('categories', categories);
      
      if (result.success) {
        console.log(`✅ ${categories.length} categories uploaded to Firebase`);
        return { success: true, count: categories.length, categories };
      } else {
        console.error('❌ Failed to upload categories:', result.error);
        return { success: false, error: result.error };
      }
    } else {
      console.log('⚠️ No categories in localStorage');
      return { success: false, error: 'No categories found' };
    }
  } catch (error) {
    console.error('❌ Error uploading categories:', error);
    return { success: false, error: error.message };
  }
}

// Make functions available globally for easy access
if (typeof window !== 'undefined') {
  window.migrateToFirebase = migrateToFirebase;
  window.fixLocalStorageData = fixLocalStorageData;
  window.uploadCategoriesToFirebase = uploadCategoriesToFirebase;
}

// Provider component
export function FirebaseSyncProvider({ children }) {
  const syncStatus = useFirebaseSync();
  
  useEffect(() => {
    window.__firebaseSyncStatus = syncStatus;
  }, [syncStatus]);

  return children;
}
