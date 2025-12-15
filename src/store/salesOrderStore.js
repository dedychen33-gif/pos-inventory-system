import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

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
        
        // Save to Firebase
        try {
          await firebaseDB.set(`salesOrders/${newOrder.id}`, newOrder)
          console.log('✅ Sales order added to Firebase:', newOrder.orderNumber)
        } catch (error) {
          console.error('❌ Error adding sales order to Firebase:', error.message)
        }
        
        set((state) => ({
          salesOrders: [...state.salesOrders, newOrder]
        }))
        
        return newOrder
      },

      updateSalesOrder: async (id, updatedOrder) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id ? { ...o, ...updatedOrder } : o
          )
        }))

        try {
          await firebaseDB.update(`salesOrders/${id}`, updatedOrder)
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
      name: 'sales-order-storage'
    }
  )
)
