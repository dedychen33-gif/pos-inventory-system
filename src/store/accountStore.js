import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useAccountStore = create(
  persist(
    (set, get) => ({
      // Accounts/Rekening (Cash, Bank, etc)
      accounts: [
        { id: 'cash', name: 'Kas', type: 'cash', balance: 0, isDefault: true },
      ],
      
      // Cash flow transactions
      cashFlows: [],

      // Direct setters for Firebase sync
      setAccounts: (accounts) => set({ accounts }),
      setCashFlows: (cashFlows) => set({ cashFlows }),

      // Add new account
      addAccount: async (account) => {
        const newAccount = {
          ...account,
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          balance: account.balance || 0,
          createdAt: new Date().toISOString()
        }
        
        console.log('🏦 Adding account to Firebase:', newAccount.name)
        await firebaseDB.set(`accounts/${newAccount.id}`, newAccount)
        return newAccount
      },

      // Update account
      updateAccount: async (id, updatedAccount) => {
        console.log('🏦 Updating account:', id)
        await firebaseDB.update(`accounts/${id}`, {
          ...updatedAccount,
          updatedAt: new Date().toISOString()
        })
      },

      // Delete account
      deleteAccount: async (id) => {
        console.log('🗑️ Deleting account:', id)
        await firebaseDB.remove(`accounts/${id}`)
      },

      // Add cash flow transaction (money in/out)
      addCashFlow: async (cashFlow) => {
        const newCashFlow = {
          ...cashFlow,
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          createdAt: new Date().toISOString()
        }
        
        console.log('💰 Adding cash flow:', newCashFlow.type, newCashFlow.amount)
        await firebaseDB.set(`cashFlows/${newCashFlow.id}`, newCashFlow)
        
        // Update account balance
        const accounts = get().accounts
        const account = accounts.find(a => a.id === cashFlow.accountId)
        if (account) {
          const newBalance = cashFlow.type === 'in' 
            ? (account.balance || 0) + cashFlow.amount
            : (account.balance || 0) - cashFlow.amount
          
          await firebaseDB.update(`accounts/${cashFlow.accountId}`, {
            balance: newBalance,
            updatedAt: new Date().toISOString()
          })
        }
        
        return newCashFlow
      },

      // Get account by id
      getAccountById: (id) => {
        return get().accounts.find(a => a.id === id)
      },

      // Get total balance across all accounts
      getTotalBalance: () => {
        return get().accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
      },

      // Get cash flows by date range
      getCashFlowsByDateRange: (startDate, endDate) => {
        return get().cashFlows.filter(cf => {
          const cfDate = new Date(cf.createdAt)
          return cfDate >= startDate && cfDate <= endDate
        })
      }
    }),
    {
      name: 'account-storage'
    }
  )
)
