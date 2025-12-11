import { useProductStore } from '../store/productStore'
import { useMarketplaceStore } from '../store/marketplaceStore'
import { useAuthStore } from '../store/authStore'

class AutoSyncService {
  constructor() {
    this.isRunning = false
    this.lastSyncTime = null
    this.syncInterval = null
  }

  // Cek apakah auto-sync diaktifkan
  isAutoSyncEnabled() {
    return localStorage.getItem('autoSyncEnabled') === 'true'
  }

  // Toggle auto-sync
  toggleAutoSync(enabled) {
    localStorage.setItem('autoSyncEnabled', enabled.toString())
    if (enabled) {
      this.startPeriodicSync()
    } else {
      this.stopPeriodicSync()
    }
  }

  // Jalankan auto-sync lengkap (produk + pesanan + cloud)
  async runAutoSync() {
    if (this.isRunning) {
      console.log('Auto sync already running, skipping...')
      return { success: false, message: 'Auto sync sedang berjalan' }
    }

    if (!this.isAutoSyncEnabled()) {
      console.log('Auto sync is disabled')
      return { success: false, message: 'Auto sync dinonaktifkan' }
    }

    this.isRunning = true
    console.log('🚀 Starting auto sync...')

    const results = {
      products: { success: false, imported: 0, updated: 0, error: null },
      orders: { success: false, synced: 0, error: null },
      cloud: { success: false, synced: 0, error: null }
    }

    try {
      // 1. Sync Produk dari Marketplace
      console.log('📦 Syncing products from marketplace...')
      const productStore = useProductStore.getState()
      const marketplaceStore = useMarketplaceStore.getState()
      
      // Sync Shopee Products
      if (localStorage.getItem('shopee_access_token')) {
        try {
          const shopeeResult = await marketplaceStore.syncShopeeProducts()
          results.products = {
            success: true,
            imported: shopeeResult.imported || 0,
            updated: shopeeResult.updated || 0,
            error: null
          }
          console.log(`✅ Shopee products synced: ${shopeeResult.imported} imported, ${shopeeResult.updated} updated`)
        } catch (error) {
          results.products.error = error.message
          console.error('❌ Shopee product sync failed:', error)
        }
      }

      // Sync Lazada Products (jika ada)
      if (localStorage.getItem('lazada_access_token')) {
        try {
          const lazadaResult = await marketplaceStore.syncLazadaProducts()
          if (results.products.success) {
            results.products.imported += lazadaResult.imported || 0
            results.products.updated += lazadaResult.updated || 0
          } else {
            results.products = {
              success: true,
              imported: lazadaResult.imported || 0,
              updated: lazadaResult.updated || 0,
              error: null
            }
          }
          console.log(`✅ Lazada products synced: ${lazadaResult.imported} imported, ${lazadaResult.updated} updated`)
        } catch (error) {
          console.error('❌ Lazada product sync failed:', error)
        }
      }

      // 2. Sync Pesanan dari Marketplace
      console.log('📋 Syncing orders from marketplace...')
      
      // Sync Shopee Orders
      if (localStorage.getItem('shopee_access_token')) {
        try {
          // Implement syncShopeeOrders directly
          const ordersResult = await this.syncShopeeOrders()
          results.orders = {
            success: true,
            synced: ordersResult.length || 0,
            error: null
          }
          console.log(`✅ Shopee orders synced: ${ordersResult.length} orders`)
        } catch (error) {
          results.orders.error = error.message
          console.error('❌ Shopee order sync failed:', error)
        }
      }

      // 3. Sync ke Cloud (Supabase)
      console.log('☁️ Syncing to cloud...')
      try {
        const cloudResult = await productStore.syncLocalToCloud()
        results.cloud = {
          success: cloudResult.success,
          synced: cloudResult.count || 0,
          error: cloudResult.error || null
        }
        console.log(`✅ Cloud sync completed: ${cloudResult.count} products`)
      } catch (error) {
        results.cloud.error = error.message
        console.error('❌ Cloud sync failed:', error)
      }

      this.lastSyncTime = new Date().toISOString()
      localStorage.setItem('lastAutoSyncTime', this.lastSyncTime)

      // Tampilkan notifikasi ke user
      this.showSyncNotification(results)

      return { success: true, results }

    } catch (error) {
      console.error('❌ Auto sync failed:', error)
      return { success: false, error: error.message }
    } finally {
      this.isRunning = false
      console.log('🏁 Auto sync completed')
    }
  }

