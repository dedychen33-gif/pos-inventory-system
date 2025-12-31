import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import CryptoJS from 'crypto-js'
import { useAuditStore, AUDIT_ACTIONS } from './auditStore'
import { firebaseDB } from '../lib/firebase'

// Sync user to Firebase cloud
const syncUserToCloud = async (user) => {
  try {
    await firebaseDB.set(`app_users/${user.id}`, {
      id: user.id,
      username: user.username,
      password_hash: user.password,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      is_active: user.isActive,
      created_at: user.createdAt,
      updated_at: user.updatedAt || new Date().toISOString()
    })
    console.log('✅ User synced to Firebase:', user.username)
  } catch (err) {
    console.error('❌ User sync error:', err.message)
  }
}

// Hash password function
const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString()
}

// Verify password function
const verifyPassword = (inputPassword, storedPassword) => {
  // Support both hashed and plain text (for backward compatibility)
  const hashedInput = hashPassword(inputPassword)
  return hashedInput === storedPassword || inputPassword === storedPassword
}

// Available permissions
export const PERMISSIONS = {
  ALL: 'all',
  POS: 'pos',
  PRODUCTS: 'products',
  PRODUCTS_VIEW: 'products_view',
  STOCK: 'stock',
  CUSTOMERS: 'customers',
  CUSTOMERS_VIEW: 'customers_view',
  SALES: 'sales',
  PURCHASES: 'purchases',
  REPORTS: 'reports',
  MARKETPLACE: 'marketplace',
  SETTINGS: 'settings',
}

