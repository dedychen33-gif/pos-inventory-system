import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Search, ShoppingCart, RefreshCw, Package, Store,
  Filter, Eye, Check, Clock, AlertCircle, Truck, XCircle, Trash2, ExternalLink
} from 'lucide-react';
import { useTransactionStore } from '../store/transactionStore';
import { useMarketplaceStore, PLATFORM_INFO } from '../store/marketplaceStore';
import { shopeeApi } from '../services/marketplaceApi';

export default function MarketplaceOrders() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const { transactions, addTransaction, updateTransaction, clearMarketplaceTransactions } = useTransactionStore();
  const { stores, shopeeConfig } = useMarketplaceStore();

  // Filter marketplace orders only
  const marketplaceOrders = useMemo(() => {
    return transactions.filter(t => 
      t.source === 'shopee' || 
      t.source === 'lazada' || 
      t.source === 'tokopedia' || 
      t.source === 'tiktok' ||
      t.marketplaceSource
    );
  }, [transactions]);

  // Apply filters
  const filteredOrders = useMemo(() => {
    return marketplaceOrders.filter(order => {
      const matchSearch = !searchTerm || 
        order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.transactionCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStore = filterStore === 'all';
      if (!matchStore && filterStore !== 'all') {
        const selectedStore = stores.find(s => s.id === parseInt(filterStore));
        if (selectedStore) {
          matchStore = order.source === selectedStore.platform ||
            order.marketplaceStoreId === selectedStore.id;
        }
      }

      // Status filter matching Shopee tabs
      let matchStatus = filterStatus === 'all';
      if (!matchStatus) {
        if (filterStatus === 'unpaid') {
          matchStatus = order.status === 'pending' || order.shopeeStatus === 'UNPAID';
        } else if (filterStatus === 'ready_to_ship') {
          matchStatus = order.status === 'ready_to_ship' || order.shopeeStatus === 'READY_TO_SHIP' || order.shopeeStatus === 'PROCESSED';
        } else if (filterStatus === 'shipped') {
          matchStatus = order.status === 'shipped' || order.shopeeStatus === 'SHIPPED';
        } else if (filterStatus === 'completed') {
          matchStatus = order.status === 'completed' || order.shopeeStatus === 'COMPLETED';
        } else if (filterStatus === 'cancelled') {
          // Include both cancellation and return orders
          matchStatus = order.status === 'cancelled' || 
            order.status === 'return' ||
            order.shopeeStatus === 'CANCELLED' || 
            order.shopeeStatus === 'IN_CANCEL' ||
            order.shopeeStatus === 'TO_RETURN' ||
            order.shopeeStatus === 'RETURN';
        } else {
          matchStatus = order.status === filterStatus;
        }
      }

      return matchSearch && matchStore && matchStatus;
    });
  }, [marketplaceOrders, searchTerm, filterStore, filterStatus, stores]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // Stats - Debug log for status checking
  console.log('All marketplace orders status:', marketplaceOrders.map(o => ({ 
    id: o.shopeeOrderId || o.id, 
    status: o.status, 
    shopeeStatus: o.shopeeStatus 
  })).slice(0, 10));
  
  const totalOrderCount = marketplaceOrders.length;
  const unpaidCount = marketplaceOrders.filter(o => o.status === 'pending' || o.shopeeStatus === 'UNPAID').length;
  const readyToShipCount = marketplaceOrders.filter(o => o.status === 'ready_to_ship' || o.status === 'processing' || o.shopeeStatus === 'READY_TO_SHIP' || o.shopeeStatus === 'PROCESSED').length;
  const shippedCount = marketplaceOrders.filter(o => o.status === 'shipped' || o.shopeeStatus === 'SHIPPED').length;
  const completedCount = marketplaceOrders.filter(o => o.status === 'completed' || o.shopeeStatus === 'COMPLETED').length;
  const cancelledCount = marketplaceOrders.filter(o => 
    o.status === 'cancelled' || 
    o.status === 'return' ||
    o.shopeeStatus === 'CANCELLED' || 
    o.shopeeStatus === 'IN_CANCEL' ||
    o.shopeeStatus === 'TO_RETURN' ||
    o.shopeeStatus === 'RETURN'
  ).length;
  const totalRevenue = marketplaceOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Tab filter options matching Shopee Seller
  const statusTabs = [
    { key: 'all', label: 'Semua', count: totalOrderCount },
    { key: 'unpaid', label: 'Belum Bayar', count: unpaidCount },
    { key: 'ready_to_ship', label: 'Perlu Dikirim', count: readyToShipCount },
    { key: 'shipped', label: 'Dikirim', count: shippedCount },
    { key: 'completed', label: 'Selesai', count: completedCount },
    { key: 'cancelled', label: 'Pengembalian/Pembatalan', count: cancelledCount },
  ];

  // Handle sync - using Vercel API
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Menyinkronkan pesanan...');
    
    try {
      // Get active Shopee stores
      const shopeeStores = stores.filter(s => s.platform === 'shopee' && s.isActive && s.isConnected);
      
      if (shopeeStores.length === 0) {
        setSyncMessage('Tidak ada toko Shopee yang aktif');
        alert('Tidak ada toko Shopee yang terhubung. Silakan hubungkan toko dulu.');
        setIsSyncing(false);
        return;
      }
      
      let totalOrders = 0;
      let totalUpdated = 0;
      const errors = [];
      
      for (const store of shopeeStores) {
        try {
          console.log(`Syncing orders from ${store.shopName} (${store.platform})...`);
          
          // Use shopeeApi.syncOrders() - same pattern as products
          const result = await shopeeApi.syncOrders(store);
          
          console.log('Shopee syncOrders result:', result);
          console.log('Orders count:', result.data?.length);
          if (result.data?.[0]) {
            console.log('First order ALL FIELDS:', JSON.stringify(result.data[0], null, 2));
            console.log('Order keys:', Object.keys(result.data[0]));
          }
          
          if (result.success && result.data && result.data.length > 0) {
            // Process each order
            for (const order of result.data) {
              // Get current transactions (fresh state)
              const currentTransactions = useTransactionStore.getState().transactions;
              const existingOrder = currentTransactions.find(t => 
                t.id === order.order_sn || 
                t.transactionCode === order.order_sn ||
                t.shopeeOrderId === order.order_sn
              );
              
              // Map Shopee order status to local status
              const statusMap = {
                'UNPAID': 'pending',
                'READY_TO_SHIP': 'ready_to_ship',
                'PROCESSED': 'processing',
                'SHIPPED': 'shipped',
                'COMPLETED': 'completed',
                'IN_CANCEL': 'cancelled',
                'CANCELLED': 'cancelled',
                'INVOICE_PENDING': 'pending'
              };
              
              const orderData = {
                id: order.order_sn,
                transactionCode: order.order_sn, // Use original Shopee order_sn, no TRX prefix
                shopeeOrderId: order.order_sn,
                source: 'shopee',
                marketplaceSource: 'shopee',
                marketplaceStoreId: store.id,
                storeName: store.shopName,
                customer: order.buyer_username || order.buyer_user_id || 'Pembeli Shopee',
                // Parse total amount - Shopee returns in cents for some regions
                total: order.total_amount || order.escrow_amount || order.actual_shipping_fee || 0,
                subtotal: order.total_amount || 0,
                shippingFee: order.actual_shipping_fee || order.estimated_shipping_fee || 0,
                status: statusMap[order.order_status] || order.order_status?.toLowerCase() || 'pending',
                shopeeStatus: order.order_status,
                date: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
                paymentMethod: order.payment_method || 'Shopee',
                items: order.item_list?.map(item => ({
                  name: item.item_name,
                  sku: item.item_sku || item.model_sku,
                  quantity: item.model_quantity_purchased || 1,
                  price: item.model_discounted_price || item.model_original_price || 0,
                  image: item.image_info?.image_url || ''
                })) || [],
                createdAt: new Date().toISOString()
              };
              
              if (!existingOrder) {
                addTransaction(orderData);
                totalOrders++;
              } else {
                // Update existing order with fresh data
                updateTransaction(existingOrder.id, orderData);
                totalUpdated++;
              }
            }
          }
        } catch (storeError) {
          console.error(`Error syncing orders from ${store.shopName}:`, storeError);
          errors.push(`${store.shopName}: ${storeError.message}`);
        }
      }
      
      // Show summary
      const messages = [];
      if (totalOrders > 0) messages.push(`${totalOrders} pesanan baru`);
      if (totalUpdated > 0) messages.push(`${totalUpdated} pesanan diperbarui`);
      
      if (messages.length > 0) {
        setSyncMessage(`Berhasil: ${messages.join(', ')}`);
        alert(`Sinkronisasi berhasil!\n${messages.join('\n')}`);
      } else if (errors.length > 0) {
        setSyncMessage('Sync selesai dengan error');
        alert(`Sinkronisasi selesai dengan error:\n${errors.join('\n')}`);
      } else {
        setSyncMessage('Tidak ada pesanan baru');
        alert('Sinkronisasi selesai. Tidak ada pesanan baru.');
      }
    } catch (error) {
      setSyncMessage('Gagal sinkronisasi: ' + error.message);
      alert('Gagal sinkronisasi: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle re-sync (clear all marketplace orders and sync fresh)
  const handleResync = async () => {
    if (!confirm('Hapus semua data pesanan marketplace dan sync ulang dari Shopee?\n\nIni akan menghapus semua pesanan marketplace yang tersimpan lokal.')) {
      return;
    }
    
    // Clear all marketplace transactions
    clearMarketplaceTransactions();
    setSyncMessage('Data pesanan marketplace dihapus. Memulai sync ulang...');
    
    // Wait a bit then start fresh sync
    setTimeout(() => {
      handleSync();
    }, 500);
  };

  const getStatusBadge = (status, shopeeStatus) => {
    // Use shopeeStatus if available for more accurate display
    const displayStatus = shopeeStatus || status;
    
    const styles = {
      // Local status
      pending: 'bg-yellow-100 text-yellow-800',
      ready_to_ship: 'bg-orange-100 text-orange-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      void: 'bg-gray-100 text-gray-800',
      return: 'bg-pink-100 text-pink-800',
      // Shopee status (uppercase)
      UNPAID: 'bg-yellow-100 text-yellow-800',
      READY_TO_SHIP: 'bg-orange-100 text-orange-800',
      PROCESSED: 'bg-blue-100 text-blue-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-red-100 text-red-800',
      IN_CANCEL: 'bg-red-100 text-red-800',
      TO_RETURN: 'bg-pink-100 text-pink-800',
      RETURN: 'bg-pink-100 text-pink-800',
    };
    const labels = {
      // Local status - matching Shopee Seller labels
      pending: 'Belum Bayar',
      ready_to_ship: 'Perlu Dikirim',
      processing: 'Diproses',
      shipped: 'Sudah Kirim',
      completed: 'Pesanan Diterima',
      cancelled: 'Dibatalkan',
      void: 'Void',
      return: 'Pengembalian',
      // Shopee status (uppercase) - matching Shopee Seller labels
      UNPAID: 'Belum Bayar',
      READY_TO_SHIP: 'Perlu Dikirim',
      PROCESSED: 'Diproses',
      SHIPPED: 'Sudah Kirim',
      COMPLETED: 'Pesanan Diterima',
      CANCELLED: 'Dibatalkan',
      IN_CANCEL: 'Dalam Pembatalan',
      TO_RETURN: 'Pengajuan Pengembalian',
      RETURN: 'Pengembalian',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[displayStatus] || 'bg-gray-100 text-gray-800'}`}>
        {labels[displayStatus] || displayStatus}
      </span>
    );
  };

  const getPlatformBadge = (source) => {
    const platformInfo = PLATFORM_INFO[source] || PLATFORM_INFO.manual;
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
            <h1 className="text-2xl font-bold text-gray-900">Pesanan Marketplace</h1>
            <p className="text-gray-600">Kelola pesanan dari semua toko</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleResync}
            disabled={isSyncing}
            className="btn btn-outline flex items-center gap-2 text-sm"
            title="Hapus semua data pesanan marketplace dan sync ulang"
          >
            <Trash2 size={18} />
            Re-Sync
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn btn-success flex items-center gap-2"
          >
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            Sync Pesanan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <ShoppingCart className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Pesanan</p>
            <p className="text-2xl font-bold">{totalOrderCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Package className="text-orange-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Perlu Dikirim</p>
            <p className="text-2xl font-bold">{readyToShipCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <Check className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Selesai</p>
            <p className="text-2xl font-bold">{completedCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Store className="text-purple-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Pendapatan</p>
            <p className="text-xl font-bold">Rp {totalRevenue.toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Status Tabs - Like Shopee Seller */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex overflow-x-auto border-b">
          {statusTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                setFilterStatus(tab.key);
                setCurrentPage(1);
              }}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                filterStatus === tab.key
                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filterStatus === tab.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nomor pesanan..."
              className="w-full pl-10 input"
            />
          </div>

          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={20} />
          </div>

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
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">Tidak ada pesanan marketplace.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {order.shopeeOrderId || order.transactionCode || order.id}
                        </p>
                        {order.source === 'shopee' && order.shopeeOrderId && (
                          <a 
                            href={`https://seller.shopee.co.id/portal/sale/order/${order.shopeeOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-orange-500 hover:text-orange-700 flex items-center gap-1 mt-1"
                          >
                            <ExternalLink size={12} />
                            Buka di Shopee
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">
                        {new Date(order.date).toLocaleDateString('id-ID')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {getPlatformBadge(order.source)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">
                        {typeof order.customer === 'string' ? order.customer : (order.customer?.name || order.buyerUsername || '-')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-1">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-gray-700">
                                <span className="font-medium">{item.name || item.item_name || '-'}</span>
                                <span className="text-gray-500 ml-1">
                                  x{item.quantity || item.model_quantity_purchased || 1}
                                </span>
                                {(item.sku || item.item_sku || item.model_sku) && (
                                  <span className="text-gray-400 text-xs ml-1">
                                    ({item.sku || item.item_sku || item.model_sku})
                                  </span>
                                )}
                              </div>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-gray-400 text-xs">+{order.items.length - 2} produk lainnya</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">
                        Rp {(order.total || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(order.status, order.shopeeStatus)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          className="text-primary hover:text-blue-700"
                          title="Lihat detail"
                        >
                          <Eye size={18} />
                        </button>
                        {order.source === 'shopee' && order.shopeeOrderId && (
                          <a 
                            href={`https://seller.shopee.co.id/portal/sale/order/${order.shopeeOrderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-500 hover:text-orange-700"
                            title="Buka di Shopee Seller"
                          >
                            <ExternalLink size={18} />
                          </a>
                        )}
                      </div>
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
              Menampilkan {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, filteredOrders.length)} dari {filteredOrders.length} pesanan
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
