import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuditStore = create(
  persist(
    (set, get) => ({
      logs: [],
      
      // Add audit log entry
      addLog: (action, details, userId = null, userName = null) => {
        const log = {
          id: `LOG${Date.now()}`,
          timestamp: new Date().toISOString(),
          action, // login, logout, transaction, void, stock_adjust, product_add, etc.
          details, // object with relevant data
          userId,
          userName,
          ipAddress: null // Could be populated if needed
        }
        
        set((state) => ({
          logs: [log, ...state.logs].slice(0, 5000) // Keep last 5000 logs
        }))
        
        return log
      },
      
      // Get logs by action type
      getLogsByAction: (action) => {
        return get().logs.filter(log => log.action === action)
      },
      
      // Get logs by user
      getLogsByUser: (userId) => {
        return get().logs.filter(log => log.userId === userId)
      },
      
      // Get logs by date range
      getLogsByDateRange: (startDate, endDate) => {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        
        return get().logs.filter(log => {
          const logDate = new Date(log.timestamp)
          return logDate >= start && logDate <= end
        })
      },
      
      // Get recent logs
      getRecentLogs: (limit = 50) => {
        return get().logs.slice(0, limit)
      },
      
      // Clear old logs (keep last N days)
      clearOldLogs: (daysToKeep = 30) => {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
        
        set((state) => ({
          logs: state.logs.filter(log => new Date(log.timestamp) > cutoffDate)
        }))
      },
      
      // Export logs to JSON
      exportLogs: (startDate = null, endDate = null) => {
        let logsToExport = get().logs
        
        if (startDate && endDate) {
          logsToExport = get().getLogsByDateRange(startDate, endDate)
        }
        
        return JSON.stringify(logsToExport, null, 2)
      }
    }),
    {
      name: 'audit-storage'
    }
  )
)

// Audit action types
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  
  // Transactions
  TRANSACTION_CREATE: 'transaction_create',
  TRANSACTION_VOID: 'transaction_void',
  
  // Products
  PRODUCT_ADD: 'product_add',
  PRODUCT_EDIT: 'product_edit',
  PRODUCT_DELETE: 'product_delete',
  
  // Stock
  STOCK_ADJUST: 'stock_adjust',
  STOCK_PURCHASE: 'stock_purchase',
  STOCK_OPNAME: 'stock_opname',
  STOCK_TRANSFER: 'stock_transfer',
  
  // Customers
  CUSTOMER_ADD: 'customer_add',
  CUSTOMER_EDIT: 'customer_edit',
  CUSTOMER_DELETE: 'customer_delete',
  
  // Settings
  SETTINGS_CHANGE: 'settings_change',
  
  // Marketplace
  MARKETPLACE_SYNC: 'marketplace_sync',
  MARKETPLACE_CONNECT: 'marketplace_connect'
}
