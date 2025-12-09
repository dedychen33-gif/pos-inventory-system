/**
 * Marketplace API Service
 * Handles API calls to all supported marketplace platforms
 */

import axios from 'axios';

// Detect environment - FORCE production URLs for Vercel deployment
const isProduction = true; // Force production mode
const VERCEL_API_BASE = 'https://pos-inventory-system-gamma.vercel.app/api';

// Base URLs for marketplace APIs - Always use Vercel API
const API_URLS = {
  shopee: `${VERCEL_API_BASE}/shopee`,
  lazada: `${VERCEL_API_BASE}/lazada`,
  tokopedia: `${VERCEL_API_BASE}/tokopedia`,
  tiktok: `${VERCEL_API_BASE}/tiktok`,
};

// Create axios instance for each platform
const createApiInstance = (platform, timeout = 60000) => {
  const instance = axios.create({
    baseURL: API_URLS[platform],
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Response interceptor untuk handle error
  instance.interceptors.response.use(
    (response) => response.data,
    (error) => {
      const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      return Promise.reject(new Error(message));
    }
  );

  return instance;
};

// ============================================
// SHOPEE API
// ============================================
export const shopeeApi = {
  // Get OAuth URL untuk authorization
  getAuthUrl: async (store) => {
    try {
      const api = createApiInstance('shopee');
      // Use Vercel URL for redirect (consistent with Shopee Open Platform setting)
      const baseUrl = 'https://pos-inventory-system-gamma.vercel.app';
      const redirectUrl = `${baseUrl}/marketplace/callback?platform=shopee&store_id=${store.id}`;
      
      // Use correct endpoint path based on environment
      // Local: /auth/shopee/url, Vercel: /auth-url
      const endpoint = isProduction ? '/auth-url' : '/auth/shopee/url';
      
      // Send credentials to backend for signature generation
      const result = await api.post(endpoint, {
        partner_id: store.credentials?.partnerId || '',
        partner_key: store.credentials?.partnerKey || '',
        shop_id: store.shopId || '',
        redirect_url: redirectUrl
      });
      return result;
    } catch (error) {
      throw new Error(`Gagal mendapatkan Auth URL: ${error.message}`);
    }
  },

  // Exchange code for access token
  getToken: async (store, code) => {
    const api = createApiInstance('shopee');
    // Vercel API expects action=get_token as query param
    const endpoint = isProduction ? '/token?action=get_token' : '/auth/shopee/callback';
    return api.post(endpoint, {
      code,
      shop_id: store.shopId,
      partner_id: store.credentials.partnerId,
      partner_key: store.credentials.partnerKey,
    });
  },

  // Refresh access token
  refreshToken: async (store) => {
    const api = createApiInstance('shopee');
    return api.post('/auth/shopee/refresh', {
      shop_id: store.shopId,
      partner_id: store.credentials.partnerId,
      refresh_token: store.credentials.refreshToken,
    });
  },

  // Get shop info
  getShopInfo: async (store) => {
    const api = createApiInstance('shopee');
    return api.get('/shop/info', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
      }
    });
  },

  // Sync products from Shopee
  syncProducts: async (store) => {
    try {
      const api = createApiInstance('shopee');
      // Use GET with query params for Vercel API
      // Don't skip models - we need variants data for dropdown display
      const result = await api.get('/products', {
        params: {
          shop_id: store.shopId,
          access_token: store.credentials?.accessToken,
          partner_id: store.credentials?.partnerId,
          partner_key: store.credentials?.partnerKey,
          fetch_all: 'true'
          // skip_models removed to get variant data
        }
      });
      
      // Parse Shopee API response structure: { success, data: { response: { item: [], total_count } } }
      const items = result?.data?.response?.item || result?.response?.item || result?.products || [];
      const totalCount = result?.data?.response?.total_count || result?.response?.total_count || result?.count || items.length;
      
      console.log('Shopee syncProducts result:', { itemCount: items.length, totalCount, rawResult: result });
      
      return { 
        success: result.success !== false, 
        data: items,
        count: totalCount
      };
    } catch (error) {
      throw new Error(`Sync produk gagal: ${error.message}`);
    }
  },

  // Get all products
  getProducts: async (store, params = {}) => {
    const api = createApiInstance('shopee');
    return api.get('/products', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
        partner_id: store.credentials?.partnerId,
        partner_key: store.credentials?.partnerKey,
        ...params
      }
    });
  },

  // Sync orders from Shopee
  syncOrders: async (store, dateRange = {}) => {
    try {
      const api = createApiInstance('shopee', 120000); // 2 min timeout for orders
      // Use GET with query params for Vercel API
      // Fetch orders without fetch_all_statuses to avoid timeout
      const result = await api.get('/orders', {
        params: {
          shop_id: store.shopId,
          access_token: store.credentials?.accessToken,
          partner_id: store.credentials?.partnerId,
          partner_key: store.credentials?.partnerKey,
          fetch_all: 'true',
          // Don't use fetch_all_statuses to avoid timeout, just get recent orders
          ...dateRange
        }
      });
      
      // Parse Shopee API response structure
      const orders = result?.data?.response?.order_list || result?.response?.order_list || result?.orders || [];
      const totalCount = result?.data?.response?.total_count || result?.response?.total_count || result?.count || orders.length;
      const statusSummary = result?.data?.response?.status_summary || result?.response?.status_summary || {};
      
      console.log('Shopee syncOrders result:', { orderCount: orders.length, totalCount, statusSummary });
      
      return { 
        success: result.success !== false, 
        data: orders,
        count: totalCount,
        statusSummary
      };
    } catch (error) {
      throw new Error(`Sync order gagal: ${error.message}`);
    }
  },

  // Sync returns/refunds from Shopee
  syncReturns: async (store) => {
    try {
      const api = createApiInstance('shopee', 60000);
      const result = await api.get('/returns', {
        params: {
          shop_id: store.shopId,
          access_token: store.credentials?.accessToken,
          partner_id: store.credentials?.partnerId,
          partner_key: store.credentials?.partnerKey,
          fetch_all: 'true'
        }
      });
      
      // Parse response
      const returns = result?.returns || result?.data?.response?.return_list || result?.response?.return_list || [];
      const totalCount = result?.count || returns.length;
      
      console.log('Shopee syncReturns result:', { returnCount: returns.length, totalCount });
      
      return { 
        success: result.success !== false, 
        data: returns,
        count: totalCount
      };
    } catch (error) {
      console.error('Sync returns error:', error);
      return { success: false, data: [], count: 0, error: error.message };
    }
  },

  // Get orders by specific status
  getOrdersByStatus: async (store, status, dateRange = {}) => {
    const api = createApiInstance('shopee');
    return api.get('/orders', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials?.accessToken,
        partner_id: store.credentials?.partnerId,
        partner_key: store.credentials?.partnerKey,
        fetch_all: 'true',
        order_status: status, // READY_TO_SHIP, PROCESSED, SHIPPED, COMPLETED, CANCELLED, IN_CANCEL
        ...dateRange
      }
    });
  },

  // Get all orders
  getOrders: async (store, params = {}) => {
    const api = createApiInstance('shopee');
    return api.get('/orders', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
        partner_id: store.credentials?.partnerId,
        partner_key: store.credentials?.partnerKey,
        fetch_all: 'true',
        fetch_all_statuses: 'true',
        ...params
      }
    });
  },

  // Update product stock
  updateStock: async (store, productId, stock) => {
    const api = createApiInstance('shopee');
    return api.put(`/products/${productId}/stock`, {
      shop_id: store.shopId,
      access_token: store.credentials.accessToken,
      stock
    });
  },

  // Test connection
  testConnection: async (store) => {
    try {
      const api = createApiInstance('shopee', 10000);
      const result = await api.get('/auth/status', {
        params: {
          shop_id: store.shopId,
        }
      });
      return { success: result.connected || result.success, data: result };
    } catch (error) {
      // If backend is not running, check if we have credentials
      if (store.credentials?.accessToken) {
        return { success: true, data: { message: 'Token tersedia (backend offline)' } };
      }
      return { success: false, error: error.message };
    }
  }
};

