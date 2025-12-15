import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

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
        
        // Save to Supabase first
        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('sales_orders').insert({
            id: newOrder.id,
            order_number: newOrder.orderNumber,
            customer_id: newOrder.customer?.id ? String(newOrder.customer.id) : null,
            customer_name: newOrder.customer?.name || 'Walk-in Customer',
            items: newOrder.items || [],
            subtotal: Number(newOrder.subtotal) || 0,
            discount: Number(newOrder.discount) || 0,
            total: Number(newOrder.total) || 0,
            status: newOrder.status || 'pending',
            due_date: newOrder.dueDate || null,
            notes: newOrder.notes || '',
            order_date: newOrder.date || new Date().toISOString(),
            created_at: newOrder.createdAt
          })
          
          if (error) {
            console.error('❌ Error adding sales order to Supabase:', error.message)
          } else {
            console.log('✅ Sales order added to Supabase:', newOrder.orderNumber)
          }
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

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('sales_orders').update({
            customer_id: updatedOrder.customer?.id ? String(updatedOrder.customer.id) : null,
            customer_name: updatedOrder.customer?.name || 'Walk-in Customer',
            items: updatedOrder.items || [],
            subtotal: Number(updatedOrder.subtotal) || 0,
            discount: Number(updatedOrder.discount) || 0,
            total: Number(updatedOrder.total) || 0,
            status: updatedOrder.status || 'pending',
            due_date: updatedOrder.dueDate || null,
            notes: updatedOrder.notes || '',
            order_date: updatedOrder.date
          }).eq('id', id)
          
          if (error) {
            console.error('❌ Error updating sales order:', error.message)
          } else {
            console.log('✅ Sales order updated in Supabase')
          }
        }
      },

      deleteSalesOrder: async (id) => {
        set((state) => ({
          salesOrders: state.salesOrders.filter((o) => o.id !== id)
        }))

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('sales_orders').delete().eq('id', id)
          if (error) {
            console.error('❌ Error deleting sales order:', error.message)
          } else {
            console.log('✅ Sales order deleted from Supabase')
          }
        }
      },

      updateStatus: async (id, status) => {
        set((state) => ({
          salesOrders: state.salesOrders.map((o) =>
            o.id === id ? { ...o, status } : o
          )
        }))

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('sales_orders').update({ status }).eq('id', id)
          if (error) {
            console.error('❌ Error updating status:', error.message)
          }
        }
      }
    }),
    {
      name: 'sales-order-storage'
    }
  )
)
