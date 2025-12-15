// Test Dummy Data Generator
// Untuk testing fitur sync real-time antara Android dan Web
// Jalankan di browser console: window.createTestData()

import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Generate transaction code
const generateTransactionCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRX-${dateStr}-${random}`;
};

// Dummy Products
const dummyProducts = [
  {
    name: 'TEST - Kopi Arabica 250gr',
    sku: 'TEST001',
    code: '8991234567001',
    category: 'Minuman',
    unit: 'pcs',
    price: 45000,
    cost: 30000,
    stock: 100,
    minStock: 10
  },
  {
    name: 'TEST - Gula Pasir 1kg',
    sku: 'TEST002',
    code: '8991234567002',
    category: 'Bahan Pokok',
    unit: 'kg',
    price: 15000,
    cost: 12000,
    stock: 50,
    minStock: 5
  },
  {
    name: 'TEST - Mie Instan',
    sku: 'TEST003',
    code: '8991234567003',
    category: 'Makanan',
    unit: 'pcs',
    price: 3500,
    cost: 2800,
    stock: 200,
    minStock: 20
  }
];

// Dummy Customers
const dummyCustomers = [
  {
    name: 'TEST - Budi Santoso',
    phone: '081234567890',
    email: 'budi.test@example.com',
    address: 'Jl. Test No. 1, Jakarta'
  },
  {
    name: 'TEST - Siti Aminah',
    phone: '082345678901',
    email: 'siti.test@example.com',
    address: 'Jl. Test No. 2, Bandung'
  }
];

// Create test products
export async function createTestProducts() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  console.log('📦 Creating test products...');
  const results = [];

  for (const product of dummyProducts) {
    const productData = {
      id: generateId(),
      name: product.name,
      sku: product.sku,
      code: product.code,
      category: product.category,
      unit: product.unit,
      selling_price: product.price,
      purchase_price: product.cost,
      stock: product.stock,
      min_stock: product.minStock,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('products')
      .upsert(productData, { onConflict: 'sku' })
      .select();

    if (error) {
      console.error(`❌ Failed to create ${product.name}:`, error.message);
      results.push({ product: product.name, success: false, error: error.message });
    } else {
      console.log(`✅ Created: ${product.name}`);
      results.push({ product: product.name, success: true, data });
    }
  }

  return { success: true, results };
}

// Create test customers
export async function createTestCustomers() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  console.log('👤 Creating test customers...');
  const results = [];

  for (const customer of dummyCustomers) {
    const customerData = {
      id: generateId(),
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select();

    if (error) {
      console.error(`❌ Failed to create ${customer.name}:`, error.message);
      results.push({ customer: customer.name, success: false, error: error.message });
    } else {
      console.log(`✅ Created: ${customer.name}`);
      results.push({ customer: customer.name, success: true, data });
    }
  }

  return { success: true, results };
}

// Create test transaction
export async function createTestTransaction() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  console.log('💳 Creating test transaction...');

  // Get a random product from Supabase
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .limit(3);

  if (!products || products.length === 0) {
    console.error('❌ No products found');
    return { success: false, error: 'No products found' };
  }

  // Create transaction with random products
  const items = products.slice(0, 2).map(p => ({
    product_id: p.id,
    product_name: p.name,
    quantity: Math.floor(1 + Math.random() * 3),
    price: p.selling_price,
    subtotal: p.selling_price * Math.floor(1 + Math.random() * 3)
  }));

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const transactionCode = generateTransactionCode();

  const transactionData = {
    id: generateId(),
    transaction_code: transactionCode,
    customer_name: 'TEST Customer',
    items: JSON.stringify(items),
    subtotal: subtotal,
    discount: 0,
    tax: Math.round(subtotal * 0.11),
    total: Math.round(subtotal * 1.11),
    payment_method: 'cash',
    payment_amount: Math.round(subtotal * 1.11),
    change_amount: 0,
    status: 'completed',
    cashier_name: 'Test Cashier',
    notes: 'Transaksi test untuk verifikasi sync',
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select();

  if (error) {
    console.error('❌ Failed to create transaction:', error.message);
    return { success: false, error: error.message };
  }

  console.log(`✅ Transaction created: ${transactionCode}`);
  console.log(`   Total: Rp ${transactionData.total.toLocaleString('id-ID')}`);
  
  return { success: true, data, transactionCode };
}

// Create all test data
export async function createAllTestData() {
  console.log('🚀 Creating all test data...\n');
  
  const productResult = await createTestProducts();
  console.log('');
  
  const customerResult = await createTestCustomers();
  console.log('');
  
  const transactionResult = await createTestTransaction();
  console.log('');

  console.log('═══════════════════════════════════════');
  console.log('✅ TEST DATA CREATED!');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('Sekarang cek:');
  console.log('1. Buka Web di browser lain atau refresh');
  console.log('2. Buka Android app');
  console.log('3. Data harus sama di kedua device!');
  console.log('');

  return {
    products: productResult,
    customers: customerResult,
    transaction: transactionResult
  };
}

// Delete test data
export async function deleteTestData() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  console.log('🗑️ Deleting test data...');

  // Delete test products
  const { error: prodError } = await supabase
    .from('products')
    .delete()
    .like('name', 'TEST -%');

  if (prodError) {
    console.error('❌ Failed to delete test products:', prodError.message);
  } else {
    console.log('✅ Test products deleted');
  }

  // Delete test customers
  const { error: custError } = await supabase
    .from('customers')
    .delete()
    .like('name', 'TEST -%');

  if (custError) {
    console.error('❌ Failed to delete test customers:', custError.message);
  } else {
    console.log('✅ Test customers deleted');
  }

  // Delete test transactions
  const { error: transError } = await supabase
    .from('transactions')
    .delete()
    .like('notes', '%test%');

  if (transError) {
    console.error('❌ Failed to delete test transactions:', transError.message);
  } else {
    console.log('✅ Test transactions deleted');
  }

  console.log('✅ All test data deleted');
  return { success: true };
}

// Bulk update prices for Shopee products (set default price based on name pattern)
export async function updateShopeePrices(defaultPrice = 50000) {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase not configured');
    return { success: false, error: 'Supabase not configured' };
  }

  console.log(`🔄 Updating Shopee product prices to Rp ${defaultPrice.toLocaleString('id-ID')}...`);

  // Get all Shopee products with price = 0 or NULL
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('source', 'shopee')
    .or('price.is.null,price.eq.0');

  if (fetchError) {
    console.error('❌ Failed to fetch products:', fetchError.message);
    return { success: false, error: fetchError.message };
  }

  if (!products || products.length === 0) {
    console.log('✅ No Shopee products need price update');
    return { success: true, updated: 0 };
  }

  console.log(`📦 Found ${products.length} Shopee products with no price`);

  let updated = 0;
  for (const product of products) {
    const { error } = await supabase
      .from('products')
      .update({ price: defaultPrice })
      .eq('id', product.id);

    if (!error) {
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} Shopee products with price Rp ${defaultPrice.toLocaleString('id-ID')}`);
  return { success: true, updated, total: products.length };
}

