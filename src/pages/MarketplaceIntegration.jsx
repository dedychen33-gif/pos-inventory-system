import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, Plus, Settings, Trash2, RefreshCw, Link2, Link2Off, Search,
  ExternalLink, Edit2, MoreHorizontal, Check, X, AlertCircle, Eye,
  Package, ShoppingCart, Clock, Filter, ChevronDown, Loader2, Wifi, WifiOff,
  Download, Upload, ArrowRight, CheckCircle, XCircle, Info, Play, Zap
} from 'lucide-react';
import { useMarketplaceStore, PLATFORM_INFO, MARKETPLACE_PLATFORMS } from '../store/marketplaceStore';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { marketplaceService } from '../services/marketplaceApi';

export default function MarketplaceIntegration() {
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [syncingStoreId, setSyncingStoreId] = useState(null);
  const [connectingStoreId, setConnectingStoreId] = useState(null);

  const { user } = useAuthStore();
  const { importShopeeProducts } = useProductStore();
  const { 
    stores, 
    addStore, 
    updateStore, 
    removeStore, 
    toggleStoreActive,
    updateStoreSync,
    updateStoreCredentials,
    getSummary 
  } = useMarketplaceStore();

  const summary = getSummary();

  // Filter stores
  const filteredStores = stores.filter(store => {
    const matchSearch = store.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       store.shopId?.includes(searchTerm) ||
                       store.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPlatform = filterPlatform === 'all' || store.platform === filterPlatform;
    return matchSearch && matchPlatform;
  });

  const handleDeleteStore = (store) => {
    if (!confirm(`Hapus toko "${store.shopName}"?\n\nData integrasi akan dihapus permanen.`)) return;
    
    const result = removeStore(store.id);
    if (result.success) {
      setMessage({ type: 'success', text: 'Toko berhasil dihapus' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const handleToggleActive = (store) => {
    toggleStoreActive(store.id);
  };

  const handleEditStore = (store) => {
    setSelectedStore(store);
    setShowEditModal(true);
  };

  // Handle OAuth Connect
  const handleConnect = async (store) => {
    if (store.platform === 'manual') {
      setMessage({ type: 'info', text: 'Toko manual tidak memerlukan koneksi OAuth' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    // Check if credentials are configured
    if (store.platform === 'shopee' && !store.credentials?.partnerId) {
      setMessage({ 
        type: 'warning', 
        text: 'Partner ID belum dikonfigurasi. Klik Edit untuk memasukkan kredensial Shopee.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    if ((store.platform === 'lazada' || store.platform === 'tiktok') && !store.credentials?.appKey) {
      setMessage({ 
        type: 'warning', 
        text: 'App Key belum dikonfigurasi. Klik Edit untuk memasukkan kredensial.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    if (store.platform === 'tokopedia' && !store.credentials?.clientId) {
      setMessage({ 
        type: 'warning', 
        text: 'Client ID belum dikonfigurasi. Klik Edit untuk memasukkan kredensial Tokopedia.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setConnectingStoreId(store.id);
    try {
      const result = await marketplaceService.getAuthUrl(store);
      if (result.url) {
        // Save pending OAuth info to localStorage before redirecting
        localStorage.setItem('pendingOAuthStoreId', store.id.toString());
        localStorage.setItem('pendingOAuthPlatform', store.platform);
        
        // Redirect to OAuth URL in the same window for better callback handling
        window.location.href = result.url;
        setMessage({ 
          type: 'info', 
          text: 'Mengalihkan ke halaman otorisasi...' 
        });
      } else {
        throw new Error('Gagal mendapatkan URL otorisasi');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Gagal koneksi: ${error.message}` });
    } finally {
      setConnectingStoreId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async (store) => {
    if (store.platform === 'manual') {
      setMessage({ type: 'success', text: 'Toko manual selalu tersedia' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!store.credentials?.accessToken) {
      setMessage({ type: 'warning', text: 'Belum ada access token. Hubungkan toko terlebih dahulu.' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    setConnectingStoreId(store.id);
    try {
      const result = await marketplaceService.testConnection(store);
      if (result.success) {
        updateStore(store.id, { isConnected: true });
        setMessage({ type: 'success', text: `Koneksi ke ${store.shopName} berhasil!` });
      } else {
        updateStore(store.id, { isConnected: false });
        setMessage({ type: 'error', text: `Koneksi gagal: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Gagal test koneksi: ${error.message}` });
    } finally {
      setConnectingStoreId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  // Handle Sync Single Store
  const handleSyncStore = async (store) => {
    if (store.platform === 'manual') {
      setMessage({ type: 'info', text: 'Toko manual tidak memerlukan sinkronisasi' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    if (!store.credentials?.accessToken) {
      setMessage({ 
        type: 'warning', 
        text: 'Belum ada access token. Klik ikon WiFi untuk menghubungkan toko terlebih dahulu.' 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return;
    }

    setSyncingStoreId(store.id);
    setMessage({ type: 'info', text: `Menyinkronkan ${store.shopName}...` });
    
    try {
      const result = await marketplaceService.fullSync(store);
      
      // Import products to local productStore if Shopee
      let importResult = null;
      if (store.platform === 'shopee' && result.results?.products?.data?.length > 0) {
        importResult = importShopeeProducts(result.results.products.data);
        console.log('Import result:', importResult);
      }
      
      // Update store sync data
      updateStoreSync(store.id, {
        productCount: result.results?.products?.count || 0,
        orderCount: result.results?.orders?.count || 0
      });

      if (result.success) {
        let successMsg = `✓ Sync ${store.shopName} berhasil! Produk: ${result.results?.products?.count || 0}, Order: ${result.results?.orders?.count || 0}`;
        if (importResult) {
          successMsg += ` | Diimpor: ${importResult.imported}, Diupdate: ${importResult.updated}, Dilewati: ${importResult.skipped}`;
        }
        setMessage({ type: 'success', text: successMsg });
      } else {
        const prodErr = result.results?.products?.error;
        const orderErr = result.results?.orders?.error;
        setMessage({ 
          type: 'error', 
          text: `Sync gagal: ${prodErr || orderErr || 'Unknown error'}` 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Gagal sync: ${error.message}` });
    } finally {
      setSyncingStoreId(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 8000);
    }
  };

  // Handle Sync All Stores
  const handleSyncAll = () => {
    setShowSyncModal(true);
  };

  // Handle show guide
  const handleShowGuide = (platform) => {
    setSelectedStore({ platform });
    setShowGuideModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integrasi Marketplace</h1>
          <p className="text-gray-600 mt-1">Kelola semua toko marketplace Anda dalam satu tempat</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/marketplace/products')}
            className="btn btn-outline inline-flex items-center gap-2"
          >
            <Package size={18} />
            Lihat Produk
          </button>
          <button
            onClick={() => navigate('/marketplace/orders')}
            className="btn btn-outline inline-flex items-center gap-2"
          >
            <ShoppingCart size={18} />
            Lihat Pesanan
          </button>
          <button
            onClick={handleSyncAll}
            className="btn btn-outline inline-flex items-center gap-2"
            disabled={stores.filter(s => s.isActive && s.platform !== 'manual').length === 0}
          >
            <RefreshCw size={18} />
            Sync Semua
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Tambah Toko
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
          message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Store className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalStores}</p>
              <p className="text-sm text-gray-500">Total Toko</p>
            </div>
          </div>
        </div>
        
        {Object.entries(PLATFORM_INFO).map(([key, info]) => (
          <div 
            key={key} 
            className={`bg-white rounded-xl p-4 shadow-sm border ${info.borderColor} cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => handleShowGuide(key)}
            title={`Klik untuk panduan setup ${info.name}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${info.bgLight} rounded-lg flex items-center justify-center text-xl`}>
                {info.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${info.textColor}`}>{summary.byPlatform[key] || 0}</p>
                <p className="text-sm text-gray-500">{info.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari toko..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Platform</option>
            {Object.entries(PLATFORM_INFO).map(([key, info]) => (
              <option key={key} value={key}>{info.icon} {info.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marketplace</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Toko</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Toko</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                    <Store className="mx-auto mb-3 text-gray-300" size={48} />
                    <p className="font-medium">Belum ada toko terdaftar</p>
                    <p className="text-sm">Klik "Tambah Toko" untuk memulai integrasi</p>
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  const platformInfo = PLATFORM_INFO[store.platform] || PLATFORM_INFO.manual;
                  const isSyncing = syncingStoreId === store.id;
                  const isConnecting = connectingStoreId === store.id;
                  return (
                    <tr key={store.id} className={!store.isActive ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${platformInfo.bgLight} ${platformInfo.textColor}`}>
                            <span>{platformInfo.icon}</span>
                            {platformInfo.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">{store.shopName}</p>
                        {store.ownerName && <p className="text-xs text-gray-500">{store.ownerName}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{store.shopId || '-'}</code>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-medium">{store.productCount || 0}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {store.platform === 'manual' ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 text-sm">
                              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                              Manual
                            </span>
                          ) : store.isConnected ? (
                            <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              Terhubung
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                              Belum Terhubung
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(store.lastSync)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Sync Button */}
                          {store.platform !== 'manual' && (
                            <button
                              onClick={() => handleSyncStore(store)}
                              disabled={isSyncing || !store.isActive}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Sync Data"
                            >
                              {isSyncing ? (
                                <Loader2 size={16} className="text-green-600 animate-spin" />
                              ) : (
                                <RefreshCw size={16} className="text-green-600" />
                              )}
                            </button>
                          )}
                          {/* Connect Button */}
                          {store.platform !== 'manual' && !store.isConnected && (
                            <button
                              onClick={() => handleConnect(store)}
                              disabled={isConnecting}
                              className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Hubungkan Toko"
                            >
                              {isConnecting ? (
                                <Loader2 size={16} className="text-purple-600 animate-spin" />
                              ) : (
                                <Wifi size={16} className="text-purple-600" />
                              )}
                            </button>
                          )}
                          {/* Test Connection */}
                          {store.platform !== 'manual' && store.isConnected && (
                            <button
                              onClick={() => handleTestConnection(store)}
                              disabled={isConnecting}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Test Koneksi"
                            >
                              <Zap size={16} className="text-blue-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditStore(store)}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Toko"
                          >
                            <Edit2 size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(store)}
                            className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                            title={store.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            {store.isActive ? (
                              <Link2Off size={16} className="text-yellow-600" />
                            ) : (
                              <Link2 size={16} className="text-green-600" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteStore(store)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Toko"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        {filteredStores.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-500">
            Menampilkan {filteredStores.length} dari {stores.length} toko
          </div>
        )}
      </div>

      {/* Add Store Modal */}
      {showAddModal && (
        <AddStoreModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            setMessage({ type: 'success', text: msg });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          }}
          userId={user?.id}
        />
      )}

      {/* Edit Store Modal */}
      {showEditModal && selectedStore && (
        <EditStoreModal
          store={selectedStore}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStore(null);
          }}
          onSuccess={(msg) => {
            setMessage({ type: 'success', text: msg });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          }}
        />
      )}

      {/* Sync All Modal */}
      {showSyncModal && (
        <SyncAllModal
          stores={stores}
          onClose={() => setShowSyncModal(false)}
          onComplete={(results) => {
            const successCount = results.filter(r => r.success).length;
            setMessage({ 
              type: successCount > 0 ? 'success' : 'error', 
              text: `Sync selesai: ${successCount}/${results.length} toko berhasil` 
            });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
          }}
          updateStoreSync={updateStoreSync}
        />
      )}

      {/* Setup Guide Modal */}
      {showGuideModal && selectedStore && (
        <SetupGuideModal
          platform={selectedStore.platform}
          onClose={() => {
            setShowGuideModal(false);
            setSelectedStore(null);
          }}
        />
      )}
    </div>
  );
}

// Add Store Modal Component
function AddStoreModal({ onClose, onSuccess, userId }) {
  const { addStore } = useMarketplaceStore();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState({
    shopName: '',
    shopId: '',
    ownerName: '',
    partnerId: '',
    partnerKey: '',
    accessToken: '',
    refreshToken: '',
    appKey: '',
    appSecret: '',
    fsId: '',
    clientId: '',
    clientSecret: '',
    notes: ''
  });
  const [error, setError] = useState('');

  const handleSelectPlatform = (platform) => {
    setSelectedPlatform(platform);
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.shopName.trim()) {
      setError('Nama toko harus diisi');
      return;
    }

    const result = addStore({
      platform: selectedPlatform,
      shopName: formData.shopName.trim(),
      shopId: formData.shopId.trim(),
      ownerName: formData.ownerName.trim(),
      partnerId: formData.partnerId,
      partnerKey: formData.partnerKey,
      accessToken: formData.accessToken,
      refreshToken: formData.refreshToken,
      appKey: formData.appKey,
      appSecret: formData.appSecret,
      fsId: formData.fsId,
      clientId: formData.clientId,
      clientSecret: formData.clientSecret,
      notes: formData.notes,
      userId: userId
    });

    if (!result.success) {
      setError(result.error);
      return;
    }

    onSuccess(`Toko "${formData.shopName}" berhasil ditambahkan`);
    onClose();
  };

  const renderCredentialFields = () => {
    switch (selectedPlatform) {
      case 'shopee':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Partner ID</label>
                <input
                  type="text"
                  value={formData.partnerId}
                  onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                  className="input"
                  placeholder="2014001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shop ID *</label>
                <input
                  type="text"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  className="input"
                  placeholder="669903315"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Partner Key</label>
              <input
                type="password"
                value={formData.partnerKey}
                onChange={(e) => setFormData({ ...formData, partnerKey: e.target.value })}
                className="input"
                placeholder="••••••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
                placeholder="Opsional - bisa diisi nanti"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Refresh Token</label>
              <input
                type="password"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                className="input"
                placeholder="Opsional - bisa diisi nanti"
              />
            </div>
          </>
        );
      
      case 'lazada':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
                placeholder="400626654256"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App Key</label>
                <input
                  type="text"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  className="input"
                  placeholder="App Key dari Lazada"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <input
                  type="password"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  className="input"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
                placeholder="Opsional"
              />
            </div>
          </>
        );
      
      case 'tokopedia':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
                placeholder="7494509580045224114"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">FS ID</label>
              <input
                type="text"
                value={formData.fsId}
                onChange={(e) => setFormData({ ...formData, fsId: e.target.value })}
                className="input"
                placeholder="Fulfillment Service ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="input"
                  placeholder="Client ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Secret</label>
                <input
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  className="input"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          </>
        );
      
      case 'tiktok':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
                placeholder="TikTok Shop ID"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App Key</label>
                <input
                  type="text"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  className="input"
                  placeholder="App Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <input
                  type="password"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  className="input"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
                placeholder="Opsional"
              />
            </div>
          </>
        );
      
      case 'manual':
        return (
          <div>
            <label className="block text-sm font-medium mb-1">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows="3"
              placeholder="Catatan untuk toko ini..."
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Plus className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tambah Toko Baru</h2>
              <p className="text-sm text-gray-500">
                {step === 1 ? 'Pilih platform marketplace' : `Konfigurasi ${PLATFORM_INFO[selectedPlatform]?.name}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-6">
          {step === 1 ? (
            // Step 1: Select Platform
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(PLATFORM_INFO).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPlatform(key)}
                  className={`p-4 rounded-xl border-2 hover:border-blue-500 transition-all flex flex-col items-center gap-2 ${info.borderColor} hover:shadow-md`}
                >
                  <span className="text-3xl">{info.icon}</span>
                  <span className={`font-semibold ${info.textColor}`}>{info.name}</span>
                </button>
              ))}
            </div>
          ) : (
            // Step 2: Configure Store
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {/* Platform Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${PLATFORM_INFO[selectedPlatform].bgLight} ${PLATFORM_INFO[selectedPlatform].textColor}`}>
                <span>{PLATFORM_INFO[selectedPlatform].icon}</span>
                <span className="font-medium">{PLATFORM_INFO[selectedPlatform].name}</span>
              </div>

              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">Nama Panggilan Toko *</label>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  className="input"
                  placeholder="Contoh: Toko Utama Shopee"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nama Pemilik</label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="input"
                  placeholder="Nama pemilik toko"
                />
              </div>

              {/* Platform-specific Fields */}
              {renderCredentialFields()}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 btn btn-secondary"
                >
                  Kembali
                </button>
                <button type="submit" className="flex-1 btn btn-primary">
                  Tambah Toko
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// Edit Store Modal Component
function EditStoreModal({ store, onClose, onSuccess }) {
  const { updateStore, updateStoreCredentials } = useMarketplaceStore();
  const platformInfo = PLATFORM_INFO[store.platform] || PLATFORM_INFO.manual;
  
  const [formData, setFormData] = useState({
    shopName: store.shopName || '',
    shopId: store.shopId || '',
    ownerName: store.ownerName || '',
    notes: store.notes || '',
    // Credentials
    partnerId: store.credentials?.partnerId || '',
    partnerKey: store.credentials?.partnerKey || '',
    accessToken: store.credentials?.accessToken || '',
    refreshToken: store.credentials?.refreshToken || '',
    appKey: store.credentials?.appKey || '',
    appSecret: store.credentials?.appSecret || '',
    fsId: store.credentials?.fsId || '',
    clientId: store.credentials?.clientId || '',
    clientSecret: store.credentials?.clientSecret || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.shopName.trim()) {
      setError('Nama toko harus diisi');
      return;
    }

    // Update store info
    updateStore(store.id, {
      shopName: formData.shopName.trim(),
      shopId: formData.shopId.trim(),
      ownerName: formData.ownerName.trim(),
      notes: formData.notes,
      credentials: {
        partnerId: formData.partnerId,
        partnerKey: formData.partnerKey,
        accessToken: formData.accessToken,
        refreshToken: formData.refreshToken,
        appKey: formData.appKey,
        appSecret: formData.appSecret,
        fsId: formData.fsId,
        clientId: formData.clientId,
        clientSecret: formData.clientSecret,
      }
    });

    onSuccess(`Toko "${formData.shopName}" berhasil diperbarui`);
    onClose();
  };

  const renderCredentialFields = () => {
    switch (store.platform) {
      case 'shopee':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Partner ID</label>
                <input
                  type="text"
                  value={formData.partnerId}
                  onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Shop ID</label>
                <input
                  type="text"
                  value={formData.shopId}
                  onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Partner Key</label>
              <input
                type="password"
                value={formData.partnerKey}
                onChange={(e) => setFormData({ ...formData, partnerKey: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Refresh Token</label>
              <input
                type="password"
                value={formData.refreshToken}
                onChange={(e) => setFormData({ ...formData, refreshToken: e.target.value })}
                className="input"
              />
            </div>
          </>
        );
      
      case 'lazada':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App Key</label>
                <input
                  type="text"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <input
                  type="password"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
              />
            </div>
          </>
        );
      
      case 'tokopedia':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">FS ID</label>
              <input
                type="text"
                value={formData.fsId}
                onChange={(e) => setFormData({ ...formData, fsId: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Secret</label>
                <input
                  type="password"
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  className="input"
                />
              </div>
            </div>
          </>
        );
      
      case 'tiktok':
        return (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Shop ID</label>
              <input
                type="text"
                value={formData.shopId}
                onChange={(e) => setFormData({ ...formData, shopId: e.target.value })}
                className="input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">App Key</label>
                <input
                  type="text"
                  value={formData.appKey}
                  onChange={(e) => setFormData({ ...formData, appKey: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">App Secret</label>
                <input
                  type="password"
                  value={formData.appSecret}
                  onChange={(e) => setFormData({ ...formData, appSecret: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Access Token</label>
              <input
                type="password"
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                className="input"
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${platformInfo.bgLight} rounded-lg flex items-center justify-center text-xl`}>
              {platformInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">Edit Toko</h2>
              <p className="text-sm text-gray-500">{platformInfo.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Nama Panggilan Toko *</label>
            <input
              type="text"
              value={formData.shopName}
              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nama Pemilik</label>
            <input
              type="text"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
              className="input"
            />
          </div>

          {renderCredentialFields()}

          <div>
            <label className="block text-sm font-medium mb-1">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows="2"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Batal
            </button>
            <button type="submit" className="flex-1 btn btn-primary">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sync All Stores Modal
function SyncAllModal({ stores, onClose, onComplete, updateStoreSync }) {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, store: '', status: '' });
  const [results, setResults] = useState([]);
  const [completed, setCompleted] = useState(false);

  const activeStores = stores.filter(s => s.isActive && s.platform !== 'manual');

  const handleStartSync = async () => {
    setSyncing(true);
    setResults([]);
    
    const syncResults = await marketplaceService.syncAllStores(activeStores, (prog) => {
      setProgress(prog);
    });
    
    // Update each store's sync data
    syncResults.forEach(result => {
      if (result.success) {
        updateStoreSync(result.storeId, {
          productCount: result.results?.products?.count || 0,
          orderCount: result.results?.orders?.count || 0
        });
      }
    });
    
    setResults(syncResults);
    setCompleted(true);
    setSyncing(false);
    onComplete(syncResults);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Sinkronisasi Semua Toko</h2>
              <p className="text-sm text-gray-500">{activeStores.length} toko aktif</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {!syncing && !completed && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      Proses ini akan menyinkronkan produk dan pesanan dari semua toko marketplace yang aktif.
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Estimasi waktu: ~{activeStores.length * 30} detik
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Toko yang akan disinkronkan:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {activeStores.map(store => {
                    const platformInfo = PLATFORM_INFO[store.platform];
                    return (
                      <div key={store.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <span>{platformInfo?.icon}</span>
                        <span className="text-sm">{store.shopName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={onClose} className="flex-1 btn btn-secondary">
                  Batal
                </button>
                <button 
                  onClick={handleStartSync}
                  disabled={activeStores.length === 0}
                  className="flex-1 btn btn-primary inline-flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  Mulai Sync
                </button>
              </div>
            </>
          )}

          {syncing && (
            <div className="text-center py-8">
              <Loader2 size={48} className="mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-lg font-medium">Sinkronisasi berlangsung...</p>
              <p className="text-gray-500 mt-1">
                {progress.current}/{progress.total} - {progress.store}
              </p>
              <div className="mt-4 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2 transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {completed && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle size={48} className="mx-auto text-green-600 mb-2" />
                <p className="text-lg font-medium">Sinkronisasi Selesai!</p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, idx) => {
                  const platformInfo = PLATFORM_INFO[result.platform];
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.success ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{platformInfo?.icon}</span>
                        <span className="text-sm font-medium">{result.storeName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <>
                            <span className="text-xs text-gray-600">
                              {result.results?.products?.count || 0} produk, {result.results?.orders?.count || 0} order
                            </span>
                            <CheckCircle size={16} className="text-green-600" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-red-600">{result.error}</span>
                            <XCircle size={16} className="text-red-600" />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={onClose} className="w-full btn btn-primary">
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Setup Guide Modal
function SetupGuideModal({ platform, onClose }) {
  const platformInfo = PLATFORM_INFO[platform] || PLATFORM_INFO.manual;

  const guides = {
    shopee: {
      title: 'Cara Menghubungkan Shopee',
      steps: [
        {
          step: 1,
          title: 'Daftar Shopee Partner',
          description: 'Kunjungi https://partner.shopee.co.id dan daftar sebagai partner untuk mendapatkan Partner ID dan Partner Key.',
          link: 'https://partner.shopee.co.id'
        },
        {
          step: 2,
          title: 'Buat Aplikasi',
          description: 'Di dashboard partner, buat aplikasi baru dan catat App Key (Partner ID) dan App Secret (Partner Key).'
        },
        {
          step: 3,
          title: 'Masukkan Kredensial',
          description: 'Masukkan Partner ID, Shop ID, dan Partner Key di form tambah toko.'
        },
        {
          step: 4,
          title: 'Otorisasi Toko',
          description: 'Klik tombol "Hubungkan" untuk membuka halaman otorisasi Shopee dan izinkan akses ke toko Anda.'
        },
        {
          step: 5,
          title: 'Sync Data',
          description: 'Setelah terhubung, klik tombol sync untuk mengambil data produk dan pesanan dari Shopee.'
        }
      ]
    },
    lazada: {
      title: 'Cara Menghubungkan Lazada',
      steps: [
        {
          step: 1,
          title: 'Daftar Lazada Open Platform',
          description: 'Kunjungi https://open.lazada.com dan daftar sebagai developer.',
          link: 'https://open.lazada.com'
        },
        {
          step: 2,
          title: 'Buat Aplikasi',
          description: 'Buat aplikasi baru di dashboard dan dapatkan App Key dan App Secret.'
        },
        {
          step: 3,
          title: 'Masukkan Kredensial',
          description: 'Masukkan Shop ID, App Key, dan App Secret di form tambah toko.'
        },
        {
          step: 4,
          title: 'Otorisasi Seller',
          description: 'Klik "Hubungkan" untuk login ke akun seller Lazada Anda dan izinkan akses.'
        },
        {
          step: 5,
          title: 'Sync Data',
          description: 'Setelah terhubung, sinkronkan produk dan pesanan dari Lazada.'
        }
      ]
    },
    tokopedia: {
      title: 'Cara Menghubungkan Tokopedia',
      steps: [
        {
          step: 1,
          title: 'Daftar Tokopedia Mitra',
          description: 'Kunjungi https://developer.tokopedia.com dan daftar sebagai mitra/partner.',
          link: 'https://developer.tokopedia.com'
        },
        {
          step: 2,
          title: 'Dapatkan Kredensial',
          description: 'Setelah disetujui, Anda akan mendapat FS ID, Client ID, dan Client Secret.'
        },
        {
          step: 3,
          title: 'Masukkan Kredensial',
          description: 'Masukkan semua kredensial di form tambah toko beserta Shop ID.'
        },
        {
          step: 4,
          title: 'Otorisasi Toko',
          description: 'Klik "Hubungkan" untuk mengotorisasi akses ke toko Tokopedia Anda.'
        },
        {
          step: 5,
          title: 'Sync Data',
          description: 'Mulai sinkronisasi data produk dan pesanan.'
        }
      ]
    },
    tiktok: {
      title: 'Cara Menghubungkan TikTok Shop',
      steps: [
        {
          step: 1,
          title: 'Daftar TikTok Shop Partner',
          description: 'Kunjungi https://partner.tiktokshop.com dan daftar sebagai partner.',
          link: 'https://partner.tiktokshop.com'
        },
        {
          step: 2,
          title: 'Buat Aplikasi',
          description: 'Buat aplikasi dan dapatkan App Key serta App Secret.'
        },
        {
          step: 3,
          title: 'Masukkan Kredensial',
          description: 'Masukkan Shop ID, App Key, dan App Secret di form tambah toko.'
        },
        {
          step: 4,
          title: 'Otorisasi Toko',
          description: 'Klik "Hubungkan" untuk login ke TikTok Shop dan izinkan akses.'
        },
        {
          step: 5,
          title: 'Sync Data',
          description: 'Sinkronkan data produk dan pesanan dari TikTok Shop.'
        }
      ]
    },
    manual: {
      title: 'Toko Manual',
      steps: [
        {
          step: 1,
          title: 'Untuk Marketplace Lain',
          description: 'Gunakan opsi ini untuk mencatat toko dari marketplace yang belum terintegrasi otomatis.'
        },
        {
          step: 2,
          title: 'Input Manual',
          description: 'Anda perlu menginput produk dan pesanan secara manual untuk toko ini.'
        },
        {
          step: 3,
          title: 'Kelola Data',
          description: 'Data toko manual dikelola terpisah dan tidak tersinkronisasi dengan marketplace.'
        }
      ]
    }
  };

  const guide = guides[platform] || guides.manual;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${platformInfo.bgLight} rounded-lg flex items-center justify-center text-xl`}>
              {platformInfo.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold">{guide.title}</h2>
              <p className="text-sm text-gray-500">Panduan langkah demi langkah</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          {guide.steps.map((item, idx) => (
            <div key={idx} className="flex gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full ${platformInfo.bgLight} ${platformInfo.textColor} flex items-center justify-center font-bold`}>
                {item.step}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                {item.link && (
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 text-sm ${platformInfo.textColor} hover:underline mt-2`}
                  >
                    <ExternalLink size={14} />
                    Kunjungi
                  </a>
                )}
              </div>
            </div>
          ))}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Catatan Penting:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Proses approval bisa memakan waktu 1-7 hari kerja</li>
                  <li>Pastikan toko Anda aktif dan memiliki izin usaha</li>
                  <li>Access token perlu diperbarui secara berkala</li>
                </ul>
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-full btn btn-primary mt-4">
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
