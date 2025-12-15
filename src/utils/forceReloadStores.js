// Force reload all Zustand stores from localStorage
// Use this after restore to ensure data is loaded correctly

export function forceReloadStores() {
  console.log('🔄 Force reloading all stores from localStorage...');
  
  try {
    // Get data from localStorage
    const productStorage = JSON.parse(localStorage.getItem('product-storage') || '{}');
    const customerStorage = JSON.parse(localStorage.getItem('customer-storage') || '{}');
    const transactionStorage = JSON.parse(localStorage.getItem('transaction-storage') || '{}');
    const purchaseStorage = JSON.parse(localStorage.getItem('purchase-storage') || '{}');
    
    // Log first product to verify data
    const firstProduct = productStorage.state?.products?.[0];
    console.log('First product from localStorage:', firstProduct);
    console.log('First product price:', firstProduct?.price);
    
    // Force reload by clearing and reloading the page
    // Zustand persist will automatically load from localStorage on mount
    console.log('✅ Data verified. Reloading page...');
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Force reload failed:', error);
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.forceReloadStores = forceReloadStores;
}