// ============================================
// LAZADA API
// ============================================
export const lazadaApi = {
  // Get OAuth URL via Vercel API
  getAuthUrl: async (store) => {
    try {
      const api = createApiInstance('lazada');
      const baseUrl = isProduction 
        ? 'https://pos-inventory-system-gamma.vercel.app'
        : window.location.origin;
      const redirectUrl = `${baseUrl}/marketplace/callback?platform=lazada&store_id=${store.id}`;
      
      const result = await api.post('/auth-url', {
        app_key: store.credentials?.appKey || '',
        store_id: store.id,
        redirect_url: redirectUrl
      });
      return result;
    } catch (error) {
      // Fallback to direct URL construction
      const appKey = store.credentials?.appKey;
      const baseUrl = isProduction 
        ? 'https://pos-inventory-system-gamma.vercel.app'
        : window.location.origin;
      const redirectUrl = encodeURIComponent(
        `${baseUrl}/marketplace/callback?platform=lazada&store_id=${store.id}`
      );
      return {
        url: `https://auth.lazada.com/oauth/authorize?response_type=code&force_auth=true&redirect_uri=${redirectUrl}&client_id=${appKey}&country=id`
      };
    }
  },

  // Exchange code for access token via Vercel API
  getToken: async (store, code) => {
    const api = createApiInstance('lazada');
    return api.post('/token?action=get_token', {
      code,
      app_key: store.credentials.appKey,
      app_secret: store.credentials.appSecret,
    });
  },

  // Refresh access token via Vercel API
  refreshToken: async (store) => {
    const api = createApiInstance('lazada');
    return api.post('/token?action=refresh_token', {
      app_key: store.credentials.appKey,
      app_secret: store.credentials.appSecret,
      refresh_token: store.credentials.refreshToken,
    });
  },

  // Sync products via Vercel API
  syncProducts: async (store) => {
    try {
      const api = createApiInstance('lazada');
      const result = await api.get('/products', {
        params: {
          app_key: store.credentials?.appKey,
          app_secret: store.credentials?.appSecret,
          access_token: store.credentials?.accessToken,
          fetch_all: 'true'
        }
      });
      
      const items = result?.data?.response?.item || result?.products || [];
      const totalCount = result?.data?.response?.total_count || result?.count || items.length;
      
      console.log('Lazada syncProducts result:', { itemCount: items.length, totalCount });
      
      return { 
        success: result.success !== false, 
        data: items,
        count: totalCount
      };
    } catch (error) {
      throw new Error(`Sync produk Lazada gagal: ${error.message}`);
    }
  },

  // Get products via Vercel API
  getProducts: async (store, params = {}) => {
    const api = createApiInstance('lazada');
    return api.get('/products', {
      params: {
        app_key: store.credentials?.appKey,
        app_secret: store.credentials?.appSecret,
        access_token: store.credentials?.accessToken,
        ...params
      }
    });
  },

  // Sync orders via Vercel API
  syncOrders: async (store, dateRange = {}) => {
    try {
      const api = createApiInstance('lazada', 120000);
      const result = await api.get('/orders', {
        params: {
          app_key: store.credentials?.appKey,
          app_secret: store.credentials?.appSecret,
          access_token: store.credentials?.accessToken,
          fetch_all: 'true',
          ...dateRange
        }
      });
      
      const orders = result?.data?.response?.order_list || result?.orders || [];
      const totalCount = result?.data?.response?.total_count || result?.count || orders.length;
      const statusSummary = result?.data?.response?.status_summary || result?.statusSummary || {};
      
      console.log('Lazada syncOrders result:', { orderCount: orders.length, totalCount, statusSummary });
      
      return { 
        success: result.success !== false, 
        data: orders,
        count: totalCount,
        statusSummary
      };
    } catch (error) {
      throw new Error(`Sync order Lazada gagal: ${error.message}`);
    }
  },

  // Get orders by status via Vercel API
  getOrdersByStatus: async (store, status, dateRange = {}) => {
    const api = createApiInstance('lazada', 120000);
    return api.get('/orders', {
      params: {
        app_key: store.credentials?.appKey,
        app_secret: store.credentials?.appSecret,
        access_token: store.credentials?.accessToken,
        order_status: status,
        fetch_all: 'true',
        ...dateRange
      }
    });
  },

  // Get orders via Vercel API
  getOrders: async (store, params = {}) => {
    const api = createApiInstance('lazada');
    return api.get('/orders', {
      params: {
        app_key: store.credentials?.appKey,
        app_secret: store.credentials?.appSecret,
        access_token: store.credentials?.accessToken,
        ...params
      }
    });
  },

  // Update stock
  updateStock: async (store, sku, quantity) => {
    const api = createApiInstance('lazada');
    return api.put('/products/stock', {
      access_token: store.credentials.accessToken,
      sku,
      quantity
    });
  },

  // Test connection
  testConnection: async (store) => {
    try {
      // Try to fetch products to test connection
      if (store.credentials?.accessToken) {
        const api = createApiInstance('lazada', 10000);
        const result = await api.get('/products', {
          params: {
            app_key: store.credentials?.appKey,
            app_secret: store.credentials?.appSecret,
            access_token: store.credentials?.accessToken,
            limit: '1'
          }
        });
        return { success: result.success !== false, data: result };
      }
      return { success: false, error: 'No access token' };
    } catch (error) {
      // If backend is not running, check if we have credentials
      if (store.credentials?.accessToken) {
        return { success: true, data: { message: 'Token tersedia (backend offline)' } };
      }
      return { success: false, error: error.message };
    }
  }
};

