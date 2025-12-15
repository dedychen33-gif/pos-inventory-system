import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useTransactionStore = create(
  persist(
    (set, get) => ({
      transactions: [],
      isOnline: true,

      // Direct setter for Firebase realtime sync
      setTransactions: (transactions) => set({ transactions }),

      // Add transaction - save to Firebase first
      addTransaction: async (transaction) => {
        const newTransaction = {
          ...transaction,
          id: transaction.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('💰 Adding transaction to Firebase:', newTransaction.id)
        const result = await firebaseDB.set(`transactions/${newTransaction.id}`, newTransaction)
        
        if (result.success) {
          console.log('✅ Transaction added to Firebase')
          return { success: true, transaction: newTransaction }
        } else {
          console.error('❌ Failed to add transaction:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update transaction - save to Firebase first
      updateTransaction: async (id, updatedTransaction) => {
        const updateData = {
          ...updatedTransaction,
          updatedAt: new Date().toISOString()
        }

        console.log('💰 Updating transaction in Firebase:', id)
        const result = await firebaseDB.update(`transactions/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Transaction updated in Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to update transaction:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete transaction - remove from Firebase
      deleteTransaction: async (id) => {
        console.log('💰 Deleting transaction from Firebase:', id)
        const result = await firebaseDB.remove(`transactions/${id}`)
        
        if (result.success) {
          console.log('✅ Transaction deleted from Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to delete transaction:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Get transactions by date range
      getTransactionsByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()
        return get().transactions.filter(t => {
          const date = new Date(t.createdAt).getTime()
          return date >= start && date <= end
        })
      },

      // Get today's transactions
      getTodayTransactions: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        return get().transactions.filter(t => {
          const date = new Date(t.createdAt)
          return date >= today && date < tomorrow
        })
      },

      // Get total sales for today
      getTodaySales: () => {
        const todayTransactions = get().getTodayTransactions()
        return todayTransactions
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + (t.total || 0), 0)
      },

      // Get transaction by ID
      getTransactionById: (id) => {
        return get().transactions.find(t => t.id === id)
      }
    }),
    {
      name: 'transaction-storage'
    }
  )
)
