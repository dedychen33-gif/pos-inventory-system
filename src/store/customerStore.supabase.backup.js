import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const WALKIN_ID = '00000000-0000-0000-0000-000000000001'

const initialCustomers = [
  { id: WALKIN_ID, name: 'Walk-in Customer', phone: '', email: '', type: 'walk-in', points: 0, totalSpent: 0, customPrices: {} }
]

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: initialCustomers,
      isOnline: false,

      // Direct setter for realtime sync
      setCustomers: (customers) => set({ customers }),

      // NOTE: Realtime subscriptions are handled centrally in useRealtimeSync.js
      // This prevents duplicate subscriptions and conflicts
      initRealtime: async () => {
        if (!isSupabaseConfigured()) return
        set({ isOnline: true })
        console.log('👤 CustomerStore: Using central realtime sync from useRealtimeSync.js')
      },

      fetchCustomers: async () => {
        if (!isSupabaseConfigured()) return

        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name')

        if (!error && data) {
          set({ customers: data.map(transformCustomer) })
        }
      },
      
      addCustomer: async (customer) => {
        const tempId = Date.now()
        const newCustomer = {
          ...customer,
          id: tempId,
          points: 0,
          totalSpent: 0,
          customPrices: {},
          type: customer.type || 'member',
          createdAt: new Date().toISOString()
        }
        
        // Save to Supabase first (let Supabase auto-generate ID if integer)
        if (isSupabaseConfigured()) {
          const { data, error } = await supabase.from('customers').insert({
            name: newCustomer.name,
            phone: newCustomer.phone || '',
            email: newCustomer.email || '',
            address: newCustomer.address || '',
            points: 0,
            total_spent: 0
          }).select().single()
          
          if (error) {
            console.error('❌ Error adding customer to Supabase:', error.message)
            // Still save locally with temp ID
            set((state) => ({ customers: [...state.customers, newCustomer] }))
          } else {
            console.log('✅ Customer added to Supabase:', data.name, 'ID:', data.id)
            // Use the ID from Supabase
            const savedCustomer = {
              ...newCustomer,
              id: data.id
            }
            set((state) => ({ customers: [...state.customers, savedCustomer] }))
            return savedCustomer
          }
        } else {
          // No Supabase, save locally
          set((state) => ({ customers: [...state.customers, newCustomer] }))
        }
        
        return newCustomer
      },
      
      updateCustomer: async (id, updatedCustomer) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c))
        }))

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('customers').update({
            name: updatedCustomer.name,
            phone: updatedCustomer.phone || '',
            email: updatedCustomer.email || '',
            address: updatedCustomer.address || '',
            type: updatedCustomer.type || 'member',
            points: updatedCustomer.points || 0,
            total_spent: updatedCustomer.totalSpent || 0
          }).eq('id', id)
          
          if (error) {
            console.error('❌ Error updating customer:', error.message)
          } else {
            console.log('✅ Customer updated in Supabase')
          }
        }
      },
      
      deleteCustomer: async (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id)
        }))

        if (isSupabaseConfigured()) {
          const { error } = await supabase.from('customers').delete().eq('id', id)
          if (error) {
            console.error('❌ Error deleting customer:', error.message)
          } else {
            console.log('✅ Customer deleted from Supabase')
          }
        }
      },
      
      addPoints: async (customerId, points) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const newPoints = customer.points + points
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, points: newPoints } : c
          )
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({ points: newPoints }).eq('id', customerId)
        }
      },
      
      redeemPoints: async (customerId, points) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const newPoints = Math.max(0, customer.points - points)
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, points: newPoints } : c
          )
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({ points: newPoints }).eq('id', customerId)
        }
      },
      
      addTransaction: async (customerId, amount) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const newTotal = customer.totalSpent + amount
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, totalSpent: newTotal } : c
          )
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({ total_spent: newTotal }).eq('id', customerId)
        }
      },
      
      setCustomPrice: async (customerId, productId, price) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const newPrices = { ...customer.customPrices, [productId]: price }
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, customPrices: newPrices } : c
          )
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({ custom_prices: newPrices }).eq('id', customerId)
        }
      },
      
      removeCustomPrice: async (customerId, productId) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const newPrices = { ...customer.customPrices }
        delete newPrices[productId]
        
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === customerId ? { ...c, customPrices: newPrices } : c
          )
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({ custom_prices: newPrices }).eq('id', customerId)
        }
      }
    }),
    {
      name: 'customer-storage'
    }
  )
)

function transformCustomer(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    type: row.type || 'member',
    points: row.points || 0,
    totalSpent: parseFloat(row.total_spent) || 0,
    customPrices: row.custom_prices || {}
  }
}
