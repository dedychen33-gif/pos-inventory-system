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
        
        // Save to Firebase - local state will be updated by Firebase listener
        const result = await firebaseDB.set(`suppliers/${newSupplier.id}`, newSupplier)
        console.log('🚚 Firebase result:', result)
        
        // Return the new supplier for immediate UI feedback if needed
        return newSupplier
      },

      updateSupplier: async (id, updatedSupplier) => {
        // Update Firebase
        await firebaseDB.update(`suppliers/${id}`, updatedSupplier)
        // Local state will be updated by Firebase listener
      },

      deleteSupplier: async (id) => {
        // Delete from Firebase
        await firebaseDB.remove(`suppliers/${id}`)
        // Also update local state immediately for better UX
        set((state) => ({
          suppliers: state.suppliers.filter(s => s.id !== id)
        }))
      },

      addPurchase: async (purchase) => {
        const purchaseCount = get().purchases.length
        const newPurchase = { 
          ...purchase, 
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          purchaseNumber: purchase.poNumber || `PO${String(purchaseCount + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString()
        }
        
        console.log('📦 Adding purchase to Firebase:', newPurchase)
        
        // Save to Firebase - local state will be updated by Firebase listener
        await firebaseDB.set(`purchases/${newPurchase.id}`, newPurchase)
        return newPurchase
      },

      updatePurchase: async (id, updatedPurchase) => {
        // Update Firebase
        await firebaseDB.update(`purchases/${id}`, updatedPurchase)
        // Also update local state immediately
        set((state) => ({
          purchases: state.purchases.map(p => p.id === id ? { ...p, ...updatedPurchase } : p)
        }))
      },

      deletePurchase: async (id) => {
        // Delete from Firebase
        await firebaseDB.remove(`purchases/${id}`)
        // Also update local state immediately
        set((state) => ({
          purchases: state.purchases.filter(p => p.id !== id)
        }))
      }
    }),
    {
      name: 'purchase-storage'
    }
  )
)