// ============================================
// TOKOPEDIA API
// ============================================
export const tokopediaApi = {
  // Get OAuth URL
  getAuthUrl: async (store) => {
    const fsId = store.credentials.fsId;
    const baseUrl = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://pos-inventory-system-gamma.vercel.app';
    const redirectUrl = encodeURIComponent(
      `${baseUrl}/marketplace/callback?platform=tokopedia&store_id=${store.id}`
    );
    return {
      url: `https://accounts.tokopedia.com/authorize?response_type=code&client_id=${store.credentials.clientId}&redirect_uri=${redirectUrl}&state=${fsId}`
    };
  },

  // Exchange code for access token
  getToken: async (store, code) => {
    const api = createApiInstance('tokopedia');
    return api.post('/auth/token', {
      code,
      client_id: store.credentials.clientId,
      client_secret: store.credentials.clientSecret,
      fs_id: store.credentials.fsId,
    });
  },

  // Refresh access token
  refreshToken: async (store) => {
    const api = createApiInstance('tokopedia');
    return api.post('/auth/refresh', {
      client_id: store.credentials.clientId,
      client_secret: store.credentials.clientSecret,
      refresh_token: store.credentials.refreshToken,
    });
  },

  // Get shop info
  getShopInfo: async (store) => {
    const api = createApiInstance('tokopedia');
    return api.get('/shop/info', {
      params: {
        shop_id: store.shopId,
        fs_id: store.credentials.fsId,
        access_token: store.credentials.accessToken,
      }
    });
  },

  // Sync products
  syncProducts: async (store) => {
    const api = createApiInstance('tokopedia');
    return api.post('/products/sync', {
      shop_id: store.shopId,
      fs_id: store.credentials.fsId,
      access_token: store.credentials.accessToken,
    });
  },

  // Get products
  getProducts: async (store, params = {}) => {
    const api = createApiInstance('tokopedia');
    return api.get('/products', {
      params: {
        shop_id: store.shopId,
        fs_id: store.credentials.fsId,
        access_token: store.credentials.accessToken,
        ...params
      }
    });
  },

  // Sync orders
  syncOrders: async (store, dateRange = {}) => {
    const api = createApiInstance('tokopedia');
    return api.post('/orders/sync', {
      shop_id: store.shopId,
      fs_id: store.credentials.fsId,
      access_token: store.credentials.accessToken,
      ...dateRange
    });
  },

  // Get orders
  getOrders: async (store, params = {}) => {
    const api = createApiInstance('tokopedia');
    return api.get('/orders', {
      params: {
        shop_id: store.shopId,
        fs_id: store.credentials.fsId,
        access_token: store.credentials.accessToken,
        ...params
      }
    });
  },

  // Update stock
  updateStock: async (store, productId, stock) => {
    const api = createApiInstance('tokopedia');
    return api.put('/products/stock', {
      shop_id: store.shopId,
      fs_id: store.credentials.fsId,
      access_token: store.credentials.accessToken,
      product_id: productId,
      stock
    });
  },

  // Test connection
  testConnection: async (store) => {
    try {
      const api = createApiInstance('tokopedia', 10000);
      const result = await api.get('/auth/status', {
        params: {
          fs_id: store.credentials.fsId,
          access_token: store.credentials.accessToken
        }
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================
// TIKTOK SHOP API
// ============================================
export const tiktokApi = {
  // Get OAuth URL
  getAuthUrl: async (store) => {
    const appKey = store.credentials.appKey;
    const baseUrl = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://pos-inventory-system-gamma.vercel.app';
    const redirectUrl = encodeURIComponent(
      `${baseUrl}/marketplace/callback?platform=tiktok&store_id=${store.id}`
    );
    return {
      url: `https://auth.tiktok-shops.com/oauth/authorize?app_key=${appKey}&redirect_uri=${redirectUrl}&state=tiktok_auth`
    };
  },

  // Exchange code for access token
  getToken: async (store, code) => {
    const api = createApiInstance('tiktok');
    return api.post('/auth/token', {
      code,
      app_key: store.credentials.appKey,
      app_secret: store.credentials.appSecret,
    });
  },

  // Refresh access token
  refreshToken: async (store) => {
    const api = createApiInstance('tiktok');
    return api.post('/auth/refresh', {
      app_key: store.credentials.appKey,
      app_secret: store.credentials.appSecret,
      refresh_token: store.credentials.refreshToken,
    });
  },

  // Get shop info
  getShopInfo: async (store) => {
    const api = createApiInstance('tiktok');
    return api.get('/shop/info', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
      }
    });
  },

  // Sync products
  syncProducts: async (store) => {
    const api = createApiInstance('tiktok');
    return api.post('/products/sync', {
      shop_id: store.shopId,
      access_token: store.credentials.accessToken,
    });
  },

  // Get products
  getProducts: async (store, params = {}) => {
    const api = createApiInstance('tiktok');
    return api.get('/products', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
        ...params
      }
    });
  },

  // Sync orders
  syncOrders: async (store, dateRange = {}) => {
    const api = createApiInstance('tiktok');
    return api.post('/orders/sync', {
      shop_id: store.shopId,
      access_token: store.credentials.accessToken,
      ...dateRange
    });
  },

  // Get orders
  getOrders: async (store, params = {}) => {
    const api = createApiInstance('tiktok');
    return api.get('/orders', {
      params: {
        shop_id: store.shopId,
        access_token: store.credentials.accessToken,
        ...params
      }
    });
  },

  // Update stock
  updateStock: async (store, productId, stock) => {
    const api = createApiInstance('tiktok');
    return api.put('/products/stock', {
      shop_id: store.shopId,
      access_token: store.credentials.accessToken,
      product_id: productId,
      stock
    });
  },

  // Test connection
  testConnection: async (store) => {
    try {
      const api = createApiInstance('tiktok', 10000);
      const result = await api.get('/auth/status', {
        params: {
          shop_id: store.shopId,
          access_token: store.credentials.accessToken
        }
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ============================================
// UNIFIED MARKETPLACE SERVICE
// ============================================
export const marketplaceService = {
  // Get API instance based on platform
  getApi: (platform) => {
    switch (platform) {
      case 'shopee': return shopeeApi;
      case 'lazada': return lazadaApi;
      case 'tokopedia': return tokopediaApi;
      case 'tiktok': return tiktokApi;
      default: return null;
    }
  },

  // Get OAuth authorization URL
  getAuthUrl: async (store) => {
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      return { error: 'Platform tidak didukung' };
    }
    return api.getAuthUrl(store);
  },

  // Exchange authorization code for token
  getToken: async (store, code) => {
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    return api.getToken(store, code);
  },

  // Refresh access token
  refreshToken: async (store) => {
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    return api.refreshToken(store);
  },

  // Test connection to marketplace
  testConnection: async (store) => {
    if (store.platform === 'manual') {
      return { success: true, data: { message: 'Toko manual tidak memerlukan koneksi' } };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      return { success: false, error: 'Platform tidak didukung' };
    }
    
    return api.testConnection(store);
  },

  // Sync products from marketplace
  syncProducts: async (store) => {
    if (store.platform === 'manual') {
      return { success: true, data: [], message: 'Toko manual - tidak ada sinkronisasi' };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    
    try {
      const result = await api.syncProducts(store);
      return { 
        success: true, 
        data: result.products || result.data || [],
        count: result.total || result.count || 0
      };
    } catch (error) {
      throw new Error(`Gagal sync produk: ${error.message}`);
    }
  },

  // Sync orders from marketplace
  syncOrders: async (store, dateRange = {}) => {
    if (store.platform === 'manual') {
      return { success: true, data: [], message: 'Toko manual - tidak ada sinkronisasi' };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    
    try {
      const result = await api.syncOrders(store, dateRange);
      return { 
        success: true, 
        data: result.orders || result.data || [],
        count: result.total || result.count || 0
      };
    } catch (error) {
      throw new Error(`Gagal sync order: ${error.message}`);
    }
  },

  // Full sync (products + orders)
  fullSync: async (store, onProgress = null) => {
    const results = {
      products: { success: false, count: 0, data: [], error: null },
      orders: { success: false, count: 0, data: [], error: null }
    };

    if (store.platform === 'manual') {
      return {
        success: true,
        message: 'Toko manual tidak memerlukan sinkronisasi',
        results
      };
    }

    // Sync products
    if (onProgress) onProgress('Sinkronisasi produk...');
    try {
      const productResult = await marketplaceService.syncProducts(store);
      results.products = { 
        success: true, 
        count: productResult.count || productResult.data?.length || 0,
        data: productResult.data || []
      };
    } catch (error) {
      results.products = { success: false, error: error.message, data: [] };
    }

    // Sync orders
    if (onProgress) onProgress('Sinkronisasi pesanan...');
    try {
      const orderResult = await marketplaceService.syncOrders(store);
      results.orders = { 
        success: true, 
        count: orderResult.count || orderResult.data?.length || 0,
        data: orderResult.data || []
      };
    } catch (error) {
      results.orders = { success: false, error: error.message, data: [] };
    }

    return {
      success: results.products.success || results.orders.success,
      results
    };
  },

  // Sync all connected stores
  syncAllStores: async (stores, onProgress = null) => {
    const results = [];
    const activeStores = stores.filter(s => s.isActive && s.platform !== 'manual');

    for (let i = 0; i < activeStores.length; i++) {
      const store = activeStores[i];
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: activeStores.length,
          store: store.shopName,
          status: 'syncing'
        });
      }

      try {
        const result = await marketplaceService.fullSync(store);
        results.push({
          storeId: store.id,
          storeName: store.shopName,
          platform: store.platform,
          success: result.success,
          results: result.results
        });
      } catch (error) {
        results.push({
          storeId: store.id,
          storeName: store.shopName,
          platform: store.platform,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  },

  // Update product stock on marketplace
  updateStock: async (store, productId, stock) => {
    if (store.platform === 'manual') {
      return { success: true, message: 'Stok lokal diperbarui' };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    
    return api.updateStock(store, productId, stock);
  },

  // Get products from marketplace
  getProducts: async (store, params = {}) => {
    if (store.platform === 'manual') {
      return { data: [], total: 0 };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    
    return api.getProducts(store, params);
  },

  // Get orders from marketplace
  getOrders: async (store, params = {}) => {
    if (store.platform === 'manual') {
      return { data: [], total: 0 };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api) {
      throw new Error('Platform tidak didukung');
    }
    
    return api.getOrders(store, params);
  },

  // Get orders by status from marketplace
  getOrdersByStatus: async (store, status, dateRange = {}) => {
    if (store.platform === 'manual') {
      return { data: { response: { order_list: [] } } };
    }
    
    const api = marketplaceService.getApi(store.platform);
    if (!api || !api.getOrdersByStatus) {
      throw new Error('Platform tidak mendukung getOrdersByStatus');
    }
    
    return api.getOrdersByStatus(store, status, dateRange);
  }
};

export default marketplaceService;
