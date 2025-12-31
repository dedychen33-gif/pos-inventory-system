import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customers: [],

      // Direct setter for Firebase realtime sync
      setCustomers: (customers) => set({ customers }),

      // Add customer - save to Firebase first
      addCustomer: async (customer) => {
        const newCustomer = {
          ...customer,
          id: customer.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          totalPurchases: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('👥 Adding customer to Firebase:', newCustomer.name)
        const result = await firebaseDB.set(`customers/${newCustomer.id}`, newCustomer)
        
        if (result.success) {
          console.log('✅ Customer added to Firebase')
          return { success: true, customer: newCustomer }
        } else {
          console.error('❌ Failed to add customer:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update customer - save to Firebase first
      updateCustomer: async (id, updatedCustomer) => {
        const updateData = {
          ...updatedCustomer,
          updatedAt: new Date().toISOString()
        }

        console.log('👥 Updating customer in Firebase:', id)
        const result = await firebaseDB.update(`customers/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Customer updated in Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to update customer:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete customer - remove from Firebase and local state immediately
      deleteCustomer: async (id) => {
        console.log('👥 Deleting customer from Firebase:', id)
        
        // Remove from local state immediately to prevent race condition
        set(state => ({
          customers: state.customers.filter(c => c.id !== id)
        }))
        
        const result = await firebaseDB.remove(`customers/${id}`)
        
        if (result.success) {
          console.log('✅ Customer deleted from Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to delete customer:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update customer stats after purchase
      updateCustomerStats: async (customerId, purchaseAmount) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return

        const updateData = {
          totalPurchases: (customer.totalPurchases || 0) + 1,
          totalSpent: (customer.totalSpent || 0) + purchaseAmount,
          lastPurchase: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        await firebaseDB.update(`customers/${customerId}`, updateData)
      },

      // Get customer by phone
      getCustomerByPhone: (phone) => {
        return get().customers.find(c => c.phone === phone)
      },

      // Get customer by ID
      getCustomerById: (id) => {
        return get().customers.find(c => c.id === id)
      },

      // Set custom price for a customer
      setCustomPrice: async (customerId, productId, price) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return { success: false, error: 'Customer not found' }

        const customPrices = { ...(customer.customPrices || {}), [productId]: price }
        
        console.log('💰 Setting custom price for customer:', customerId, 'product:', productId, 'price:', price)
        const result = await firebaseDB.update(`customers/${customerId}`, {
          customPrices,
          updatedAt: new Date().toISOString()
        })

        if (result.success) {
          console.log('✅ Custom price saved')
          return { success: true }
        } else {
          console.error('❌ Failed to save custom price:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Remove custom price for a customer
      removeCustomPrice: async (customerId, productId) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return { success: false, error: 'Customer not found' }

        const customPrices = { ...(customer.customPrices || {}) }
        delete customPrices[productId]

        console.log('💰 Removing custom price for customer:', customerId, 'product:', productId)
        const result = await firebaseDB.update(`customers/${customerId}`, {
          customPrices,
          updatedAt: new Date().toISOString()
        })

        if (result.success) {
          console.log('✅ Custom price removed')
          return { success: true }
        } else {
          console.error('❌ Failed to remove custom price:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Save all custom prices at once
      saveCustomPrices: async (customerId, customPrices) => {
        const customer = get().customers.find(c => c.id === customerId)
        if (!customer) return { success: false, error: 'Customer not found' }

        console.log('💰 Saving all custom prices for customer:', customerId)
        const result = await firebaseDB.update(`customers/${customerId}`, {
          customPrices,
          updatedAt: new Date().toISOString()
        })

        if (result.success) {
          console.log('✅ All custom prices saved')
          return { success: true }
        } else {
          console.error('❌ Failed to save custom prices:', result.error)
          return { success: false, error: result.error }
        }
      }
    }),
    {
      name: 'customer-storage'
    }
  )
)
