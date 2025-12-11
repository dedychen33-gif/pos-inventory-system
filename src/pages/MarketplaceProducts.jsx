import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, ChevronDown, ChevronRight, Search, Package, RefreshCw, Download, Check, Store,
  Filter, Eye, Edit2, Trash2, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useMarketplaceStore, PLATFORM_INFO } from '../store/marketplaceStore';
import { shopeeApi, lazadaApi } from '../services/marketplaceApi';

// Component to render marketplace logo
const MarketplaceLogo = ({ platform, size = 24 }) => {
  const platformInfo = PLATFORM_INFO[platform] || PLATFORM_INFO.manual;
  if (platformInfo.logo) {
    return <span dangerouslySetInnerHTML={{ __html: platformInfo.logo(size) }} />;
  }
  return <span className="text-xl">{platformInfo.icon || '📦'}</span>;
};

export default function MarketplaceProducts() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState([]);

  const { products, importShopeeProducts, addProduct, updateProduct } = useProductStore();
  const { stores, updateStore } = useMarketplaceStore();

  // Filter marketplace products only (from Shopee, Lazada, Tokopedia, TikTok)
  const marketplaceProducts = useMemo(() => {
    return products.filter(p => 
      p.source === 'shopee' || 
      p.source === 'lazada' || 
      p.source === 'tokopedia' || 
      p.source === 'tiktok' ||
      p.shopeeItemId || // Legacy Shopee products
      p.marketplaceSource
    );
  }, [products]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return marketplaceProducts.filter(product => {
      // Search filter
      const matchSearch = !searchTerm || 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code?.toLowerCase().includes(searchTerm.toLowerCase());

      // Store filter - check multiple fields for store matching
      let matchStore = filterStore === 'all';
      if (!matchStore && filterStore !== 'all') {
        // Parse filterStore format: "storeName (platform)" or just storeId
        const selectedStore = stores.find(s => s.id === parseInt(filterStore));
        
        if (selectedStore) {
          // Match by shop name
          matchStore = product.shopName === selectedStore.shopName ||
            product.storeName === selectedStore.shopName ||
            // Match by platform + shop ID
            (product.source === selectedStore.platform && product.shopId === selectedStore.shopId) ||
            // Match by marketplace store reference
            product.marketplaceStoreId === selectedStore.id ||
            // Match by shop name in product
            product.shop_name === selectedStore.shopName;
        }
      }

      // Status filter
      let matchStatus = filterStatus === 'all';
      if (filterStatus === 'imported') {
        matchStatus = product.imported === true || product.isImported === true;
      } else if (filterStatus === 'not-imported') {
        matchStatus = !product.imported && !product.isImported;
      }

      return matchSearch && matchStore && matchStatus;
    });
  }, [marketplaceProducts, searchTerm, filterStore, filterStatus, stores]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / perPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // Stats
  const totalProductCount = marketplaceProducts.length;
  const importedCount = marketplaceProducts.filter(p => p.imported || p.isImported).length;
  const connectedStoresCount = stores.filter(s => s.isActive && s.isConnected).length;

  // Handle sync - fetch products from all connected stores
  const handleSync = async () => {
    setIsSyncing(true);
    const connectedStores = stores.filter(s => s.isActive && s.isConnected);
    
    if (connectedStores.length === 0) {
      alert('Tidak ada toko yang terhubung. Silakan hubungkan toko terlebih dahulu.');
      setIsSyncing(false);
      return;
    }

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let errors = [];

    try {
      for (const store of connectedStores) {
        try {
          console.log(`Syncing products from ${store.shopName} (${store.platform})...`);
          
          let result;
          if (store.platform === 'shopee') {
            result = await shopeeApi.syncProducts(store);
          } else if (store.platform === 'lazada') {
            result = await lazadaApi.syncProducts(store);
          } else {
            console.log(`Platform ${store.platform} not yet implemented for sync`);
            continue;
          }

          console.log(`API returned ${result?.data?.length || 0} products from ${store.shopName}`);

          if (result.success && result.data && result.data.length > 0) {
            // Transform products from API response
            const productsToAdd = result.data.map(item => {
              // Debug: log item structure to see models data
              if (item.models && item.models.length > 0) {
                console.log('Product with models:', item.item_name, item.models);
              }
              
              // Process variants/models if available
              const variants = item.models?.map(model => {
                // Debug: log full model structure to find price field
                if (model.price_info) {
                  console.log('Model price_info detail:', model.model_name, JSON.stringify(model.price_info));
                }
                
                // price_info is an array in Shopee API, get first element
                const priceInfo = Array.isArray(model.price_info) ? model.price_info[0] : model.price_info;
                
                // Try multiple price field locations from Shopee API
                const variantPrice = 
                  model.current_price || 
                  priceInfo?.current_price ||
                  priceInfo?.original_price ||
                  model.original_price ||
                  model.price ||
                  0;
                
                // Try multiple stock field locations
                const variantStock = 
                  model.stock ||
                  model.current_stock ||
                  model.stock_info_v2?.seller_stock?.[0]?.stock ||
                  model.stock_info_v2?.summary_info?.total_available_stock ||
                  model.stock_info?.current_stock ||
                  0;
                
                return {
                  modelId: model.model_id,
                  name: model.model_name || model.name || '',
                  sku: model.model_sku || '',
                  price: variantPrice,
                  stock: variantStock,
                  image: model.image?.image_url || model.image_url || item.image?.image_url_list?.[0] || ''
                };
              }) || [];

              // Prepare marketplace-specific IDs
              const marketplaceIds = {};
              if (store.platform === 'shopee') {
                marketplaceIds.shopeeItemId = item.item_id;
                marketplaceIds.shopeeModelId = item.model_id;
              } else if (store.platform === 'lazada') {
                marketplaceIds.lazadaItemId = item.item_id || item.ItemId;
                marketplaceIds.lazadaSkuId = item.sku_id || item.SkuId;
              } else if (store.platform === 'tokopedia') {
                marketplaceIds.tokopediaProductId = item.product_id || item.id;
              } else if (store.platform === 'tiktok') {
                marketplaceIds.tiktokProductId = item.product_id || item.id;
              }

              return {
                id: Date.now() + Math.random(),
                code: `MKT${item.item_id || item.id || Date.now()}`,
                sku: item.item_sku || item.model_sku || item.sku || '',
                barcode: item.item_sku || '',
                name: item.item_name || item.name || 'Unknown Product',
                description: item.description || '',
                category: 'Marketplace',
                unit: 'pcs',
                cost: 0,
                price: item.current_price || item.price_info?.[0]?.current_price || item.price || 0,
                stock: item.current_stock || item.stock_info_v2?.summary_info?.total_available_stock || item.stock || 0,
                minStock: 5,
                image: item.image?.image_url_list?.[0] || item.image || '',
                source: store.platform,
                shopId: store.shopId,
                shopName: store.shopName,
                ...marketplaceIds,
                marketplaceStoreId: store.id,
                hasVariants: variants.length > 1,
                variants: variants,
                imported: false,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            });
            
            // Debug: count products with variants
            const productsWithVariants = productsToAdd.filter(p => p.hasVariants);
            console.log(`Products with variants: ${productsWithVariants.length} of ${productsToAdd.length}`);

            console.log(`Processing ${productsToAdd.length} products from ${store.shopName}...`);
            
            // Track skipped products for debugging
            const skippedProducts = [];

            // Add or update each product - use getState() to get fresh products list
            for (const product of productsToAdd) {
              // Get current products from store (fresh state)
              const currentProducts = useProductStore.getState().products;
              
              // Match by marketplace-specific ID (primary) or by SKU (secondary)
              const existingProduct = currentProducts.find(p => {
                // Only check products from same platform
                if (p.source !== store.platform) return false;
                
                // Primary match: marketplace-specific ID
                if (store.platform === 'shopee' && p.shopeeItemId && p.shopeeItemId === product.shopeeItemId) {
                  return true;
                }
                if (store.platform === 'lazada' && p.lazadaItemId && p.lazadaItemId === product.lazadaItemId) {
                  return true;
                }
                if (store.platform === 'tokopedia' && p.tokopediaProductId && p.tokopediaProductId === product.tokopediaProductId) {
                  return true;
                }
                if (store.platform === 'tiktok' && p.tiktokProductId && p.tiktokProductId === product.tiktokProductId) {
                  return true;
                }
                
                // Secondary match: same platform, same SKU (but SKU must be meaningful, not empty or dash)
                const validSku = product.sku && product.sku.trim() !== '' && product.sku.trim() !== '-';
                if (validSku && p.sku === product.sku) {
                  return true;
                }
                
                return false;
              });
              
              if (existingProduct) {
                // Check if there are actual changes (price or stock different)
                const priceChanged = Math.abs(existingProduct.price - product.price) > 0.01;
                const stockChanged = existingProduct.stock !== product.stock;
                const hasChanges = priceChanged || stockChanged;
                
                if (hasChanges) {
                  // Only update if there are actual changes
                  updateProduct(existingProduct.id, {
                    name: product.name,
                    price: product.price,
                    stock: product.stock,
                    image: product.image || existingProduct.image,
                    variants: product.variants || existingProduct.variants,
                    updatedAt: product.updatedAt
                  });
                  totalUpdated++;
                  
                  console.log(`Updated product: ${product.name} (Price: ${existingProduct.price} → ${product.price}, Stock: ${existingProduct.stock} → ${product.stock})`);
                } else {
                  // Skip - no changes detected
                  let matchedBy = 'sku';
                  if (store.platform === 'shopee' && existingProduct.shopeeItemId === product.shopeeItemId) matchedBy = 'shopeeItemId';
                  if (store.platform === 'lazada' && existingProduct.lazadaItemId === product.lazadaItemId) matchedBy = 'lazadaItemId';
                  if (store.platform === 'tokopedia' && existingProduct.tokopediaProductId === product.tokopediaProductId) matchedBy = 'tokopediaProductId';
                  if (store.platform === 'tiktok' && existingProduct.tiktokProductId === product.tiktokProductId) matchedBy = 'tiktokProductId';
                  
                  skippedProducts.push({
                    name: product.name,
                    marketplaceId: product.shopeeItemId || product.lazadaItemId || product.tokopediaProductId || product.tiktokProductId,
                    sku: product.sku,
                    reason: 'no_changes',
                    matchedBy: matchedBy,
                    existingId: existingProduct.id
                  });
                  totalSkipped++;
                }
              } else {
                // New product - add it
                addProduct(product);
                totalSynced++;
              }
            }

            // Log skipped products for debugging
            if (skippedProducts.length > 0) {
              console.warn(`Skipped/Updated ${skippedProducts.length} products (duplicates):`, skippedProducts);
            }
            
            console.log(`Sync summary for ${store.shopName}: ${totalSynced} added, ${totalUpdated} updated, ${totalSkipped} skipped (no changes)`);

            // Update store last sync time and product count
            updateStore(store.id, { 
              lastSync: new Date().toISOString(),
              productCount: result.count || result.data.length
            });
          }
        } catch (storeError) {
          console.error(`Error syncing ${store.shopName}:`, storeError);
          errors.push(`${store.shopName}: ${storeError.message}`);
        }
      }

      // Show summary message
      const messages = [];
      if (totalSynced > 0) messages.push(`✅ ${totalSynced} produk baru ditambahkan`);
      if (totalUpdated > 0) messages.push(`🔄 ${totalUpdated} produk diperbarui`);
      if (totalSkipped > 0) messages.push(`⏭️ ${totalSkipped} produk di-skip (sudah ada, tidak ada perubahan)`);
      
      if (messages.length > 0) {
        alert(`Sinkronisasi berhasil!\n\n${messages.join('\n')}\n\n💡 Produk duplikat tidak akan ditambahkan lagi ke database lokal.`);
      } else if (errors.length > 0) {
        alert(`Sinkronisasi selesai dengan error:\n${errors.join('\n')}`);
      } else {
        alert('Sinkronisasi selesai. Tidak ada perubahan.');
      }
    } catch (error) {
      alert('Gagal sinkronisasi: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle select all on current page
  const handleSelectAll = () => {
    if (selectedProducts.length === paginatedProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(paginatedProducts.map(p => p.id));
    }
  };

  // Handle individual select
  const handleSelectProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Get platform badge for product
  const getPlatformBadge = (product) => {
    const platform = product.source || 'shopee';
    const platformInfo = PLATFORM_INFO[platform] || PLATFORM_INFO.manual;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${platformInfo.bgLight} ${platformInfo.textColor}`}>
        {platformInfo.name}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/marketplace/integration')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produk Marketplace</h1>
            <p className="text-gray-600">Lihat dan impor produk dari semua toko</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-success flex items-center gap-2"
        >
          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          Sync Produk
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Produk</p>
            <p className="text-2xl font-bold">{totalProductCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Sudah Diimpor</p>
            <p className="text-2xl font-bold">{importedCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Store className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Toko Terhubung</p>
            <p className="text-2xl font-bold">{connectedStoresCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Download className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Dipilih</p>
            <p className="text-2xl font-bold">{selectedProducts.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama produk atau SKU..."
              className="w-full pl-10 input"
            />
          </div>

          {/* Filter icon */}
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={20} />
          </div>

          {/* Store Filter */}
          <select
            value={filterStore}
            onChange={(e) => {
              setFilterStore(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full md:w-64"
          >
            <option value="all">Semua Toko</option>
            {stores.filter(s => s.isActive).map(store => (
              <option key={store.id} value={store.id}>
                {store.shopName} ({store.platform})
              </option>
            ))}
          </select>

          {/* Per Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Per halaman:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="input w-20"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <button 
            onClick={handleSelectAll}
            className="text-primary hover:underline text-sm"
          >
            {selectedProducts.length === paginatedProducts.length ? 'Batal Pilih' : 'Pilih Halaman Ini'}
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => setSelectedProducts([])}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Batal Pilih ({selectedProducts.length})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input 
                    type="checkbox"
                    checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Toko</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <Package className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">Tidak ada produk yang cocok dengan pencarian.</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <React.Fragment key={product.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="text-gray-400" size={20} />
                            </div>
                          )}
                          <div>
                            <div 
                              className={`font-medium text-gray-900 line-clamp-2 ${product.hasVariants ? 'cursor-pointer hover:text-primary flex items-center gap-1' : ''}`}
                              onClick={() => {
                                if (product.hasVariants) {
                                  setExpandedProducts(prev => 
                                    prev.includes(product.id) 
                                      ? prev.filter(id => id !== product.id)
                                      : [...prev, product.id]
                                  );
                                }
                              }}
                            >
                              {product.hasVariants && (
                                expandedProducts.includes(product.id) 
                                  ? <ChevronDown size={16} className="text-primary flex-shrink-0" />
                                  : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                              )}
                              {product.name}
                              {product.hasVariants && (
                                <span className="ml-1 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                                  {product.variants?.length} varian
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">ID: {product.shopeeItemId || product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono">{product.sku || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getPlatformBadge(product)}
                          <span className="text-sm text-gray-600">{product.shopName || product.shop_name || '-'}</span>
                        </div>
                      </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">
                        Rp {(product.price || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {product.imported || product.isImported ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                          <Check size={14} />
                          Diimpor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                          <Clock size={14} />
                          Belum
                        </span>
                      )}
                    </td>
                    </tr>
                    {/* Expanded variants rows */}
                    {product.hasVariants && expandedProducts.includes(product.id) && product.variants?.map((variant, idx) => (
                      <tr key={`${product.id}-var-${idx}`} className="bg-blue-50/50">
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 pl-12">
                          <div className="flex items-center gap-3">
                            {/* Variant image - use variant image or fallback to parent product image */}
                            {(variant.image || product.image) ? (
                              <img 
                                src={variant.image || product.image} 
                                alt={variant.name}
                                className="w-10 h-10 object-cover rounded-lg border border-blue-200"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center border border-blue-200">
                                <Package className="text-blue-400" size={16} />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span className="text-sm text-gray-700 font-medium">{variant.name || `Varian ${idx + 1}`}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-sm font-mono text-gray-600">{variant.sku || '-'}</span>
                        </td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-sm font-medium text-gray-700">
                            Rp {(variant.price || 0).toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className={`text-sm font-medium ${variant.stock === 0 ? 'text-red-600' : variant.stock < 10 ? 'text-orange-600' : 'text-gray-700'}`}>
                            {variant.stock || 0}
                          </span>
                        </td>
                        <td className="px-4 py-2"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-600">
              Menampilkan {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, filteredProducts.length)} dari {filteredProducts.length} produk
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary btn-sm disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="px-3 py-1 text-sm">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary btn-sm disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
