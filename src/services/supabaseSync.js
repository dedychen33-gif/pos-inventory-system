// Supabase Sync Service
// Handles bidirectional sync between localStorage (Zustand) and Supabase

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// ==================== PRODUCTS ====================

// Transform Supabase product to local format
export const transformProductFromDB = (p) => ({
  id: p.id,
  code: p.code,
  sku: p.sku,
  barcode: p.barcode,
  name: p.name,
  description: p.description,
  category: p.category_id, // Will be category name after join
  categoryName: p.categories?.name,
  unit: p.unit_id,
  unitName: p.units?.name,
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

// Transform local product to Supabase format
// Note: Exclude fields that don't exist in Supabase schema (variants, hasVariants, marketplace IDs, etc.)
export const transformProductToDB = (p) => {
  const dbProduct = {
    code: p.code,
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    description: p.description,
    category_id: typeof p.category === 'number' ? p.category : null,
    unit_id: typeof p.unit === 'number' ? p.unit : null,
    cost_price: p.cost || 0,
    selling_price: p.price || 0,
    stock: p.stock || 0,
    min_stock: p.minStock || 0,
    max_stock: p.maxStock || 0,
    image_url: p.image,
    source: p.source || 'local',
    is_active: p.isActive !== false
  };

  // Only include marketplace IDs if they exist in schema
  if (p.shopeeItemId) dbProduct.shopee_item_id = p.shopeeItemId;
  if (p.shopeeModelId) dbProduct.shopee_model_id = p.shopeeModelId;
  
  // Only include variant fields if they exist in schema
  if (p.isVariant) dbProduct.is_variant = p.isVariant;
  if (p.parentId) dbProduct.parent_product_id = p.parentId;
  if (p.variantName) dbProduct.variant_name = p.variantName;

  return dbProduct;
};

// Fetch all products
export const fetchProducts = async () => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories(name),
      units(name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) return { data: null, error };
  return { data: data.map(transformProductFromDB), error: null };
};

// Add product
export const addProduct = async (product) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('products')
    .insert(transformProductToDB(product))
    .select()
    .single();
  
  return { data: data ? transformProductFromDB(data) : null, error };
};

// Update product
export const updateProduct = async (id, product) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('products')
    .update({ ...transformProductToDB(product), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  return { data: data ? transformProductFromDB(data) : null, error };
};

// Update stock
export const updateStock = async (productId, quantity, type, referenceType = 'adjustment', referenceId = null, notes = null) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  // Call the database function
  const { data, error } = await supabase.rpc('update_product_stock', {
    p_product_id: productId,
    p_quantity: quantity,
    p_type: type, // 'set', 'add', 'subtract'
    p_reference_type: referenceType,
    p_reference_id: referenceId,
    p_notes: notes
  });
  
  return { data, error };
};

// Delete product (soft delete)
export const deleteProduct = async (id) => {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
  
  const { error } = await supabase
    .from('products')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);
  
  return { error };
};

// ==================== CUSTOMERS ====================

export const transformCustomerFromDB = (c) => ({
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

export const transformCustomerToDB = (c) => ({
  code: c.code,
  name: c.name,
  phone: c.phone,
  email: c.email,
  address: c.address,
  customer_type: c.type || 'member',
  points: c.points || 0,
  total_spent: c.totalSpent || 0
});

export const fetchCustomers = async () => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name');
  
  if (error) return { data: null, error };
  return { data: data.map(transformCustomerFromDB), error: null };
};

export const addCustomer = async (customer) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('customers')
    .insert(transformCustomerToDB(customer))
    .select()
    .single();
  
  return { data: data ? transformCustomerFromDB(data) : null, error };
};

export const updateCustomer = async (id, customer) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('customers')
    .update({ ...transformCustomerToDB(customer), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  return { data: data ? transformCustomerFromDB(data) : null, error };
};

// ==================== TRANSACTIONS ====================

export const transformTransactionFromDB = (t) => ({
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
  marketplaceOrderId: t.marketplace_order_id,
  createdAt: t.created_at,
  items: t.transaction_items || []
});

export const transformTransactionToDB = (t) => ({
  transaction_code: t.transactionCode || `TRX${Date.now()}`,
  transaction_date: t.date || new Date().toISOString(),
  customer_id: t.customerId || t.customer?.id,
  subtotal: t.subtotal || 0,
  discount_type: t.discountType,
  discount_value: t.discountValue || 0,
  discount_amount: t.discount || 0,
  tax_percent: t.taxPercent || 11,
  tax_amount: t.tax || 0,
  total: t.total || 0,
  payment_method: t.paymentMethod || 'cash',
  payment_amount: t.cashAmount || 0,
  change_amount: t.change || 0,
  status: t.status || 'completed',
  void_reason: t.voidReason,
  notes: t.notes,
  cashier_id: t.cashierId,
  cashier_name: t.cashierName,
  source: t.source || 'pos',
  marketplace_order_id: t.marketplaceOrderId
});

export const fetchTransactions = async (limit = 500) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_items(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) return { data: null, error };
  return { data: data.map(transformTransactionFromDB), error: null };
};

