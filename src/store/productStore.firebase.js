import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useProductStore = create(
  persist(
    (set, get) => ({
      products: [],
      categories: ['Makanan', 'Minuman', 'Snack', 'Sembako', 'Elektronik', 'Alat Tulis', 'Paket Bundling', 'Marketplace'],
      units: ['pcs', 'kg', 'box', 'pack', 'lusin', 'kodi', 'gross', 'paket'],
      stockHistory: [],
      isOnline: true,
      isSyncing: false,

      // Direct setters for Firebase realtime sync
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setUnits: (units) => set({ units }),
      setStockHistory: (stockHistory) => set({ stockHistory }),

      // Add product - save to Firebase first
      addProduct: async (product) => {
        const newProduct = {
          ...product,
          id: product.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          code: product.code || `PRD${String(get().products.length + 1).padStart(3, '0')}`,
          cost: product.cost || product.costPrice || 0,
          costPrice: product.costPrice || product.cost || 0,
          price: product.price || product.sellingPrice || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('📦 Adding product to Firebase:', newProduct.name)
        const result = await firebaseDB.set(`products/${newProduct.id}`, newProduct)
        
        if (result.success) {
          // Local state will be updated by Firebase listener
          console.log('✅ Product added to Firebase')
          return { success: true, product: newProduct }
        } else {
          console.error('❌ Failed to add product:', result.error)
          return { success: false, error: result.error }
        }
      },
      
      // Update product - save to Firebase first
      updateProduct: async (id, updatedProduct) => {
        const updateData = {
          ...updatedProduct,
          cost: updatedProduct.cost || updatedProduct.costPrice || 0,
          costPrice: updatedProduct.costPrice || updatedProduct.cost || 0,
          price: updatedProduct.price || updatedProduct.sellingPrice || 0,
          updatedAt: new Date().toISOString()
        }

        console.log('📦 Updating product in Firebase:', id)
        const result = await firebaseDB.update(`products/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Product updated in Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to update product:', result.error)
          return { success: false, error: result.error }
        }
      },
      
      // Delete product - remove from Firebase
      deleteProduct: async (id) => {
        console.log('📦 Deleting product from Firebase:', id)
        const result = await firebaseDB.remove(`products/${id}`)
        
        if (result.success) {
          console.log('✅ Product deleted from Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to delete product:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Category management
      addCategory: (category) => {
        set((state) => ({
          categories: [...state.categories, category]
        }))
      },

      removeCategory: (category) => {
        set((state) => ({
          categories: state.categories.filter((c) => c !== category)
        }))
      },

      // Unit management
      addUnit: (unit) => {
        set((state) => ({
          units: [...state.units, unit]
        }))
      },

      removeUnit: (unit) => {
        set((state) => ({
          units: state.units.filter((u) => u !== unit)
        }))
      },

      // Update stock
      updateStock: async (id, quantity, type = 'set', reason = 'adjustment', note = '') => {
        const product = get().products.find(p => p.id === id)
        if (!product) return { success: false, error: 'Product not found' }

        const oldStock = product.stock || 0
        let newStock = oldStock
        
        if (type === 'add') newStock += quantity
        else if (type === 'subtract') newStock -= quantity
        else newStock = quantity
        
        newStock = Math.max(0, newStock)
        const change = newStock - oldStock

        // Record stock history
        const historyEntry = {
          id: Date.now().toString(),
          productId: id,
          productName: product.name,
          productSku: product.sku || product.code,
          oldStock,
          newStock,
          change,
          type: reason,
          note,
          createdAt: new Date().toISOString()
        }

        // Update in Firebase
        const result = await firebaseDB.update(`products/${id}`, { 
          stock: newStock,
          updatedAt: new Date().toISOString()
        })

        if (result.success) {
          // Update local stock history
          set((state) => ({
            stockHistory: [historyEntry, ...state.stockHistory].slice(0, 1000)
          }))
          return { success: true, oldStock, newStock, change }
        }

        return { success: false, error: 'Failed to update stock' }
      },

      // Bulk update stock
      bulkUpdateStock: async (updates, reason = 'sync_marketplace') => {
        const results = []
        for (const { productId, newStock, note } of updates) {
          const result = await get().updateStock(productId, newStock, 'set', reason, note)
          results.push({ productId, ...result })
        }
        return results
      },

      // Get product by barcode
      getProductByBarcode: (barcode) => {
        return get().products.find((p) => p.barcode === barcode)
      },
      
      // Get low stock products
      getLowStockProducts: () => {
        return get().products.filter((p) => (p.stock || 0) <= (p.minStock || 5))
      },

      // Get stock history for a product
      getProductStockHistory: (productId) => {
        return get().stockHistory.filter(h => h.productId === productId)
      },

      // Import Shopee products (simplified)
      importShopeeProducts: async (shopeeItems) => {
        let imported = 0
        let updated = 0
        const existingProducts = get().products

        for (const item of shopeeItems) {
          const shopeeId = `shopee_${item.item_id}`
          const existingIndex = existingProducts.findIndex(p => p.id === shopeeId)

          const productData = {
            id: shopeeId,
            shopeeItemId: item.item_id,
            code: `SHP${String(item.item_id).slice(-6)}`,
            sku: item.item_sku || '',
            name: item.item_name || `Shopee Product ${item.item_id}`,
            description: item.description || '',
            category: 'Marketplace',
            unit: 'pcs',
            price: item.price_info?.current_price || 0,
            cost: 0,
            costPrice: 0,
            stock: item.stock_info?.current_stock || 0,
            minStock: 5,
            image: item.image?.image_url_list?.[0] || '',
            source: 'shopee',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await firebaseDB.set(`products/${shopeeId}`, productData)
          
          if (existingIndex >= 0) {
            updated++
          } else {
            imported++
          }
        }

        return { imported, updated, total: shopeeItems.length }
      },

      // Clear Shopee products
      clearShopeeProducts: async () => {
        const shopeeProducts = get().products.filter(p => p.source === 'shopee')
        for (const product of shopeeProducts) {
          await firebaseDB.remove(`products/${product.id}`)
        }
        return shopeeProducts.length
      }
    }),
    {
      name: 'product-storage'
    }
  )
)