  // Sync Shopee orders
  async syncShopeeOrders() {
    const partnerId = localStorage.getItem('shopee_partner_id')
    const partnerKey = localStorage.getItem('shopee_partner_key')
    const shopId = localStorage.getItem('shopee_shop_id')
    const accessToken = localStorage.getItem('shopee_access_token')

    if (!partnerId || !partnerKey || !shopId || !accessToken) {
      throw new Error('Shopee not configured')
    }

    // Import marketplaceApi untuk sync orders
    const { shopeeApi } = await import('./marketplaceApi')
    
    try {
      // Get orders from last 7 days
      const ordersResponse = await shopeeApi.getOrderList({
        partner_id: partnerId,
        partner_key: partnerKey,
        access_token: accessToken,
        shop_id: shopId,
        time_range_field: 'create_time',
        time_from: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
        time_to: Math.floor(Date.now() / 1000),
        page_size: 100,
        order_status: 'ALL'
      })

      const orders = ordersResponse?.response?.order_list || []
      console.log(`Found ${orders.length} Shopee orders to sync`)

      // Process each order - save to local storage or database
      // For now, just return the orders count
      // TODO: Implement actual order saving logic
      
      return orders
    } catch (error) {
      console.error('Error syncing Shopee orders:', error)
      throw error
    }
  }

  // Tampilkan notifikasi hasil sync
  showSyncNotification(results) {
    const { products, orders, cloud } = results
    
    let message = '🔄 Auto Sync Selesai!\n\n'
    
    if (products.success) {
      message += `📦 Produk: ${products.imported} baru, ${products.updated} update\n`
    } else if (products.error) {
      message += `📦 Produk: Gagal (${products.error})\n`
    }
    
    if (orders.success) {
      message += `📋 Pesanan: ${orders.synced} disinkron\n`
    } else if (orders.error) {
      message += `📋 Pesanan: Gagal (${orders.error})\n`
    }
    
    if (cloud.success) {
      message += `☁️ Cloud: ${cloud.synced} produk di-backup\n`
    } else if (cloud.error) {
      message += `☁️ Cloud: Gagal (${cloud.error})\n`
    }

    // Tampilkan notifikasi (bisa diganti dengan toast notification)
    if (typeof window !== 'undefined') {
      // Cek apakah ada notifikasi system
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Auto Sync POS System', {
          body: message.replace(/\n/g, ' '),
          icon: '/favicon.ico'
        })
      } else {
        // Fallback ke alert
        console.log(message)
      }
    }
  }

  // Start auto-sync saat aplikasi dimulai
  async initializeOnAppStart() {
    console.log('🔧 Initializing auto sync service...')
    
    // Request notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }

    // Jalankan auto-sync jika diaktifkan
    if (this.isAutoSyncEnabled()) {
      // Cek last sync time (jangan sync terlalu sering)
      const lastSync = localStorage.getItem('lastAutoSyncTime')
      const now = new Date()
      const syncCooldown = 30 * 60 * 1000 // 30 menit cooldown
      
      if (!lastSync || (now - new Date(lastSync)) > syncCooldown) {
        // Delay 5 detik setelah login untuk memastikan semua komponen loaded
        setTimeout(() => {
          this.runAutoSync()
        }, 5000)
      } else {
        console.log('⏰ Auto sync skipped (too soon since last sync)')
      }
      
      // Start periodic sync (setiap 1 jam)
      this.startPeriodicSync()
    }
  }

  // Start periodic sync
  startPeriodicSync() {
    this.stopPeriodicSync() // Stop existing sync
    
    this.syncInterval = setInterval(() => {
      console.log('⏰ Running periodic auto sync...')
      this.runAutoSync()
    }, 60 * 60 * 1000) // Setiap 1 jam
    
    console.log('🔄 Periodic auto sync started (every 1 hour)')
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
      console.log('⏹️ Periodic auto sync stopped')
    }
  }

  // Get last sync info
  getLastSyncInfo() {
    return {
      lastSyncTime: this.lastSyncTime || localStorage.getItem('lastAutoSyncTime'),
      isEnabled: this.isAutoSyncEnabled(),
      isRunning: this.isRunning
    }
  }
}

// Export singleton instance
export const autoSyncService = new AutoSyncService()

// Export fungsi untuk penggunaan mudah
export const initializeAutoSync = () => autoSyncService.initializeOnAppStart()
export const runAutoSync = () => autoSyncService.runAutoSync()
export const toggleAutoSync = (enabled) => autoSyncService.toggleAutoSync(enabled)
export const getAutoSyncStatus = () => autoSyncService.getLastSyncInfo()