// Update price for specific product by ID
export async function updateProductPrice(productId, newPrice) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { error } = await supabase
    .from('products')
    .update({ price: newPrice })
    .eq('id', productId);

  if (error) {
    console.error('❌ Failed to update price:', error.message);
    return { success: false, error: error.message };
  }

  console.log(`✅ Updated product ${productId} price to Rp ${newPrice.toLocaleString('id-ID')}`);
  return { success: true };
}

// Expose functions globally for browser console
if (typeof window !== 'undefined') {
  window.createTestProducts = createTestProducts;
  window.createTestCustomers = createTestCustomers;
  window.createTestTransaction = createTestTransaction;
  window.createAllTestData = createAllTestData;
  window.deleteTestData = deleteTestData;
  window.updateShopeePrices = updateShopeePrices;
  window.updateProductPrice = updateProductPrice;
  
  console.log('🧪 Test functions available:');
  console.log('   window.createAllTestData() - Create all test data');
  console.log('   window.createTestProducts() - Create test products');
  console.log('   window.createTestCustomers() - Create test customers');
  console.log('   window.createTestTransaction() - Create test transaction');
  console.log('   window.deleteTestData() - Delete all test data');
  console.log('   window.updateShopeePrices(50000) - Update all Shopee products price');
  console.log('   window.updateProductPrice(id, price) - Update specific product price');
}
