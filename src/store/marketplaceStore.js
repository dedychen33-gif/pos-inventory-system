import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Supported marketplace platforms
export const MARKETPLACE_PLATFORMS = {
  SHOPEE: 'shopee',
  LAZADA: 'lazada',
  TOKOPEDIA: 'tokopedia',
  TIKTOK: 'tiktok',
  MANUAL: 'manual'
};

// Platform display info
export const PLATFORM_INFO = {
  shopee: {
    name: 'Shopee',
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: '🛒'
  },
  lazada: {
    name: 'Lazada',
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '💜'
  },
  tokopedia: {
    name: 'Tokopedia',
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: '🟢'
  },
  tiktok: {
    name: 'TikTok Shop',
    color: 'black',
    bgColor: 'bg-gray-900',
    textColor: 'text-gray-900',
    bgLight: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: '🎵'
  },
  manual: {
    name: 'Manual / Lainnya',
    color: 'blue',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '📝'
  }
};

export const useMarketplaceStore = create(
  persist(
    (set, get) => ({
      // Connected stores/shops - array of multiple stores
      stores: [],
      
      // Active store ID for viewing
      activeStoreId: null,
      
      // Aggregated data from all stores
      allProducts: [],
      allOrders: [],
      
      // Loading states
      loading: {
        stores: false,
        products: false,
        orders: false,
        sync: false,
      },

      // Add a new store/shop
      addStore: (storeData) => {
        const stores = get().stores;
        
        // Check for duplicate (same platform + shop_id)
        const exists = stores.some(s => 
          s.platform === storeData.platform && 
          s.shopId === storeData.shopId &&
          storeData.shopId // only check if shopId exists
        );
        
        if (exists) {
          return { success: false, error: 'Toko sudah terdaftar' };
        }
        
        const newStore = {
          id: Date.now(),
          platform: storeData.platform,
          shopId: storeData.shopId || '',
          shopName: storeData.shopName || `Toko ${PLATFORM_INFO[storeData.platform]?.name || storeData.platform}`,
          ownerName: storeData.ownerName || '',
          // API Credentials
          credentials: {
            partnerId: storeData.partnerId || '',
            partnerKey: storeData.partnerKey || '',
            accessToken: storeData.accessToken || '',
            refreshToken: storeData.refreshToken || '',
            // Lazada specific
            appKey: storeData.appKey || '',
            appSecret: storeData.appSecret || '',
            // Tokopedia specific
            fsId: storeData.fsId || '',
            clientId: storeData.clientId || '',
            clientSecret: storeData.clientSecret || '',
          },
          // Status
          isConnected: !!storeData.accessToken,
          isActive: true,
          lastSync: null,
          tokenExpiry: null,
          // Stats
          productCount: 0,
          orderCount: 0,
          // Metadata
          createdAt: new Date().toISOString(),
          createdBy: storeData.userId || null,
          notes: storeData.notes || ''
        };
        
        set({ stores: [...stores, newStore] });
        return { success: true, store: newStore };
      },

      // Update store credentials/info
      updateStore: (storeId, updates) => {
        const stores = get().stores.map(store => {
          if (store.id === storeId) {
            return {
              ...store,
              ...updates,
              credentials: updates.credentials 
                ? { ...store.credentials, ...updates.credentials }
                : store.credentials,
              updatedAt: new Date().toISOString()
            };
          }
          return store;
        });
        set({ stores });
        return { success: true };
      },

      // Update store credentials only
      updateStoreCredentials: (storeId, credentials) => {
        const stores = get().stores.map(store => {
          if (store.id === storeId) {
            return {
              ...store,
              credentials: { ...store.credentials, ...credentials },
              isConnected: !!credentials.accessToken || store.isConnected,
              updatedAt: new Date().toISOString()
            };
          }
          return store;
        });
        set({ stores });
        return { success: true };
      },

      // Update store sync status
      updateStoreSync: (storeId, syncData) => {
        const stores = get().stores.map(store => {
          if (store.id === storeId) {
            return {
              ...store,
              lastSync: new Date().toISOString(),
              productCount: syncData.productCount ?? store.productCount,
              orderCount: syncData.orderCount ?? store.orderCount,
              isConnected: true
            };
          }
          return store;
        });
        set({ stores });
      },

      // Remove store
      removeStore: (storeId) => {
        const stores = get().stores.filter(s => s.id !== storeId);
        const activeStoreId = get().activeStoreId;
        
        set({ 
          stores,
          activeStoreId: activeStoreId === storeId ? null : activeStoreId
        });
        return { success: true };
      },

      // Toggle store active status
      toggleStoreActive: (storeId) => {
        const stores = get().stores.map(store => {
          if (store.id === storeId) {
            return { ...store, isActive: !store.isActive };
          }
          return store;
        });
        set({ stores });
      },

      // Set active store for viewing
      setActiveStore: (storeId) => {
        set({ activeStoreId: storeId });
      },

      // Get store by ID
      getStoreById: (storeId) => {
        return get().stores.find(s => s.id === storeId);
      },

      // Get stores by platform
      getStoresByPlatform: (platform) => {
        return get().stores.filter(s => s.platform === platform);
      },

      // Get stores by user
      getStoresByUser: (userId) => {
        return get().stores.filter(s => s.createdBy === userId);
      },

      // Get active stores only
      getActiveStores: () => {
        return get().stores.filter(s => s.isActive);
      },

      // Get connected stores only
      getConnectedStores: () => {
        return get().stores.filter(s => s.isConnected);
      },

      // Get summary stats
      getSummary: () => {
        const stores = get().stores;
        return {
          totalStores: stores.length,
          activeStores: stores.filter(s => s.isActive).length,
          connectedStores: stores.filter(s => s.isConnected).length,
          byPlatform: {
            shopee: stores.filter(s => s.platform === 'shopee').length,
            lazada: stores.filter(s => s.platform === 'lazada').length,
            tokopedia: stores.filter(s => s.platform === 'tokopedia').length,
            tiktok: stores.filter(s => s.platform === 'tiktok').length,
            manual: stores.filter(s => s.platform === 'manual').length,
          },
          totalProducts: stores.reduce((sum, s) => sum + (s.productCount || 0), 0),
          totalOrders: stores.reduce((sum, s) => sum + (s.orderCount || 0), 0),
        };
      },

      // Loading states
      setLoading: (key, value) => set({
        loading: { ...get().loading, [key]: value }
      }),

      // Clear all stores
      clearAllStores: () => set({
        stores: [],
        activeStoreId: null,
        allProducts: [],
        allOrders: []
      }),

      // Legacy support - keep old properties for backward compatibility
      isConnected: false,
      shopInfo: null,
      lastSync: null,
      products: [],
      orders: [],
      summary: null,
      
      setConnected: (status, shopInfo = null) => set({ 
        isConnected: status, 
        shopInfo 
      }),
      
      disconnect: () => set({
        isConnected: false,
        shopInfo: null,
        products: [],
        orders: [],
        summary: null,
        lastSync: null,
      }),
    }),
    {
      name: 'marketplace-stores-storage',
      partialize: (state) => ({
        stores: state.stores,
        activeStoreId: state.activeStoreId,
      }),
    }
  )
);
