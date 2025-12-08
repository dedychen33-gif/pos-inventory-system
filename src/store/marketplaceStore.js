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

// Platform display info with SVG logos
export const PLATFORM_INFO = {
  shopee: {
    name: 'Shopee',
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: null,
    // Shopee shopping bag logo
    logo: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#EE4D2D"/>
      <path d="M24 12C20.13 12 17 15.13 17 19V20H15C14.45 20 14 20.45 14 21V35C14 35.55 14.45 36 15 36H33C33.55 36 34 35.55 34 35V21C34 20.45 33.55 20 33 20H31V19C31 15.13 27.87 12 24 12ZM24 14C26.76 14 29 16.24 29 19V20H19V19C19 16.24 21.24 14 24 14ZM24 24C25.1 24 26 24.9 26 26C26 26.74 25.6 27.39 25 27.73V30C25 30.55 24.55 31 24 31C23.45 31 23 30.55 23 30V27.73C22.4 27.39 22 26.74 22 26C22 24.9 22.9 24 24 24Z" fill="white"/>
    </svg>`
  },
  lazada: {
    name: 'Lazada',
    color: 'purple',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: null,
    // Lazada heart logo
    logo: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#0F146D"/>
      <path d="M24 36L21.6 33.8C14.4 27.3 10 23.3 10 18.5C10 14.5 13.2 11.3 17.2 11.3C19.5 11.3 21.7 12.4 23.1 14.1L24 15.2L24.9 14.1C26.3 12.4 28.5 11.3 30.8 11.3C34.8 11.3 38 14.5 38 18.5C38 23.3 33.6 27.3 26.4 33.8L24 36Z" fill="#F85606"/>
    </svg>`
  },
  tokopedia: {
    name: 'Tokopedia',
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: null,
    // Tokopedia bird/owl logo
    logo: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#42B549"/>
      <circle cx="24" cy="24" r="12" fill="white"/>
      <circle cx="24" cy="24" r="8" fill="#42B549"/>
      <circle cx="24" cy="24" r="4" fill="white"/>
    </svg>`
  },
  tiktok: {
    name: 'TikTok Shop',
    color: 'black',
    bgColor: 'bg-gray-900',
    textColor: 'text-gray-900',
    bgLight: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: null,
    // TikTok music note logo
    logo: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#000000"/>
      <path d="M33.5 18.5C31.5 18.5 29.7 17.7 28.4 16.4C27.1 15.1 26.3 13.3 26.3 11.3H22V28.8C22 30.9 20.3 32.6 18.2 32.6C16.1 32.6 14.4 30.9 14.4 28.8C14.4 26.7 16.1 25 18.2 25C18.6 25 19 25.1 19.4 25.2V21.1C19 21 18.6 21 18.2 21C13.9 21 10.4 24.5 10.4 28.8C10.4 33.1 13.9 36.6 18.2 36.6C22.5 36.6 26 33.1 26 28.8V19.9C27.6 21.1 29.6 21.8 31.7 21.8H33.5V18.5Z" fill="white"/>
      <path d="M33.5 18.5C31.5 18.5 29.7 17.7 28.4 16.4C27.1 15.1 26.3 13.3 26.3 11.3H22V28.8C22 30.9 20.3 32.6 18.2 32.6C16.1 32.6 14.4 30.9 14.4 28.8C14.4 26.7 16.1 25 18.2 25C18.6 25 19 25.1 19.4 25.2V21.1C19 21 18.6 21 18.2 21C13.9 21 10.4 24.5 10.4 28.8C10.4 33.1 13.9 36.6 18.2 36.6C22.5 36.6 26 33.1 26 28.8V19.9C27.6 21.1 29.6 21.8 31.7 21.8H33.5V18.5Z" fill="#25F4EE" transform="translate(-1, -1)"/>
      <path d="M33.5 18.5C31.5 18.5 29.7 17.7 28.4 16.4C27.1 15.1 26.3 13.3 26.3 11.3H22V28.8C22 30.9 20.3 32.6 18.2 32.6C16.1 32.6 14.4 30.9 14.4 28.8C14.4 26.7 16.1 25 18.2 25C18.6 25 19 25.1 19.4 25.2V21.1C19 21 18.6 21 18.2 21C13.9 21 10.4 24.5 10.4 28.8C10.4 33.1 13.9 36.6 18.2 36.6C22.5 36.6 26 33.1 26 28.8V19.9C27.6 21.1 29.6 21.8 31.7 21.8H33.5V18.5Z" fill="#FE2C55" transform="translate(1, 1)"/>
    </svg>`
  },
  manual: {
    name: 'Manual / Lainnya',
    color: 'blue',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: null,
    logo: (size = 32) => `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="8" fill="#3B82F6"/>
      <path d="M14 14H26V18H18V30H14V14ZM20 20H34V34H20V20ZM24 24V30H30V24H24Z" fill="white"/>
    </svg>`
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
