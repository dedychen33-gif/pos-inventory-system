import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

// Helper to remove undefined values (Firebase doesn't accept undefined)
const cleanUndefined = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined)
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefined(v)])
    )
  }
  return obj
}

export const useSalesOrderStore = create(
  persist(
    (set, get) => ({
      salesOrders: [],
      
      // Direct setter for realtime sync
      setSalesOrders: (salesOrders) => set({ salesOrders }),

      addSalesOrder: async (order) => {
        // Generate SO ID with format: SO-YYMMDD-HHMM-XXX
        const now = new Date()
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '') // HHMM
        const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0') // 000-999
        const soId = `SO-${dateStr}-${timeStr}-${randomNum}`
        
        const newOrder = {
          ...order,
          id: soId,
          orderNumber: order.orderNumber || soId,
          createdAt: now.toISOString()
        }
        
        // Save to Firebase (clean undefined values first)
        try {
          const cleanedOrder = cleanUndefined(newOrder)
          await firebaseDB.set(`salesOrders/${cleanedOrder.id}`, cleanedOrder)
          console.log('✅ Sales order added to Firebase:', newOrder.orderNumber)
          
          // Add to local state only if not already exists (avoid duplicates)
          set((state) => {
            const exists = state.salesOrders.some(o => o.id === newOrder.id)
            if (exists) return state
            return { salesOrders: [...state.salesOrders, newOrder] }
          })
        } catch (error) {
          console.error('❌ Error adding sales order to Firebase:', error.message)
        }
        
        return newOrder
      },

      updateSalesOrder: async (id, updatedOrder) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id ? { ...o, ...updatedOrder } : o
          )
        }))

        try {
          const cleanedUpdate = cleanUndefined(updatedOrder)
          await firebaseDB.update(`salesOrders/${id}`, cleanedUpdate)
          console.log('✅ Sales order updated in Firebase')
        } catch (error) {
          console.error('❌ Error updating sales order:', error.message)
        }
      },

      deleteSalesOrder: async (id) => {
        set((state) => ({
          salesOrders: state.salesOrders.filter((o) => o.id !== id)
        }))

        try {
          await firebaseDB.remove(`salesOrders/${id}`)
          console.log('✅ Sales order deleted from Firebase')
        } catch (error) {
          console.error('❌ Error deleting sales order:', error.message)
        }
      },

      updateStatus: async (id, status) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id ? { ...o, status } : o
          )
        }))

        try {
          await firebaseDB.update(`salesOrders/${id}`, { status })
        } catch (error) {
          console.error('❌ Error updating status:', error.message)
        }
      }
    }),
    {
      name: 'sales-order-storage',
      partialize: (state) => ({
        // Don't persist salesOrders - comes from Firebase realtime sync
      })
    }
  )
)
