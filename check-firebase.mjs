// Firebase Data Verification Script
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDdPSX6rrF2AwX9FXTFv3NBvTnodN7jgTE",
  authDomain: "pos-inventory-5eb73.firebaseapp.com",
  databaseURL: "https://pos-inventory-5eb73-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pos-inventory-5eb73",
  storageBucket: "pos-inventory-5eb73.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkFirebaseData() {
  console.log('\n🔥 ======= CEK DATA FIREBASE =======\n');
  
  const modules = [
    { path: 'products', name: '📦 Produk' },
    { path: 'categories', name: '📂 Kategori' },
    { path: 'units', name: '📏 Satuan' },
    { path: 'customers', name: '👥 Pelanggan' },
    { path: 'transactions', name: '💰 Transaksi/Penjualan' },
    { path: 'suppliers', name: '🚚 Supplier' },
    { path: 'purchases', name: '📋 Pembelian' },
    { path: 'salesOrders', name: '📝 Sales Orders' },
    { path: 'expenses', name: '💸 Pengeluaran' },
    { path: 'debts', name: '💳 Hutang Piutang' },
    { path: 'returns', name: '🔄 Barang Retur' },
    { path: 'settings', name: '⚙️ Pengaturan' }
  ];

  let totalData = 0;
  const results = [];

  for (const module of modules) {
    try {
      const snapshot = await get(ref(db, module.path));
      const data = snapshot.val();
      
      let count = 0;
      let status = '❌ Kosong';
      let sample = '';
      
      if (data) {
        if (Array.isArray(data)) {
          count = data.length;
        } else if (typeof data === 'object') {
          count = Object.keys(data).length;
        } else {
          count = 1;
        }
        
        if (count > 0) {
          status = '✅ Ada Data';
          totalData += count;
          
          // Get sample data
          if (module.path === 'products' && data) {
            const firstKey = Object.keys(data)[0];
            const firstProduct = data[firstKey];
            sample = `Sample: ${firstProduct?.name || 'N/A'}`;
          } else if (module.path === 'categories' && Array.isArray(data)) {
            sample = `Sample: ${data.slice(0, 3).join(', ')}`;
          } else if (module.path === 'settings' && data?.default) {
            sample = `Toko: ${data.default?.store_name || 'N/A'}`;
          }
        }
      }
      
      results.push({
        module: module.name,
        count,
        status,
        sample
      });
      
      console.log(`${module.name}: ${status} (${count} records) ${sample}`);
      
    } catch (error) {
      results.push({
        module: module.name,
        count: 0,
        status: '⚠️ Error',
        sample: error.message
      });
      console.log(`${module.name}: ⚠️ Error - ${error.message}`);
    }
  }

  console.log('\n======================================');
  console.log(`📊 TOTAL DATA DI FIREBASE: ${totalData} records`);
  console.log('======================================\n');

  // Summary
  const withData = results.filter(r => r.count > 0).length;
  const empty = results.filter(r => r.count === 0 && r.status !== '⚠️ Error').length;
  const errors = results.filter(r => r.status === '⚠️ Error').length;

  console.log('📋 RINGKASAN:');
  console.log(`   ✅ Module dengan data: ${withData}`);
  console.log(`   ❌ Module kosong: ${empty}`);
  console.log(`   ⚠️ Module error: ${errors}`);
  console.log('\n✅ Pengecekan selesai!\n');

  process.exit(0);
}

checkFirebaseData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
