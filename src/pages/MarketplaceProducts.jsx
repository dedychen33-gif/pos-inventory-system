import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Search, Package, RefreshCw, Download, Check, Store,
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
            const productsToAdd = result.data.map(item => ({
              id: Date.now() + Math.random(),
              code: `MKT${item.item_id || item.id || Date.now()}`,
              sku: item.item_sku || item.sku || '',
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
              shopeeItemId: item.item_id,
              marketplaceStoreId: store.id,
              imported: false,
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }));

            // Add or update each product
            for (const product of productsToAdd) {
              const existingProduct = products.find(p => 
                (p.shopeeItemId && p.shopeeItemId === product.shopeeItemId) ||
                (p.source === store.platform && p.sku && product.sku && p.sku === product.sku)
              );
              
              if (existingProduct) {
                // Update existing product with new data from marketplace
                updateProduct(existingProduct.id, {
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                  image: product.image || existingProduct.image,
                  updatedAt: product.updatedAt
                });
                totalUpdated++;
              } else {
                addProduct(product);
                totalSynced++;
              }
            }

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
      if (totalSynced > 0) messages.push(`${totalSynced} produk baru ditambahkan`);
      if (totalUpdated > 0) messages.push(`${totalUpdated} produk diperbarui`);
      
      if (messages.length > 0) {
        alert(`Sinkronisasi berhasil!\n${messages.join('\n')}`);
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
                  <tr key={product.id} className="hover:bg-gray-50">
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
                          <p className="font-medium text-gray-900 line-clamp-2">{product.name}</p>
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
