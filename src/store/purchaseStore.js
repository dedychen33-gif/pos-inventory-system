import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const usePurchaseStore = create(
  persist(
    (set) => ({
      suppliers: [],
      purchases: [],

      addSupplier: (supplier) => {
        set((state) => ({
          suppliers: [...state.suppliers, { ...supplier, id: Date.now() }]
        }))
      },

      updateSupplier: (id, updatedSupplier) => {
        set((state) => ({
          suppliers: state.suppliers.map((s) =>
            s.id === id ? { ...s, ...updatedSupplier } : s
          )
        }))
      },

      deleteSupplier: (id) => {
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id)
        }))
      },

      addPurchase: (purchase) => {
        set((state) => ({
          purchases: [...state.purchases, { ...purchase, id: `PO${String(state.purchases.length + 1).padStart(3, '0')}` }]
        }))
      },

      updatePurchase: (id, updatedPurchase) => {
        set((state) => ({
          purchases: state.purchases.map((p) =>
            p.id === id ? { ...p, ...updatedPurchase } : p
          )
        }))
      },

      deletePurchase: (id) => {
        set((state) => ({
          purchases: state.purchases.filter((p) => p.id !== id)
        }))
      }
    }),
    {
      name: 'purchase-storage'
    }
  )
)
