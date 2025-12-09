import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Search, ShoppingCart, RefreshCw, Package, Store,
  Filter, Eye, Check, Clock, AlertCircle, Truck, XCircle
} from 'lucide-react';
import { useTransactionStore } from '../store/transactionStore';
import { useMarketplaceStore, PLATFORM_INFO } from '../store/marketplaceStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'https://naydyhkqodppdhzwkctr.supabase.co/functions/v1';

export default function MarketplaceOrders() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const { transactions, addTransaction } = useTransactionStore();
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
        order.transactionCode?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStore = filterStore === 'all';
      if (!matchStore && filterStore !== 'all') {
        const selectedStore = stores.find(s => s.id === parseInt(filterStore));
        if (selectedStore) {
          matchStore = order.source === selectedStore.platform ||
            order.marketplaceStoreId === selectedStore.id;
        }
      }

      const matchStatus = filterStatus === 'all' || order.status === filterStatus;

      return matchSearch && matchStore && matchStatus;
    });
  }, [marketplaceOrders, searchTerm, filterStore, filterStatus, stores]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / perPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // Stats
  const totalOrderCount = marketplaceOrders.length;
  const pendingCount = marketplaceOrders.filter(o => o.status === 'pending').length;
  const completedCount = marketplaceOrders.filter(o => o.status === 'completed').length;
  const totalRevenue = marketplaceOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Handle sync - real API call
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Menyinkronkan pesanan...');
    
    try {
      // Get active Shopee stores
      const shopeeStores = stores.filter(s => s.platform === 'shopee' && s.isActive);
      
      if (shopeeStores.length === 0) {
        setSyncMessage('Tidak ada toko Shopee yang aktif');
        alert('Tidak ada toko Shopee yang aktif. Silakan hubungkan toko dulu.');
        return;
      }
      
      let totalOrders = 0;
      
      for (const store of shopeeStores) {
        try {
          // Get credentials from store object
          const partnerId = store.credentials?.partnerId || store.partnerId;
          const partnerKey = store.credentials?.partnerKey || store.partnerKey;
          const accessToken = store.credentials?.accessToken || store.accessToken;
          const shopId = store.shopId;
          
          console.log('Syncing store:', store.shopName, 'Shop ID:', shopId, 'Has credentials:', !!partnerId, !!partnerKey, !!accessToken);
          
          if (!partnerId || !partnerKey || !accessToken) {
            console.warn(`Missing credentials for ${store.shopName}. Please reconnect the store.`);
            continue;
          }
          
          // Call Supabase Edge Function for orders
          const { data, error } = await supabase.functions.invoke('shopee-api', {
            body: {
              action: 'getOrders',
              shopId: shopId?.toString(),
              accessToken: accessToken,
              partnerId: partnerId?.toString(),
              partnerKey: partnerKey
            }
          });
          
          console.log('Sync result for', store.shopName, ':', data, error);
          
          if (error) {
            console.error(`Error syncing ${store.shopName}:`, error);
            continue;
          }
          
          if (data?.orders) {
            // Add orders to transaction store
            data.orders.forEach(order => {
              const existingOrder = transactions.find(t => t.id === order.order_sn || t.transactionCode === order.order_sn);
              if (!existingOrder) {
                addTransaction({
                  id: order.order_sn,
                  transactionCode: order.order_sn,
                  source: 'shopee',
                  marketplaceSource: 'shopee',
                  marketplaceStoreId: store.id,
                  storeName: store.shopName,
                  customer: order.buyer_username || 'Pembeli Shopee',
                  total: order.total_amount || 0,
                  status: order.order_status?.toLowerCase() || 'pending',
                  date: order.create_time ? new Date(order.create_time * 1000).toISOString() : new Date().toISOString(),
                  items: order.item_list || []
                });
                totalOrders++;
              }
            });
          }
        } catch (storeError) {
          console.error(`Error syncing store ${store.shopName}:`, storeError);
        }
      }
      
      setSyncMessage(`Berhasil sync ${totalOrders} pesanan baru!`);
      alert(`Sinkronisasi pesanan berhasil! ${totalOrders} pesanan baru.`);
    } catch (error) {
      setSyncMessage('Gagal sinkronisasi: ' + error.message);
      alert('Gagal sinkronisasi: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      void: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      pending: 'Menunggu',
      processing: 'Diproses',
      shipped: 'Dikirim',
      completed: 'Selesai',
      cancelled: 'Dibatalkan',
      void: 'Void',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
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
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn-success flex items-center gap-2"
        >
          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          Sync Pesanan
        </button>
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
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="text-yellow-600" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-600">Menunggu</p>
            <p className="text-2xl font-bold">{pendingCount}</p>
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

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="input w-full md:w-48"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="processing">Diproses</option>
            <option value="shipped">Dikirim</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <ShoppingCart className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">Tidak ada pesanan marketplace.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.transactionCode || order.id}</p>
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
                      <p className="text-sm text-gray-900">{order.customer?.name || '-'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">
                        Rp {(order.total || 0).toLocaleString('id-ID')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-primary hover:text-blue-700">
                        <Eye size={18} />
                      </button>
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
