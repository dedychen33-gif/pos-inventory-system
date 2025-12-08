import { useState, useEffect } from 'react';
import { 
  Store, Package, ShoppingCart, TrendingUp, RefreshCw, Download,
  AlertTriangle, CheckCircle, Search, Eye, Clock, CreditCard,
  Settings, Key, ExternalLink, Save, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RotateCcw, Database, User
} from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useAuthStore } from '../store/authStore';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Detect if we're on production or local
const isProduction = window.location.hostname !== 'localhost';
const API_BASE = isProduction ? '' : 'http://localhost:3001';
const REDIRECT_DOMAIN = 'https://pos-inventory-system-gamma.vercel.app';

export default function Marketplace() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Get current user and marketplace credentials
  const { user, getMyMarketplaceCredentials, updateMarketplaceCredentials } = useAuthStore();
  
  // Get user-specific storage key
  const getUserStorageKey = (key) => `${key}_user_${user?.id || 'default'}`;
  
  const [lastSync, setLastSync] = useState(() => {
    const saved = localStorage.getItem(getUserStorageKey('shopee_last_sync'));
    return saved ? new Date(saved) : null;
  });
  
  // Get local products and import function from store
  const localProducts = useProductStore((state) => state.products);
  const importShopeeProducts = useProductStore((state) => state.importShopeeProducts);
  const clearShopeeProducts = useProductStore((state) => state.clearShopeeProducts);
  
  // Initialize Shopee Config from user's marketplace credentials
  const initializeConfig = () => {
    const userCreds = getMyMarketplaceCredentials('shopee');
    if (userCreds && userCreds.shopId) {
      return {
        partnerId: userCreds.partnerId || '2014001',
        partnerKey: userCreds.partnerKey || '',
        shopId: userCreds.shopId || '',
        accessToken: userCreds.accessToken || '',
        refreshToken: userCreds.refreshToken || '',
        shopName: userCreds.shopName || ''
      };
    }
    // Fallback to localStorage for backward compatibility
    return {
      partnerId: localStorage.getItem(getUserStorageKey('shopee_partner_id')) || '2014001',
      partnerKey: localStorage.getItem(getUserStorageKey('shopee_partner_key')) || '',
      shopId: localStorage.getItem(getUserStorageKey('shopee_shop_id')) || '',
      accessToken: localStorage.getItem(getUserStorageKey('shopee_access_token')) || '',
      refreshToken: localStorage.getItem(getUserStorageKey('shopee_refresh_token')) || '',
      shopName: ''
    };
  };
  
  // Shopee Config State
  const [shopeeConfig, setShopeeConfig] = useState(initializeConfig);

  const [tokenStatus, setTokenStatus] = useState(null);
  
  const [summary, setSummary] = useState({
    totalProducts: 0, lowStock: 0, outOfStock: 0,
    todayOrders: 0, monthlyOrders: 0, pendingOrders: 0,
    todayRevenue: 0, monthlyRevenue: 0,
  });

  const [shopeeProducts, setShopeeProducts] = useState(() => {
    const saved = localStorage.getItem(getUserStorageKey('shopee_products_cache'));
    return saved ? JSON.parse(saved) : [];
  });
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(getUserStorageKey('shopee_orders_cache'));
    return saved ? JSON.parse(saved) : [];
  });
  const [returns, setReturns] = useState(() => {
    const saved = localStorage.getItem(getUserStorageKey('shopee_returns_cache'));
    return saved ? JSON.parse(saved) : [];
  });
  
  // Reload config when user changes
  useEffect(() => {
    if (user?.id) {
      const newConfig = initializeConfig();
      setShopeeConfig(newConfig);
      setIsConnected(!!newConfig.accessToken);
      
      // Load cached data for this user
      const cachedProducts = localStorage.getItem(getUserStorageKey('shopee_products_cache'));
      const cachedOrders = localStorage.getItem(getUserStorageKey('shopee_orders_cache'));
      const cachedReturns = localStorage.getItem(getUserStorageKey('shopee_returns_cache'));
      const cachedLastSync = localStorage.getItem(getUserStorageKey('shopee_last_sync'));
      
      setShopeeProducts(cachedProducts ? JSON.parse(cachedProducts) : []);
      setOrders(cachedOrders ? JSON.parse(cachedOrders) : []);
      setReturns(cachedReturns ? JSON.parse(cachedReturns) : []);
      setLastSync(cachedLastSync ? new Date(cachedLastSync) : null);
    }
  }, [user?.id]);
  
  // Auto-save to localStorage when data changes
  useEffect(() => {
    if (shopeeProducts.length > 0 && user?.id) {
      localStorage.setItem(getUserStorageKey('shopee_products_cache'), JSON.stringify(shopeeProducts));
    }
  }, [shopeeProducts, user?.id]);
  
  useEffect(() => {
    if (orders.length > 0 && user?.id) {
      localStorage.setItem(getUserStorageKey('shopee_orders_cache'), JSON.stringify(orders));
    }
  }, [orders]);
  
  useEffect(() => {
    if (returns.length > 0) {
      localStorage.setItem('shopee_returns_cache', JSON.stringify(returns));
    }
  }, [returns]);
  
  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [returnPage, setReturnPage] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [returnSearch, setReturnSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [returnStatusFilter, setReturnStatusFilter] = useState('ALL');
  const [expandedProducts, setExpandedProducts] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});
  const [expandedReturns, setExpandedReturns] = useState({});
  const ITEMS_PER_PAGE = 20;

  const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  // Save config to localStorage, user credentials AND Supabase
  const saveConfig = async () => {
    // Save to user's marketplace credentials in authStore
    if (user?.id) {
      updateMarketplaceCredentials(user.id, 'shopee', {
        partnerId: shopeeConfig.partnerId,
        partnerKey: shopeeConfig.partnerKey,
        shopId: shopeeConfig.shopId,
        accessToken: shopeeConfig.accessToken,
        refreshToken: shopeeConfig.refreshToken,
        shopName: shopeeConfig.shopName || '',
        isConnected: !!shopeeConfig.accessToken,
        lastSync: lastSync?.toISOString() || null
      });
    }
    
    // Also save to localStorage with user-specific key for backward compatibility
    localStorage.setItem(getUserStorageKey('shopee_partner_id'), shopeeConfig.partnerId);
    localStorage.setItem(getUserStorageKey('shopee_partner_key'), shopeeConfig.partnerKey);
    localStorage.setItem(getUserStorageKey('shopee_shop_id'), shopeeConfig.shopId);
    localStorage.setItem(getUserStorageKey('shopee_access_token'), shopeeConfig.accessToken);
    localStorage.setItem(getUserStorageKey('shopee_refresh_token'), shopeeConfig.refreshToken);
    
    // Save to Supabase for auto-refresh
    if (isSupabaseConfigured() && shopeeConfig.shopId) {
      try {
        const { error } = await supabase
          .from('shopee_tokens')
          .upsert({
            shop_id: shopeeConfig.shopId,
            partner_id: shopeeConfig.partnerId,
            partner_key: shopeeConfig.partnerKey,
            access_token: shopeeConfig.accessToken,
            refresh_token: shopeeConfig.refreshToken,
            user_id: user?.id || null, // Track which user owns this token
            token_expiry: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // 4 jam
          }, { onConflict: 'shop_id' });
        
        if (error) {
          console.error('Supabase save error:', error);
          setMessage({ type: 'success', text: 'Tersimpan ke Akun Anda (Supabase gagal)' });
        } else {
          setMessage({ type: 'success', text: 'Tersimpan ke Akun Anda & Supabase!' });
        }
      } catch (e) {
        console.error('Supabase error:', e);
        setMessage({ type: 'success', text: 'Tersimpan ke Akun Anda' });
      }
    } else {
      setMessage({ type: 'success', text: 'Konfigurasi berhasil disimpan ke akun Anda!' });
    }
    
    setIsConnected(!!shopeeConfig.accessToken);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  // Load token from Supabase (for auto-refresh sync)
  const loadTokenFromSupabase = async () => {
    if (!isSupabaseConfigured() || !shopeeConfig.shopId) return;
    
    try {
      const { data, error } = await supabase
        .from('shopee_tokens')
        .select('access_token, refresh_token, token_expiry, last_refresh')
        .eq('shop_id', shopeeConfig.shopId)
        .single();
      
      if (data && !error) {
        // Update local state with latest token from Supabase
        if (data.access_token && data.access_token !== shopeeConfig.accessToken) {
          const newConfig = {
            ...shopeeConfig,
            accessToken: data.access_token,
            refreshToken: data.refresh_token || shopeeConfig.refreshToken
          };
          setShopeeConfig(newConfig);
          
          // Also update user credentials
          if (user?.id) {
            updateMarketplaceCredentials(user.id, 'shopee', {
              accessToken: data.access_token,
              refreshToken: data.refresh_token || shopeeConfig.refreshToken
            });
          }
          
          // Also update localStorage
          localStorage.setItem(getUserStorageKey('shopee_access_token'), data.access_token);
          if (data.refresh_token) {
            localStorage.setItem(getUserStorageKey('shopee_refresh_token'), data.refresh_token);
          }
          console.log('Token synced from Supabase, last refresh:', data.last_refresh);
        }
      }
    } catch (e) {
      console.error('Failed to load token from Supabase:', e);
    }
  };

  // Check token status (local check)
  const checkTokenStatus = () => {
    const hasAccessToken = !!shopeeConfig.accessToken;
    const hasRefreshToken = !!shopeeConfig.refreshToken;
    setTokenStatus({
      hasAccessToken,
      hasRefreshToken,
      isExpired: !hasAccessToken,
      shopId: shopeeConfig.shopId
    });
  };

  // Generate Auth URL with signature (using Vercel API)
  const handleShopeeAuth = async () => {
    if (!shopeeConfig.partnerKey) {
      setMessage({ type: 'error', text: 'Partner Key harus diisi terlebih dahulu!' });
      return;
    }
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        partner_id: shopeeConfig.partnerId,
        partner_key: shopeeConfig.partnerKey,
        redirect: `${REDIRECT_DOMAIN}/marketplace/callback`
      });
      
      const res = await fetch(`${API_BASE}/api/shopee/auth-url?${params}`);
      const data = await res.json();
      
      if (data.success && data.authUrl) {
        window.open(data.authUrl, '_blank');
        setMessage({ type: 'info', text: 'Jendela authorization Shopee telah dibuka. Selesaikan proses login di sana.' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Gagal mendapatkan URL authorization' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Refresh token
  const handleRefreshToken = async () => {
    if (!shopeeConfig.refreshToken || !shopeeConfig.partnerKey) {
      setMessage({ type: 'error', text: 'Refresh Token dan Partner Key harus diisi!' });
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/shopee/token?action=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: shopeeConfig.partnerId,
          partner_key: shopeeConfig.partnerKey,
          shop_id: shopeeConfig.shopId,
          refresh_token: shopeeConfig.refreshToken
        })
      });
      const data = await res.json();
      
      if (data.success && data.data.access_token) {
        const newConfig = {
          ...shopeeConfig,
          accessToken: data.data.access_token,
          refreshToken: data.data.refresh_token || shopeeConfig.refreshToken
        };
        setShopeeConfig(newConfig);
        
        // Save to user credentials
        if (user?.id) {
          updateMarketplaceCredentials(user.id, 'shopee', {
            accessToken: newConfig.accessToken,
            refreshToken: newConfig.refreshToken,
            isConnected: true
          });
        }
        
        localStorage.setItem(getUserStorageKey('shopee_access_token'), newConfig.accessToken);
        localStorage.setItem(getUserStorageKey('shopee_refresh_token'), newConfig.refreshToken);
        setIsConnected(true);
        setMessage({ type: 'success', text: 'Token berhasil di-refresh!' });
        checkTokenStatus();
      } else {
        setMessage({ type: 'error', text: data.data?.message || data.error || 'Gagal refresh token' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Sync products from Shopee
  const handleSyncProducts = async () => {
    if (!shopeeConfig.accessToken) {
      setMessage({ type: 'error', text: 'Access Token diperlukan untuk sync!' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Menyinkronkan produk dari Shopee...' });
      
      const params = new URLSearchParams({
        partner_id: shopeeConfig.partnerId,
        partner_key: shopeeConfig.partnerKey,
        shop_id: shopeeConfig.shopId,
        access_token: shopeeConfig.accessToken,
        fetch_all: 'true' // Fetch all products with pagination
      });
      
      const res = await fetch(`${API_BASE}/api/shopee/products?${params}`);
      const data = await res.json();
      
      if (data.success && data.data.response) {
        const items = data.data.response.item || [];
        
        // Debug: log first item to see structure
        if (items.length > 0) {
          console.log('Shopee API Response - First Item:', JSON.stringify(items[0], null, 2));
        }
        
        // Import to product store
        const result = importShopeeProducts(items);
        
        // Map products for display in Marketplace - get price from correct source
        setShopeeProducts(items.map(item => {
          // Get price from models if has variants, otherwise from item
          let price = 0;
          if (item.models && item.models.length > 0) {
            const firstModel = item.models[0];
            price = firstModel.current_price || 
                    firstModel.price_info?.current_price || 
                    firstModel.price_info?.original_price ||
                    firstModel.original_price || 
                    0;
          } else {
            price = item.current_price || 
                    item.price_info?.current_price ||
                    (Array.isArray(item.price_info) ? item.price_info[0]?.current_price : 0) || 
                    0;
          }
          
          // Get stock
          let stock = 0;
          if (item.models && item.models.length > 0) {
            // Sum stock from all models
            stock = item.models.reduce((sum, m) => {
              return sum + (m.stock || 
                           m.stock_info_v2?.seller_stock?.[0]?.stock || 
                           m.stock_info_v2?.summary_info?.total_available_stock ||
                           m.stock_info?.current_stock || 0);
            }, 0);
          } else {
            stock = item.current_stock || 
                    item.stock_info_v2?.summary_info?.total_available_stock || 0;
          }
          
          return {
            id: item.item_id,
            name: item.item_name || `Product ${item.item_id}`,
            sku: item.item_sku || item.models?.[0]?.model_sku || item.model_sku || '-',
            price: price,
            stock: stock,
            status: item.item_status || 'NORMAL',
            image: item.image?.image_url_list?.[0] || '',
            hasVariants: item.has_model && item.models && item.models.length > 1,
            modelCount: item.models?.length || 0,
            source: 'shopee'
          };
        }));
        
        // Include skipped count in message if any
        const skippedMsg = result.skipped > 0 ? `, ${result.skipped} dilewati (SKU duplikat)` : '';
        setMessage({ type: 'success', text: `Berhasil sync ${items.length} produk dari Shopee! (${result.imported} baru, ${result.updated} diperbarui${skippedMsg})` });
        const syncTime = new Date();
        setLastSync(syncTime);
        localStorage.setItem(getUserStorageKey('shopee_last_sync'), syncTime.toISOString());
        
        // Update user's marketplace credentials with last sync time
        if (user?.id) {
          updateMarketplaceCredentials(user.id, 'shopee', {
            lastSync: syncTime.toISOString(),
            isConnected: true
          });
        }
        
        // Update summary
        setSummary(prev => ({
          ...prev,
          totalProducts: items.length,
          lowStock: items.filter(i => (i.current_stock || i.stock_info_v2?.summary_info?.total_available_stock || 0) < 10).length
        }));
      } else {
        setMessage({ type: 'error', text: data.data?.message || data.error || 'Gagal sync produk' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Clear & Sync - hapus semua produk Shopee lalu sync ulang
  const handleClearAndSync = async () => {
    if (!confirm('Hapus semua produk Shopee dan sync ulang dari awal?')) return;
    
    // Clear existing Shopee products
    const remaining = clearShopeeProducts();
    setMessage({ type: 'info', text: `Menghapus produk Shopee... (${remaining} produk lokal dipertahankan)` });
    
    // Then sync fresh
    await handleSyncProducts();
  };

  // Sync orders from Shopee
  const handleSyncOrders = async () => {
    if (!shopeeConfig.accessToken) {
      setMessage({ type: 'error', text: 'Access Token diperlukan untuk sync!' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Menyinkronkan pesanan dari Shopee...' });
      
      const params = new URLSearchParams({
        partner_id: shopeeConfig.partnerId,
        partner_key: shopeeConfig.partnerKey,
        shop_id: shopeeConfig.shopId,
        access_token: shopeeConfig.accessToken,
        fetch_all: 'true' // Fetch all orders with pagination
      });
      
      const res = await fetch(`${API_BASE}/api/shopee/orders?${params}`);
      const data = await res.json();
      
      if (data.success && data.data.response) {
        const orderList = data.data.response.order_list || [];
        setOrders(orderList.map(order => ({
          id: order.order_sn,
          orderSn: order.order_sn,
          buyer: order.buyer_username || order.buyer_user_id || 'Unknown',
          total: order.total_amount || 0,
          status: order.order_status,
          date: order.create_time ? new Date(order.create_time * 1000).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'),
          items: order.item_list || []
        })));
        setMessage({ type: 'success', text: `Berhasil sync ${orderList.length} pesanan dari Shopee!` });
        const syncTime = new Date();
        setLastSync(syncTime);
        localStorage.setItem('shopee_last_sync', syncTime.toISOString());
        setOrderPage(1);
      } else {
        setMessage({ type: 'error', text: data.data?.message || data.error || 'Gagal sync pesanan' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Sync returns from Shopee
  const handleSyncReturns = async () => {
    if (!shopeeConfig.accessToken) {
      setMessage({ type: 'error', text: 'Access Token diperlukan untuk sync!' });
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Menyinkronkan pengembalian dari Shopee...' });
      
      const params = new URLSearchParams({
        partner_id: shopeeConfig.partnerId,
        partner_key: shopeeConfig.partnerKey,
        shop_id: shopeeConfig.shopId,
        access_token: shopeeConfig.accessToken,
        fetch_all: 'true'
      });
      
      const res = await fetch(`${API_BASE}/api/shopee/returns?${params}`);
      const data = await res.json();
      
      console.log('Returns API response:', data);
      
      if (data.success && data.data.response) {
        const returnList = data.data.response.return_list || [];
        setReturns(returnList.map(ret => ({
          id: ret.return_sn,
          returnSn: ret.return_sn,
          orderSn: ret.order_sn,
          reason: ret.reason || ret.text_reason || 'Tidak ada alasan',
          status: ret.status,
          refundAmount: ret.refund_amount || 0,
          createTime: ret.create_time ? new Date(ret.create_time * 1000).toLocaleString('id-ID') : '-',
          updateTime: ret.update_time ? new Date(ret.update_time * 1000).toLocaleString('id-ID') : '-',
          items: ret.item || [],
          user: ret.user?.username || ret.buyer_username || 'Unknown',
          images: ret.images || []
        })));
        setMessage({ type: 'success', text: `Berhasil sync ${returnList.length} pengembalian dari Shopee!` });
        const syncTime = new Date();
        setLastSync(syncTime);
        localStorage.setItem('shopee_last_sync', syncTime.toISOString());
        setReturnPage(1);
      } else {
        setMessage({ type: 'error', text: data.data?.message || data.error || 'Gagal sync pengembalian' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Update summary from local products
  const updateSummary = () => {
    setSummary({
      totalProducts: localProducts.length + shopeeProducts.length,
      lowStock: localProducts.filter(p => p.stock > 0 && p.stock <= 10).length,
      outOfStock: localProducts.filter(p => p.stock === 0).length,
      todayOrders: orders.length,
      monthlyOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'READY_TO_SHIP' || o.status === 'UNPAID').length,
      todayRevenue: 0,
      monthlyRevenue: 0,
    });
  };

  useEffect(() => {
    checkTokenStatus();
    updateSummary();
    // Load latest token from Supabase (in case auto-refresh happened)
    loadTokenFromSupabase();
  }, [shopeeConfig.shopId]);
  
  useEffect(() => {
    checkTokenStatus();
    updateSummary();
  }, [shopeeConfig, localProducts, shopeeProducts, orders]);

  const handleConnect = () => { 
    setLoading(true); 
    setTimeout(() => { 
      setIsConnected(true); 
      setLoading(false); 
    }, 500); 
  };

  const getStatusBadge = (status) => {
    const styles = { 'UNPAID': 'bg-yellow-100 text-yellow-800', 'READY_TO_SHIP': 'bg-blue-100 text-blue-800', 'SHIPPED': 'bg-purple-100 text-purple-800', 'COMPLETED': 'bg-green-100 text-green-800', 'CANCELLED': 'bg-red-100 text-red-800', 'NORMAL': 'bg-green-100 text-green-800' };
    const labels = { 'UNPAID': 'Belum Bayar', 'READY_TO_SHIP': 'Siap Kirim', 'SHIPPED': 'Dikirim', 'COMPLETED': 'Selesai', 'CANCELLED': 'Dibatalkan', 'NORMAL': 'Aktif' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };

  // Settings Modal
  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Konfigurasi Shopee API</h2>
              <p className="text-sm text-gray-500">Kredensial untuk: <span className="font-medium text-orange-600">{user?.name || 'User'}</span></p>
            </div>
          </div>
          <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* User Info Banner */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-sm text-gray-600">Kredensial Shopee akan disimpan ke akun ini</p>
              </div>
            </div>
          </div>

          {message.text && (
            <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
              {message.text}
            </div>
          )}

          {/* API Credentials */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><Key className="w-4 h-4" />API Credentials</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Partner ID</label>
                <input
                  type="text"
                  value={shopeeConfig.partnerId}
                  onChange={(e) => setShopeeConfig({ ...shopeeConfig, partnerId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Masukkan Partner ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Shop ID</label>
                <input
                  type="text"
                  value={shopeeConfig.shopId}
                  onChange={(e) => setShopeeConfig({ ...shopeeConfig, shopId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Masukkan Shop ID"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Partner Key</label>
              <input
                type="password"
                value={shopeeConfig.partnerKey}
                onChange={(e) => setShopeeConfig({ ...shopeeConfig, partnerKey: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Masukkan Partner Key"
              />
            </div>
          </div>

          {/* Token Management */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Token Management</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Access Token</label>
              <input
                type="text"
                value={shopeeConfig.accessToken}
                onChange={(e) => setShopeeConfig({ ...shopeeConfig, accessToken: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                placeholder="Masukkan Access Token dari Shopee"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Refresh Token</label>
              <input
                type="text"
                value={shopeeConfig.refreshToken}
                onChange={(e) => setShopeeConfig({ ...shopeeConfig, refreshToken: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
                placeholder="Masukkan Refresh Token dari Shopee"
              />
            </div>

            {/* Token Status */}
            {tokenStatus && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-gray-700">Status Token:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Access Token: <span className={tokenStatus.hasAccessToken ? 'text-green-600 font-medium' : 'text-red-600'}>{tokenStatus.hasAccessToken ? '✓ Ada' : '✗ Belum ada'}</span></div>
                  <div>Refresh Token: <span className={tokenStatus.hasRefreshToken ? 'text-green-600 font-medium' : 'text-red-600'}>{tokenStatus.hasRefreshToken ? '✓ Ada' : '✗ Belum ada'}</span></div>
                  <div>Status: <span className={tokenStatus.isExpired ? 'text-red-600' : 'text-green-600 font-medium'}>{tokenStatus.isExpired ? 'Belum terverifikasi' : 'Tersimpan'}</span></div>
                  <div>Shop ID: <span className="font-medium">{tokenStatus.shopId}</span></div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={saveConfig}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />Simpan ke Browser
              </button>
              <button
                onClick={handleRefreshToken}
                disabled={loading || !shopeeConfig.refreshToken}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh Token
              </button>
            </div>
            
            {/* Supabase Sync */}
            {isSupabaseConfigured() && (
              <div className="pt-3 border-t">
                <button
                  onClick={async () => {
                    setLoading(true);
                    await loadTokenFromSupabase();
                    setLoading(false);
                    setMessage({ type: 'success', text: 'Token berhasil disinkronkan dari Supabase!' });
                  }}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4" />Sync Token dari Supabase (Auto-Refresh)
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Token akan di-refresh otomatis setiap 3 jam via Supabase
                </p>
              </div>
            )}
          </div>

          {/* OAuth */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2"><ExternalLink className="w-4 h-4" />OAuth Shopee</h3>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-orange-800 mb-3">
                Klik tombol di bawah untuk melakukan autentikasi OAuth ke Shopee. 
                Anda akan diarahkan ke halaman Shopee untuk memberikan akses.
              </p>
              <p className="text-xs text-orange-600 mb-3">
                Redirect URL: <code className="bg-white px-2 py-1 rounded">{REDIRECT_DOMAIN}/marketplace/callback</code>
              </p>
              <button
                onClick={handleShopeeAuth}
                disabled={!shopeeConfig.partnerKey}
                className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ExternalLink className="w-5 h-5" />Authorize dengan Shopee
              </button>
              {!shopeeConfig.partnerKey && (
                <p className="text-xs text-red-600 mt-2">⚠️ Isi Partner Key terlebih dahulu</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button onClick={() => setShowSettings(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Tutup</button>
          <button onClick={saveConfig} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2">
            <Save className="w-4 h-4" />Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="p-6">
        {showSettings && <SettingsModal />}
        <div className="max-w-2xl mx-auto text-center py-16">
          {/* Current User Badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="bg-orange-100 px-4 py-2 rounded-full flex items-center gap-2">
              <User className="w-4 h-4 text-orange-600" />
              <span className="text-sm text-orange-700 font-medium">Login sebagai: {user?.name || 'User'}</span>
            </div>
          </div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Store className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Hubungkan Toko Shopee</h1>
          <p className="text-gray-600 mb-8">Integrasikan toko Shopee Anda untuk sinkronisasi produk, pesanan, dan stok secara otomatis.<br/><span className="text-sm text-orange-600">Setiap user dapat memiliki kredensial Shopee sendiri.</span></p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm border"><Package className="w-8 h-8 text-orange-500 mx-auto mb-2" /><h3 className="font-semibold">Sync Produk</h3><p className="text-sm text-gray-500">Otomatis sinkron produk & stok</p></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border"><ShoppingCart className="w-8 h-8 text-orange-500 mx-auto mb-2" /><h3 className="font-semibold">Kelola Pesanan</h3><p className="text-sm text-gray-500">Monitor pesanan real-time</p></div>
            <div className="bg-white p-4 rounded-xl shadow-sm border"><TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" /><h3 className="font-semibold">Laporan Penjualan</h3><p className="text-sm text-gray-500">Analisis performa toko</p></div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setShowSettings(true)} className="px-6 py-3 border-2 border-orange-500 text-orange-600 font-semibold rounded-xl hover:bg-orange-50 transition-all flex items-center justify-center gap-2">
              <Settings className="w-5 h-5" />Konfigurasi API
            </button>
            <button onClick={handleConnect} disabled={loading} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
              {loading ? <span className="flex items-center gap-2"><RefreshCw className="w-5 h-5 animate-spin" />Menghubungkan...</span> : 'Hubungkan Sekarang'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // All products from store - respect original source
  // Group products: parent products with their variants
  const productMap = {};
  localProducts.forEach(p => {
    if (p.isVariant && p.parentItemId) {
      // This is a variant, group under parent
      const parentKey = `shopee_${p.parentItemId}`;
      if (!productMap[parentKey]) {
        productMap[parentKey] = {
          id: parentKey,
          shopeeItemId: p.parentItemId,
          name: p.parentName || p.name.split(' - ')[0],
          sku: '-',
          price: 0,
          stock: 0,
          status: p.shopeeStatus || 'NORMAL',
          source: 'shopee',
          image: p.image,
          hasVariants: true,
          variants: []
        };
      }
      productMap[parentKey].variants.push({
        id: p.id,
        name: p.variantName || p.name,
        fullName: p.name,
        sku: p.sku || p.code || '-',
        price: p.price || 0,
        stock: p.stock || 0,
        image: p.image,
        status: p.shopeeStatus || 'NORMAL'
      });
      // Sum up stock and get price range
      productMap[parentKey].stock += p.stock || 0;
      if (productMap[parentKey].price === 0 || p.price < productMap[parentKey].price) {
        productMap[parentKey].price = p.price;
      }
      productMap[parentKey].maxPrice = Math.max(productMap[parentKey].maxPrice || 0, p.price || 0);
    } else if (!p.isVariant) {
      // Regular product or already exists
      const key = p.id;
      if (!productMap[key]) {
        productMap[key] = {
          id: p.id,
          name: p.name,
          sku: p.sku || p.code || '-',
          price: p.price || 0,
          stock: p.stock || 0,
          status: p.shopeeStatus || 'NORMAL',
          source: p.source || 'local',
          image: p.image,
          hasVariants: false,
          variants: []
        };
      }
    }
  });
  
  const allProducts = Object.values(productMap);
  
  // Toggle expand
  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  // Toggle expand order
  const toggleExpandOrder = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };
  
  // Toggle expand return
  const toggleExpandReturn = (returnId) => {
    setExpandedReturns(prev => ({
      ...prev,
      [returnId]: !prev[returnId]
    }));
  };
  
  // Filtered and paginated products
  const filteredProducts = allProducts.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );
  const totalProductPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * ITEMS_PER_PAGE,
    productPage * ITEMS_PER_PAGE
  );
  
  // Filtered and paginated orders
  const filteredOrders = orders.filter(o => {
    const matchSearch = o.orderSn.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.buyer.toLowerCase().includes(orderSearch.toLowerCase());
    const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });
  const totalOrderPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (orderPage - 1) * ITEMS_PER_PAGE,
    orderPage * ITEMS_PER_PAGE
  );
  
  // Filtered and paginated returns
  const filteredReturns = returns.filter(r => {
    const matchSearch = r.returnSn?.toLowerCase().includes(returnSearch.toLowerCase()) ||
      r.orderSn?.toLowerCase().includes(returnSearch.toLowerCase()) ||
      r.user?.toLowerCase().includes(returnSearch.toLowerCase());
    const matchStatus = returnStatusFilter === 'ALL' || r.status === returnStatusFilter;
    return matchSearch && matchStatus;
  });
  const totalReturnPages = Math.ceil(filteredReturns.length / ITEMS_PER_PAGE);
  const paginatedReturns = filteredReturns.slice(
    (returnPage - 1) * ITEMS_PER_PAGE,
    returnPage * ITEMS_PER_PAGE
  );
  
  // Return status badge
  const getReturnStatusBadge = (status) => {
    const styles = { 
      'REQUESTED': 'bg-yellow-100 text-yellow-800', 
      'ACCEPTED': 'bg-green-100 text-green-800', 
      'CANCELLED': 'bg-gray-100 text-gray-800', 
      'JUDGING': 'bg-blue-100 text-blue-800',
      'REFUND_PAID': 'bg-purple-100 text-purple-800',
      'CLOSED': 'bg-gray-100 text-gray-800',
      'PROCESSING': 'bg-orange-100 text-orange-800'
    };
    const labels = { 
      'REQUESTED': 'Diminta', 
      'ACCEPTED': 'Diterima', 
      'CANCELLED': 'Dibatalkan', 
      'JUDGING': 'Peninjauan',
      'REFUND_PAID': 'Refund Dibayar',
      'CLOSED': 'Ditutup',
      'PROCESSING': 'Diproses'
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
  };
  
  // Pagination component
  const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemName }) => (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
      <div className="text-sm text-gray-500">
        Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} {itemName}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === pageNum ? 'bg-orange-500 text-white' : 'hover:bg-gray-100'}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {showSettings && <SettingsModal />}
      
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
          {message.text}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center"><Store className="w-6 h-6 text-white" /></div>
          <div><h1 className="text-2xl font-bold text-gray-800">Shopee Marketplace</h1><p className="text-sm text-gray-500 flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" />Terhubung {lastSync && `• Terakhir sync: ${lastSync.toLocaleTimeString('id-ID')}`}</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="btn btn-outline flex items-center gap-2"><Settings className="w-4 h-4" /></button>
          <button onClick={handleClearAndSync} disabled={loading} className="btn btn-outline flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"><Trash2 className="w-4 h-4" />Clear & Sync</button>
          <button onClick={handleSyncProducts} disabled={loading} className="btn btn-outline flex items-center gap-2"><Package className="w-4 h-4" />Sync Produk</button>
          <button onClick={handleSyncOrders} disabled={loading} className="btn btn-outline flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Sync Pesanan</button>
          <button onClick={() => { handleSyncProducts(); handleSyncOrders(); }} disabled={loading} className="btn btn-primary flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Loading...' : 'Refresh All'}</button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {[{ id: 'dashboard', label: 'Dashboard', icon: TrendingUp }, { id: 'products', label: 'Produk', icon: Package }, { id: 'orders', label: 'Pesanan', icon: ShoppingCart }, { id: 'returns', label: 'Pengembalian', icon: RotateCcw }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}><tab.icon className="w-4 h-4" />{tab.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border"><div className="flex items-center justify-between mb-3"><span className="text-gray-500 text-sm">Pendapatan Hari Ini</span><div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><CreditCard className="w-5 h-5 text-green-600" /></div></div><p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.todayRevenue)}</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border"><div className="flex items-center justify-between mb-3"><span className="text-gray-500 text-sm">Pesanan Hari Ini</span><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><ShoppingCart className="w-5 h-5 text-blue-600" /></div></div><p className="text-2xl font-bold text-gray-800">{summary.todayOrders}</p><p className="text-sm text-blue-600 flex items-center gap-1 mt-1"><Clock className="w-4 h-4" />{summary.pendingOrders} perlu diproses</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border"><div className="flex items-center justify-between mb-3"><span className="text-gray-500 text-sm">Total Produk</span><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-purple-600" /></div></div><p className="text-2xl font-bold text-gray-800">{summary.totalProducts}</p><p className="text-sm text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-4 h-4" />{summary.lowStock} stok rendah</p></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border"><div className="flex items-center justify-between mb-3"><span className="text-gray-500 text-sm">Pendapatan Bulan Ini</span><div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-orange-600" /></div></div><p className="text-2xl font-bold text-gray-800">{formatCurrency(summary.monthlyRevenue)}</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-sm border"><h3 className="font-semibold text-gray-800 mb-4">Pesanan Perlu Diproses</h3><div className="space-y-3">{orders.filter(o => o.status === 'READY_TO_SHIP' || o.status === 'UNPAID').slice(0, 3).map((order) => (<div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium text-sm">{order.orderSn}</p><p className="text-xs text-gray-500">{order.buyer}</p></div><div className="text-right">{getStatusBadge(order.status)}<p className="text-sm font-semibold mt-1">{formatCurrency(order.total)}</p></div></div>))}{orders.filter(o => o.status === 'READY_TO_SHIP' || o.status === 'UNPAID').length === 0 && <p className="text-gray-400 text-sm text-center py-4">Tidak ada pesanan pending</p>}</div></div>
            <div className="bg-white rounded-xl p-5 shadow-sm border"><h3 className="font-semibold text-gray-800 mb-4">Produk Stok Rendah</h3><div className="space-y-3">{localProducts.filter(p => p.stock <= 10).slice(0, 3).map((product) => (<div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><p className="font-medium text-sm">{product.name?.substring(0, 30) || 'Product'}...</p><p className="text-xs text-gray-500">SKU: {product.code}</p></div><div className="text-right"><span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>Stok: {product.stock}</span></div></div>))}{localProducts.filter(p => p.stock <= 10).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Semua stok aman</p>}</div></div>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari produk..." 
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductPage(1); }}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                />
              </div>
              <span className="text-sm text-gray-500">{filteredProducts.length} produk</span>
            </div>
            <button className="btn btn-outline flex items-center gap-2"><Download className="w-4 h-4" />Export</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-gray-600 w-10"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Produk</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">SKU</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Harga</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Stok</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Sumber</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedProducts.map((product) => (
                  <>
                    <tr 
                      key={`${product.source}-${product.id}`} 
                      className={`hover:bg-gray-50 ${product.hasVariants ? 'cursor-pointer' : ''}`}
                      onClick={() => product.hasVariants && toggleExpand(product.id)}
                    >
                      <td className="px-2 py-3 text-center">
                        {product.hasVariants && (
                          <button className="p-1 rounded hover:bg-gray-200">
                            {expandedProducts[product.id] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.image && <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            {product.hasVariants && (
                              <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                {product.variants.length} Varian
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                        {product.hasVariants ? '-' : product.sku}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {product.hasVariants && product.maxPrice && product.price !== product.maxPrice 
                          ? `${formatCurrency(product.price)} - ${formatCurrency(product.maxPrice)}`
                          : formatCurrency(product.price)
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.stock === 0 ? 'bg-red-100 text-red-800' : product.stock <= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.source === 'shopee' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                          {product.source === 'shopee' ? 'Shopee' : 'Lokal'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(product.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <a 
                            href={`https://shopee.co.id/product/${product.shopId || shopeeConfig.shopId}/${product.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                            title="Lihat di Shopee"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                    {/* Variant rows - expandable */}
                    {product.hasVariants && expandedProducts[product.id] && product.variants.map((variant, idx) => (
                      <tr key={`variant-${variant.id}`} className="bg-purple-50/30">
                        <td className="px-2 py-2"></td>
                        <td className="px-4 py-2 pl-12">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-8 bg-purple-300 rounded"></div>
                            {variant.image && <img src={variant.image} alt="" className="w-8 h-8 rounded object-cover" />}
                            <div>
                              <p className="text-sm text-gray-700">{variant.name || `Varian ${idx + 1}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-600 font-mono text-xs">{variant.sku}</td>
                        <td className="px-4 py-2 text-right font-medium text-sm">{formatCurrency(variant.price)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${variant.stock === 0 ? 'bg-red-100 text-red-800' : variant.stock <= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                            {variant.stock}
                          </span>
                        </td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2 text-center">{getStatusBadge(variant.status)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-400">-</span>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada produk. Klik "Sync Produk" untuk mengambil dari Shopee.</p>}
            {filteredProducts.length > 0 && totalProductPages > 1 && (
              <Pagination 
                currentPage={productPage} 
                totalPages={totalProductPages} 
                onPageChange={setProductPage}
                totalItems={filteredProducts.length}
                itemName="produk"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari pesanan..." 
                  value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setOrderPage(1); }}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                />
              </div>
              <select 
                value={orderStatusFilter}
                onChange={(e) => { setOrderStatusFilter(e.target.value); setOrderPage(1); }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="UNPAID">Belum Bayar</option>
                <option value="READY_TO_SHIP">Siap Kirim</option>
                <option value="SHIPPED">Dikirim</option>
                <option value="COMPLETED">Selesai</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
              <span className="text-sm text-gray-500">{filteredOrders.length} pesanan</span>
            </div>
            <button className="btn btn-outline flex items-center gap-2"><Download className="w-4 h-4" />Export</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-gray-600 w-10"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Pembeli</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedOrders.map((order) => (
                  <>
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 ${order.items && order.items.length > 0 ? 'cursor-pointer' : ''}`}
                      onClick={() => order.items && order.items.length > 0 && toggleExpandOrder(order.id)}
                    >
                      <td className="px-2 py-3 text-center">
                        {order.items && order.items.length > 0 && (
                          <button className="p-1 rounded hover:bg-gray-200">
                            {expandedOrders[order.id] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-800 font-mono text-sm">{order.orderSn}</p>
                          {order.items && order.items.length > 0 && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {order.items.length} produk
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.buyer}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{order.date}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                    {/* Order items - expandable */}
                    {order.items && order.items.length > 0 && expandedOrders[order.id] && (
                      <tr key={`items-${order.id}`}>
                        <td colSpan="7" className="bg-blue-50/30 px-4 py-3">
                          <div className="pl-8">
                            <p className="text-xs font-semibold text-gray-500 mb-2">PRODUK YANG DIBELI:</p>
                            <div className="space-y-2">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border">
                                  {item.image_info?.image_url && (
                                    <img src={item.image_info.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                                    {item.model_name && (
                                      <p className="text-xs text-gray-500">Varian: {item.model_name}</p>
                                    )}
                                    <p className="text-xs text-gray-400">SKU: {item.item_sku || item.model_sku || '-'}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">{formatCurrency(item.model_discounted_price || item.model_original_price || 0)}</p>
                                    <p className="text-xs text-gray-500">x{item.model_quantity_purchased || 1}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada pesanan. Klik "Sync Pesanan" untuk mengambil dari Shopee.</p>}
            {filteredOrders.length > 0 && totalOrderPages > 1 && (
              <Pagination 
                currentPage={orderPage} 
                totalPages={totalOrderPages} 
                onPageChange={setOrderPage}
                totalItems={filteredOrders.length}
                itemName="pesanan"
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Cari pengembalian..." 
                  value={returnSearch}
                  onChange={(e) => { setReturnSearch(e.target.value); setReturnPage(1); }}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                />
              </div>
              <select 
                value={returnStatusFilter}
                onChange={(e) => { setReturnStatusFilter(e.target.value); setReturnPage(1); }}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="REQUESTED">Diminta</option>
                <option value="ACCEPTED">Diterima</option>
                <option value="CANCELLED">Dibatalkan</option>
                <option value="JUDGING">Dalam Peninjauan</option>
                <option value="REFUND_PAID">Refund Dibayar</option>
                <option value="CLOSED">Ditutup</option>
              </select>
              <span className="text-sm text-gray-500">{filteredReturns.length} pengembalian</span>
            </div>
            <button onClick={handleSyncReturns} disabled={loading} className="btn btn-outline flex items-center gap-2">
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Sync Pengembalian
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 text-left text-sm font-semibold text-gray-600 w-10"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Return ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Order ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Pembeli</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Alasan</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Refund</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedReturns.map((ret) => (
                  <>
                    <tr 
                      key={ret.id} 
                      className={`hover:bg-gray-50 ${ret.items && ret.items.length > 0 ? 'cursor-pointer' : ''}`}
                      onClick={() => ret.items && ret.items.length > 0 && toggleExpandReturn(ret.id)}
                    >
                      <td className="px-2 py-3 text-center">
                        {ret.items && ret.items.length > 0 && (
                          <button className="p-1 rounded hover:bg-gray-200">
                            {expandedReturns[ret.id] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 font-mono text-sm">{ret.returnSn}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{ret.orderSn}</td>
                      <td className="px-4 py-3 text-gray-600">{ret.user}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">{ret.reason}</td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{formatCurrency(ret.refundAmount)}</td>
                      <td className="px-4 py-3 text-center">{getReturnStatusBadge(ret.status)}</td>
                      <td className="px-4 py-3 text-gray-500 text-sm">{ret.createTime}</td>
                    </tr>
                    {/* Return items - expandable */}
                    {ret.items && ret.items.length > 0 && expandedReturns[ret.id] && (
                      <tr key={`items-${ret.id}`}>
                        <td colSpan="8" className="bg-red-50/30 px-4 py-3">
                          <div className="pl-8">
                            <p className="text-xs font-semibold text-gray-500 mb-2">PRODUK YANG DIKEMBALIKAN:</p>
                            <div className="space-y-2">
                              {ret.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border">
                                  {item.image_url && (
                                    <img src={item.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                                  )}
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{item.name || item.item_name || 'Produk'}</p>
                                    {item.model_name && (
                                      <p className="text-xs text-gray-500">Varian: {item.model_name}</p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">{formatCurrency(item.item_price || 0)}</p>
                                    <p className="text-xs text-gray-500">x{item.amount || 1}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {ret.images && ret.images.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2">BUKTI FOTO:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {ret.images.map((img, idx) => (
                                    <img key={idx} src={img} alt="" className="w-16 h-16 rounded object-cover border" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredReturns.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada pengembalian. Klik "Sync Pengembalian" untuk mengambil dari Shopee.</p>}
            {filteredReturns.length > 0 && totalReturnPages > 1 && (
              <Pagination 
                currentPage={returnPage} 
                totalPages={totalReturnPages} 
                onPageChange={setReturnPage}
                totalItems={filteredReturns.length}
                itemName="pengembalian"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