export const addTransaction = async (transaction) => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const transactionData = transformTransactionToDB(transaction);
  
  // Insert transaction
  const { data: trxData, error: trxError } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();
  
  if (trxError) return { data: null, error: trxError };
  
  // Insert transaction items
  if (transaction.items && transaction.items.length > 0) {
    const itemsData = transaction.items.map(item => ({
      transaction_id: trxData.id,
      product_id: item.productId || item.id,
      product_code: item.code,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      discount_percent: item.discountPercent || 0,
      discount_amount: item.itemDiscount || 0,
      subtotal: (item.price * item.quantity) - (item.itemDiscount || 0)
    }));
    
    await supabase.from('transaction_items').insert(itemsData);
  }
  
  return { data: transformTransactionFromDB(trxData), error: null };
};

export const voidTransaction = async (id, reason) => {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
  
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'void',
      void_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);
  
  return { error };
};

// ==================== CATEGORIES & UNITS ====================

export const fetchCategories = async () => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  return { data, error };
};

export const fetchUnits = async () => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .order('name');
  
  return { data, error };
};

// ==================== SUPPLIERS ====================

export const transformSupplierFromDB = (s) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  phone: s.phone,
  email: s.email,
  address: s.address,
  createdAt: s.created_at
});

export const fetchSuppliers = async () => {
  if (!isSupabaseConfigured()) return { data: null, error: 'Supabase not configured' };
  
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name');
  
  if (error) return { data: null, error };
  return { data: data.map(transformSupplierFromDB), error: null };
};

// ==================== SYNC STATUS ====================

export const getSyncStatus = async () => {
  if (!isSupabaseConfigured()) {
    return { 
      isConfigured: false, 
      isOnline: false,
      message: 'Supabase belum dikonfigurasi'
    };
  }
  
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return {
      isConfigured: true,
      isOnline: true,
      productCount: count,
      message: 'Terhubung ke Supabase'
    };
  } catch (error) {
    return {
      isConfigured: true,
      isOnline: false,
      message: 'Gagal terhubung ke Supabase: ' + error.message
    };
  }
};

// ==================== BULK SYNC (LocalStorage → Supabase) ====================

export const syncLocalToSupabase = async (products, customers, transactions) => {
  if (!isSupabaseConfigured()) return { error: 'Supabase not configured' };
  
  const results = { products: 0, customers: 0, transactions: 0, errors: [] };
  
  // Sync products
  for (const product of products) {
    try {
      const { error } = await supabase
        .from('products')
        .upsert(transformProductToDB(product), { onConflict: 'code' });
      if (!error) results.products++;
      else results.errors.push(`Product ${product.name}: ${error.message}`);
    } catch (e) {
      results.errors.push(`Product ${product.name}: ${e.message}`);
    }
  }
  
  // Sync customers
  for (const customer of customers) {
    if (customer.type === 'walk-in') continue; // Skip walk-in
    try {
      const { error } = await supabase
        .from('customers')
        .upsert(transformCustomerToDB(customer), { onConflict: 'code' });
      if (!error) results.customers++;
      else results.errors.push(`Customer ${customer.name}: ${error.message}`);
    } catch (e) {
      results.errors.push(`Customer ${customer.name}: ${e.message}`);
    }
  }
  
  // Sync transactions
  for (const transaction of transactions) {
    try {
      const { error } = await supabase
        .from('transactions')
        .upsert(transformTransactionToDB(transaction), { onConflict: 'transaction_code' });
      if (!error) results.transactions++;
      else results.errors.push(`Transaction ${transaction.transactionCode}: ${error.message}`);
    } catch (e) {
      results.errors.push(`Transaction ${transaction.transactionCode}: ${e.message}`);
    }
  }
  
  return { data: results, error: null };
};

// ==================== DELETE ALL DATA ====================

// Delete all data from Supabase (products, customers, transactions)
export const deleteAllSupabaseData = async () => {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase not configured' };
  }

  const results = { products: 0, customers: 0, transactions: 0, errors: [] };

  try {
    // Delete all transactions
    const { error: txError, count: txCount } = await supabase
      .from('transactions')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (txError) {
      results.errors.push(`Transactions: ${txError.message}`);
    } else {
      results.transactions = txCount || 0;
    }

    // Delete all customers (except system customers if any)
    const { error: custError, count: custCount } = await supabase
      .from('customers')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (custError) {
      results.errors.push(`Customers: ${custError.message}`);
    } else {
      results.customers = custCount || 0;
    }

    // Delete all products
    const { error: prodError, count: prodCount } = await supabase
      .from('products')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (prodError) {
      results.errors.push(`Products: ${prodError.message}`);
    } else {
      results.products = prodCount || 0;
    }

    return { 
      data: results, 
      error: results.errors.length > 0 ? results.errors.join(', ') : null 
    };
  } catch (error) {
    return { data: null, error: error.message };
  }
};
