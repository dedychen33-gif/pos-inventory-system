import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuditStore, AUDIT_ACTIONS } from './auditStore'

export const useTransactionStore = create(
  persist(
    (set, get) => ({
      transactions: [],
      isOnline: false,

      // Direct setter for realtime sync
      setTransactions: (transactions) => set({ transactions }),

      // Initialize realtime subscription
      initRealtime: async () => {
        if (!isSupabaseConfigured()) return

        try {
          await get().fetchTransactions()
          set({ isOnline: true })

          supabase
            .channel('transactions-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
              if (payload.eventType === 'INSERT') {
                set((state) => ({ 
                  transactions: [transformTransaction(payload.new), ...state.transactions.filter(t => t.id !== payload.new.id)]
                }))
              } else if (payload.eventType === 'UPDATE') {
                set((state) => ({
                  transactions: state.transactions.map((t) => t.id === payload.new.id ? transformTransaction(payload.new) : t)
                }))
              }
            })
            .subscribe()
        } catch (error) {
          console.error('Transaction realtime error:', error)
        }
      },

      fetchTransactions: async () => {
        if (!isSupabaseConfigured()) return

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500)

        if (!error && data) {
          set({ transactions: data.map(transformTransaction) })
        }
      },
      
      addTransaction: async (transaction) => {
        const transactionCode = `TRX${Date.now()}`
        const newTransaction = {
          ...transaction,
          id: crypto.randomUUID ? crypto.randomUUID() : transactionCode,
          transactionCode,
          date: new Date().toISOString(),
          status: 'completed',
          source: transaction.source || 'pos' // 'pos', 'shopee', 'lazada', 'tokopedia', 'tiktok'
        }
        
        set((state) => ({
          transactions: [newTransaction, ...state.transactions]
        }))

        // Audit log for new transaction
        useAuditStore.getState().addLog(
          AUDIT_ACTIONS.TRANSACTION_CREATE,
          {
            transactionId: newTransaction.id,
            transactionCode,
            total: transaction.total,
            itemCount: transaction.items?.length || 0,
            paymentMethod: transaction.paymentMethod,
            source: newTransaction.source
          },
          transaction.cashierId || null,
          transaction.cashierName || null
        )

        if (isSupabaseConfigured()) {
          await supabase.from('transactions').insert({
            id: newTransaction.id,
            transaction_code: transactionCode,
            customer_id: transaction.customer?.id,
            items: transaction.items,
            subtotal: transaction.subtotal,
            discount: transaction.discount,
            tax: transaction.tax,
            total: transaction.total,
            payment_method: transaction.paymentMethod,
            cash_amount: transaction.cashAmount,
            change_amount: transaction.change,
            status: 'completed',
            cashier_name: transaction.cashierName
          })
        }
        
        return newTransaction
      },
      
      voidTransaction: async (id, reason, restoreStockFn = null, userId = null, userName = null) => {
        const transaction = get().transactions.find(t => t.id === id)
        const voidDate = new Date().toISOString()
        
        // Mark transaction as void
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, status: 'void', voidReason: reason, voidDate } : t
          )
        }))

        // Audit log for void transaction
        useAuditStore.getState().addLog(
          AUDIT_ACTIONS.TRANSACTION_VOID,
          {
            transactionId: id,
            transactionCode: transaction?.transactionCode,
            originalTotal: transaction?.total,
            reason,
            itemsRestored: transaction?.items?.length || 0
          },
          userId,
          userName
        )

        // Restore stock if function provided and transaction has items
        if (restoreStockFn && transaction && transaction.items) {
          for (const item of transaction.items) {
            await restoreStockFn(
              item.id, 
              item.quantity, 
              'add', 
              'return', 
              `Void transaksi: ${id} - ${reason}`,
              userId
            )
          }
        }

        if (isSupabaseConfigured()) {
          await supabase.from('transactions').update({
            status: 'void',
            void_reason: reason,
            void_date: voidDate
          }).eq('id', id)
        }
        
        return { success: true, transaction }
      },
      
      getTransactionsByDate: (startDate, endDate) => {
        return get().transactions.filter((t) => {
          const transactionDate = new Date(t.date)
          return transactionDate >= startDate && transactionDate <= endDate
        })
      },
      
      getTodayTransactions: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        return get().transactions.filter((t) => {
          const transactionDate = new Date(t.date)
          transactionDate.setHours(0, 0, 0, 0)
          return transactionDate.getTime() === today.getTime() && t.status === 'completed'
        })
      },
      
      getTodaySales: () => {
        const todayTransactions = get().getTodayTransactions()
        return todayTransactions.reduce((total, t) => total + t.total, 0)
      },
      
      getTransactionCount: () => {
        return get().transactions.filter((t) => t.status === 'completed').length
      },
      
      // Update transaction (for marketplace sync)
      updateTransaction: (id, updates) => {
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates } : t
          )
        }))
      },
      
      // Clear all marketplace transactions (for fresh re-sync)
      clearMarketplaceTransactions: () => {
        set((state) => ({
          transactions: state.transactions.filter(t => 
            t.source !== 'shopee' && 
            t.source !== 'lazada' && 
            t.source !== 'tokopedia' && 
            t.source !== 'tiktok' &&
            !t.marketplaceSource
          )
        }))
      }
    }),
    {
      name: 'transaction-storage'
    }
  )
)

function transformTransaction(row) {
  return {
    id: row.id,
    transactionCode: row.transaction_code,
    customerId: row.customer_id,
    items: row.items || [],
    subtotal: parseFloat(row.subtotal) || 0,
    discount: parseFloat(row.discount) || 0,
    tax: parseFloat(row.tax) || 0,
    total: parseFloat(row.total) || 0,
    paymentMethod: row.payment_method,
    cashAmount: parseFloat(row.cash_amount) || 0,
    change: parseFloat(row.change_amount) || 0,
    status: row.status,
    voidReason: row.void_reason,
    voidDate: row.void_date,
    cashierName: row.cashier_name,
    source: row.source || 'pos',
    date: row.created_at
  }
}
