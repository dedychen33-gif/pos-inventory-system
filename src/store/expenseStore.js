import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useExpenseStore = create(
  persist(
    (set, get) => ({
      expenses: [],

      // Direct setter for Firebase realtime sync
      setExpenses: (expenses) => set({ expenses }),

      // Add expense - save to Firebase and update local state
      addExpense: async (expense) => {
        const newExpense = {
          ...expense,
          id: expense.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('💸 Adding expense to Firebase:', newExpense.description)
        const result = await firebaseDB.set(`expenses/${newExpense.id}`, newExpense)
        
        if (result.success) {
          console.log('✅ Expense added to Firebase')
          // Firebase sync will update local state automatically
          return { success: true, expense: newExpense }
        } else {
          console.error('❌ Failed to add expense:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update expense - save to Firebase and update local state
      updateExpense: async (id, updatedExpense) => {
        const updateData = {
          ...updatedExpense,
          updatedAt: new Date().toISOString()
        }

        console.log('💸 Updating expense in Firebase:', id)
        const result = await firebaseDB.update(`expenses/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Expense updated in Firebase')
          // Firebase sync will update local state automatically
          return { success: true }
        } else {
          console.error('❌ Failed to update expense:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete expense - remove from Firebase and update local state
      deleteExpense: async (id) => {
        console.log('💸 Deleting expense from Firebase:', id)
        const result = await firebaseDB.remove(`expenses/${id}`)
        
        if (result.success) {
          console.log('✅ Expense deleted from Firebase')
          // Update local state immediately for better UX
          set(state => ({
            expenses: state.expenses.filter(e => e.id !== id)
          }))
          return { success: true }
        } else {
          console.error('❌ Failed to delete expense:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Get expenses by date range
      getExpensesByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()
        return get().expenses.filter(e => {
          const date = new Date(e.date || e.createdAt).getTime()
          return date >= start && date <= end
        })
      },

      // Get today's expenses
      getTodayExpenses: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        return get().expenses.filter(e => {
          const date = new Date(e.date || e.createdAt)
          return date >= today && date < tomorrow
        })
      },

      // Get total expenses for today
      getTodayTotal: () => {
        const todayExpenses = get().getTodayExpenses()
        return todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
      },

      // Get expenses by category
      getExpensesByCategory: (category) => {
        return get().expenses.filter(e => e.category === category)
      },

      // Get expense by ID
      getExpenseById: (id) => {
        return get().expenses.find(e => e.id === id)
      }
    }),
    {
      name: 'expense-storage'
    }
  )
)
