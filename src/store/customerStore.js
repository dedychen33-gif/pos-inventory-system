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

      // Initialize realtime subscription
      initRealtime: async () => {
        if (!isSupabaseConfigured()) return

        try {
          await get().fetchCustomers()
          set({ isOnline: true })

          supabase
            .channel('customers-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
              if (payload.eventType === 'INSERT') {
                set((state) => ({ 
                  customers: [...state.customers.filter(c => c.id !== payload.new.id), transformCustomer(payload.new)] 
                }))
              } else if (payload.eventType === 'UPDATE') {
                set((state) => ({
                  customers: state.customers.map((c) => c.id === payload.new.id ? transformCustomer(payload.new) : c)
                }))
              } else if (payload.eventType === 'DELETE') {
                set((state) => ({
                  customers: state.customers.filter((c) => c.id !== payload.old.id)
                }))
              }
            })
            .subscribe()
        } catch (error) {
          console.error('Customer realtime error:', error)
        }
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
        const newCustomer = {
          ...customer,
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          points: 0,
          totalSpent: 0,
          type: customer.type || 'member'
        }
        set((state) => ({ customers: [...state.customers, newCustomer] }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').insert({
            id: newCustomer.id,
            name: newCustomer.name,
            phone: newCustomer.phone,
            email: newCustomer.email,
            address: newCustomer.address,
            type: newCustomer.type,
            points: 0,
            total_spent: 0,
            custom_prices: {}
          })
        }
      },
      
      updateCustomer: async (id, updatedCustomer) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c))
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').update({
            name: updatedCustomer.name,
            phone: updatedCustomer.phone,
            email: updatedCustomer.email,
            address: updatedCustomer.address,
            type: updatedCustomer.type
          }).eq('id', id)
        }
      },
      
      deleteCustomer: async (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id)
        }))

        if (isSupabaseConfigured()) {
          await supabase.from('customers').delete().eq('id', id)
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
