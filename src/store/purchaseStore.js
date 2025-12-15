import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const usePurchaseStore = create(
  persist(
    (set, get) => ({
      suppliers: [],
      purchases: [],
      
      // Direct setters for realtime sync
      setSuppliers: (suppliers) => set({ suppliers }),
      setPurchases: (purchases) => set({ purchases }),

      addSupplier: async (supplier) => {
        const newSupplier = { 
          ...supplier, 
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          createdAt: new Date().toISOString()
        }
        
        console.log('🚚 Adding supplier to Firebase:', newSupplier)
        
        // Save to Firebase
        const result = await firebaseDB.set(`suppliers/${newSupplier.id}`, newSupplier)
        console.log('🚚 Firebase result:', result)
        
        // Also update local state immediately for better UX
        set((state) => ({
          suppliers: [...state.suppliers, newSupplier]
        }))
      },

      updateSupplier: async (id, updatedSupplier) => {
        // Update Firebase
        await firebaseDB.update(`suppliers/${id}`, updatedSupplier)
        // Local state will be updated by Firebase listener
      },

      deleteSupplier: async (id) => {
        // Delete from Firebase
        await firebaseDB.remove(`suppliers/${id}`)
        // Local state will be updated by Firebase listener
      },

      addPurchase: async (purchase) => {
        const purchaseCount = get().purchases.length
        const newPurchase = { 
          ...purchase, 
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          purchaseNumber: `PO${String(purchaseCount + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString()
        }
        
        console.log('📦 Adding purchase to Firebase:', newPurchase)
        
        // Save to Firebase
        await firebaseDB.set(`purchases/${newPurchase.id}`, newPurchase)
        // Local state will be updated by Firebase listener
      },

      updatePurchase: async (id, updatedPurchase) => {
        // Update Firebase
        await firebaseDB.update(`purchases/${id}`, updatedPurchase)
        // Local state will be updated by Firebase listener
      },

      deletePurchase: async (id) => {
        // Delete from Firebase
        await firebaseDB.remove(`purchases/${id}`)
        // Local state will be updated by Firebase listener
      }
    }),
    {
      name: 'purchase-storage'
    }
  )
)