// Permission labels in Indonesian
export const PERMISSION_LABELS = {
  all: 'Semua Akses',
  pos: 'Kasir (POS)',
  products: 'Kelola Produk',
  products_view: 'Lihat Produk',
  stock: 'Kelola Stok',
  customers: 'Kelola Pelanggan',
  customers_view: 'Lihat Pelanggan',
  sales: 'Lihat Penjualan',
  purchases: 'Pembelian & Supplier',
  reports: 'Laporan',
  marketplace: 'Marketplace (Shopee)',
  settings: 'Pengaturan',
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      users: [
        {
          id: 1,
          username: 'admin',
          password: hashPassword('admin123'),
          name: 'Administrator',
          role: 'admin',
          permissions: ['all'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          // Marketplace credentials per user
          marketplaceCredentials: {
            shopee: {
              partnerId: '',
              partnerKey: '',
              shopId: '',
              accessToken: '',
              refreshToken: '',
              shopName: '',
              isConnected: false,
              lastSync: null
            }
          }
        },
        {
          id: 2,
          username: 'kasir',
          password: hashPassword('kasir123'),
          name: 'Kasir 1',
          role: 'cashier',
          permissions: ['pos', 'products_view', 'customers_view'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          marketplaceCredentials: {
            shopee: {
              partnerId: '',
              partnerKey: '',
              shopId: '',
              accessToken: '',
              refreshToken: '',
              shopName: '',
              isConnected: false,
              lastSync: null
            }
          }
        }
      ],

      // Setter for Firebase sync
      setUsers: (users) => set({ users }),
      
      login: (username, password) => {
        const users = get().users
        const foundUser = users.find(u => 
          u.username === username && 
          verifyPassword(password, u.password) && 
          u.isActive !== false
        )
        
        if (foundUser) {
          const { password: _, ...userWithoutPassword } = foundUser
          set({ user: userWithoutPassword, isAuthenticated: true })
          
          // Log successful login
          useAuditStore.getState().addLog(
            AUDIT_ACTIONS.LOGIN,
            { username: foundUser.username, role: foundUser.role },
            foundUser.id,
            foundUser.name
          )
          
          return { success: true }
        }
        
        // Log failed login attempt
        useAuditStore.getState().addLog(
          AUDIT_ACTIONS.LOGIN_FAILED,
          { username, reason: 'Invalid credentials' },
          null,
          null
        )
        
        // Check if user exists but inactive
        const inactiveUser = users.find(u => u.username === username && verifyPassword(password, u.password))
        if (inactiveUser && !inactiveUser.isActive) {
          return { success: false, error: 'Akun tidak aktif. Hubungi administrator.' }
        }
        
        return { success: false, error: 'Username atau password salah' }
      },
      
      logout: () => {
        const currentUser = get().user
        if (currentUser) {
          useAuditStore.getState().addLog(
            AUDIT_ACTIONS.LOGOUT,
            { username: currentUser.username },
            currentUser.id,
            currentUser.name
          )
        }
        set({ user: null, isAuthenticated: false })
      },

      // Add new user
      addUser: async (userData) => {
        const users = get().users
        
        // Check duplicate username
        if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
          return { success: false, error: 'Username sudah digunakan' }
        }
        
        const newUser = {
          id: Date.now(),
          username: userData.username,
          password: hashPassword(userData.password),
          name: userData.name,
          role: userData.role || 'cashier',
          permissions: userData.permissions || ['pos', 'products_view'],
          isActive: true,
          createdAt: new Date().toISOString(),
          marketplaceCredentials: {
            shopee: {
              partnerId: '',
              partnerKey: '',
              shopId: '',
              accessToken: '',
              refreshToken: '',
              shopName: '',
              isConnected: false,
              lastSync: null
            }
          }
        }
        
        set({ users: [...users, newUser] })
        
        // Sync to cloud
        await syncUserToCloud(newUser)
        
        return { success: true, user: newUser }
      },

      // Update user
      updateUser: async (userId, updates) => {
        const users = get().users
        const currentUser = get().user
        
        // Prevent editing the main admin if not admin
        const targetUser = users.find(u => u.id === userId)
        if (targetUser?.id === 1 && currentUser?.id !== 1) {
          return { success: false, error: 'Tidak bisa mengedit admin utama' }
        }
        
        // Check duplicate username (exclude current user)
        if (updates.username) {
          const duplicate = users.find(u => 
            u.id !== userId && 
            u.username.toLowerCase() === updates.username.toLowerCase()
          )
          if (duplicate) {
            return { success: false, error: 'Username sudah digunakan' }
          }
        }
        
        // Hash password if provided
        if (updates.password) {
          updates.password = hashPassword(updates.password)
        }
        
        const updatedUsers = users.map(u => 
          u.id === userId ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u
        )
        set({ users: updatedUsers })
        
        // Update current session if editing self
        if (currentUser?.id === userId) {
          const updatedUser = updatedUsers.find(u => u.id === userId)
          const { password: _, ...userWithoutPassword } = updatedUser
          set({ user: userWithoutPassword })
        }
        
        // Sync to cloud
        const updatedUser = updatedUsers.find(u => u.id === userId)
        if (updatedUser) {
          await syncUserToCloud(updatedUser)
        }
        
        return { success: true }
      },

      // Delete user
      deleteUser: (userId) => {
        const users = get().users
        const currentUser = get().user
        
        // Cannot delete self
        if (currentUser?.id === userId) {
          return { success: false, error: 'Tidak bisa menghapus akun sendiri' }
        }
        
        // Cannot delete main admin
        if (userId === 1) {
          return { success: false, error: 'Tidak bisa menghapus admin utama' }
        }
        
        set({ users: users.filter(u => u.id !== userId) })
        return { success: true }
      },

      // Toggle user active status
      toggleUserActive: (userId) => {
        const users = get().users
        const currentUser = get().user
        
        // Cannot deactivate self
        if (currentUser?.id === userId) {
          return { success: false, error: 'Tidak bisa menonaktifkan akun sendiri' }
        }
        
        // Cannot deactivate main admin
        if (userId === 1) {
          return { success: false, error: 'Tidak bisa menonaktifkan admin utama' }
        }
        
        const updatedUsers = users.map(u => 
          u.id === userId ? { ...u, isActive: !u.isActive } : u
        )
        set({ users: updatedUsers })
        return { success: true }
      },

      changePassword: async (username, newPassword) => {
        const users = get().users
        const updatedUsers = users.map(u => 
          u.username === username ? { ...u, password: hashPassword(newPassword), updatedAt: new Date().toISOString() } : u
        )
        set({ users: updatedUsers })
        
        // Sync to cloud
        const updatedUser = updatedUsers.find(u => u.username === username)
        if (updatedUser) {
          await syncUserToCloud(updatedUser)
        }
      },

      // Update marketplace credentials for a user
      updateMarketplaceCredentials: (userId, platform, credentials) => {
        const users = get().users
        const currentUser = get().user
        
        const updatedUsers = users.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              marketplaceCredentials: {
                ...u.marketplaceCredentials,
                [platform]: {
                  ...u.marketplaceCredentials?.[platform],
                  ...credentials
                }
              }
            }
          }
          return u
        })
        
        set({ users: updatedUsers })
        
        // Update current session if editing self
        if (currentUser?.id === userId) {
          const updatedUser = updatedUsers.find(u => u.id === userId)
          const { password: _, ...userWithoutPassword } = updatedUser
          set({ user: userWithoutPassword })
        }
        
        return { success: true }
      },

      // Get marketplace credentials for current user
      getMyMarketplaceCredentials: (platform) => {
        const user = get().user
        if (!user) return null
        
        // Get fresh data from users array
        const users = get().users
        const currentUser = users.find(u => u.id === user.id)
        
        return currentUser?.marketplaceCredentials?.[platform] || null
      },

      // Get user by ID
      getUserById: (userId) => {
        const users = get().users
        return users.find(u => u.id === userId)
      },
      
      hasPermission: (permission) => {
        const state = get()
        if (!state.user) return false
        if (state.user.permissions.includes('all')) return true
        return state.user.permissions.includes(permission)
      },

      // Check if current user is admin
      isAdmin: () => {
        const state = get()
        return state.user?.role === 'admin' || state.user?.permissions?.includes('all')
      },

      // Reset to default admin user
      resetToDefaultAdmin: () => {
        const defaultAdmin = {
          id: 1,
          username: 'admin',
          password: hashPassword('admin123'),
          name: 'Administrator',
          role: 'admin',
          permissions: ['all'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
        
        const defaultCashier = {
          id: 2,
          username: 'kasir',
          password: hashPassword('kasir123'),
          name: 'Kasir 1',
          role: 'cashier',
          permissions: ['pos', 'products_view', 'customers_view'],
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z'
        }
        
        set({ 
          users: [defaultAdmin, defaultCashier],
          user: { ...defaultAdmin, password: undefined },
          isAuthenticated: true
        })
        
        return { success: true }
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
