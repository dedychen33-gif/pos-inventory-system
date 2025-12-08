import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Warehouse, 
  TrendingUp,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Truck,
  ChevronRight,
  ScanLine,
  Store,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { isAndroid } from '../utils/platform'
import { isSupabaseConfigured } from '../lib/supabase'

// Filter menu items based on platform
const allMenuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'all' },
  { path: '/pos', icon: ShoppingCart, label: 'POS / Kasir', permission: 'pos', webOnly: true },
  { path: '/scanner', icon: ScanLine, label: 'Remote Scanner', permission: 'pos', androidOnly: true },
  { path: '/products', icon: Package, label: 'Master Produk', permission: 'products' },
  { path: '/marketplace/integration', icon: Store, label: 'Marketplace', permission: 'marketplace' },
  { path: '/stock', icon: Warehouse, label: 'Stok', permission: 'stock' },
  { path: '/purchases', icon: Truck, label: 'Pembelian', permission: 'purchase' },
  { path: '/sales', icon: TrendingUp, label: 'Penjualan', permission: 'sales' },
  { path: '/customers', icon: Users, label: 'Pelanggan', permission: 'customers' },
  { path: '/reports', icon: FileText, label: 'Laporan', permission: 'reports' },
  { path: '/settings', icon: Settings, label: 'Pengaturan', permission: 'settings' },
]

// Filter out webOnly items on Android and androidOnly items on Web
const menuItems = allMenuItems.filter(item => {
  if (item.webOnly && isAndroid) return false
  if (item.androidOnly && !isAndroid) return false
  return true
})

// Bottom nav items (different for Android vs Web)
const allBottomNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/pos', icon: ShoppingCart, label: 'Kasir', webOnly: true },
  { path: '/scanner', icon: ScanLine, label: 'Scanner', androidOnly: true },
  { path: '/products', icon: Package, label: 'Master Produk' },
  { path: '/stock', icon: Warehouse, label: 'Stok' },
]

// Filter bottom nav for platform
const bottomNavItems = allBottomNavItems.filter(item => {
  if (item.webOnly && isAndroid) return false
  if (item.androidOnly && !isAndroid) return false
  return true
})

export default function Layout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState({ isOnline: false, isSyncing: false })
  const location = useLocation()
  const { user, logout } = useAuthStore()

  // Auto-show sidebar when mouse is at left edge of screen
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Show sidebar when mouse is within 10px of left edge
      if (e.clientX <= 10 && !drawerOpen) {
        setDrawerOpen(true)
      }
    }

    // Only add listener on non-touch devices (desktop)
    if (!('ontouchstart' in window)) {
      document.addEventListener('mousemove', handleMouseMove)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [drawerOpen])

  // Poll sync status from global window object
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.__syncStatus) {
        setSyncStatus(window.__syncStatus)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      logout()
    }
  }

  const hasAccess = (permission) => {
    if (!user) return false
    if (user.permissions.includes('all')) return true
    return user.permissions.includes(permission) || user.permissions.includes(`${permission}_view`)
  }

  const closeDrawer = () => setDrawerOpen(false)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top App Bar */}
      <header className="bg-dark text-white px-4 py-3 flex items-center justify-between z-40 safe-area-top">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-700 active:bg-gray-600"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg font-semibold">
          {menuItems.find(item => item.path === location.pathname)?.label || 'POS System'}
        </h1>
        {/* Cloud sync indicator */}
        <div 
          className="flex items-center gap-1" 
          title={
            syncStatus.isSyncing 
              ? 'Syncing...' 
              : syncStatus.isOnline 
                ? `Cloud Sync Active${syncStatus.lastSync ? ` - Last: ${new Date(syncStatus.lastSync).toLocaleTimeString()}` : ''}`
                : isSupabaseConfigured() 
                  ? 'Connecting to cloud...'
                  : 'Offline Mode'
          }
        >
          {syncStatus.isSyncing ? (
            <RefreshCw size={20} className="text-yellow-400 animate-spin" />
          ) : syncStatus.isOnline ? (
            <Cloud size={20} className="text-green-400" />
          ) : isSupabaseConfigured() ? (
            <Cloud size={20} className="text-yellow-400 animate-pulse" />
          ) : (
            <CloudOff size={20} className="text-gray-400" />
          )}
        </div>
      </header>

      {/* Drawer Overlay */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer / Side Menu */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-dark text-white z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-700 safe-area-top flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">POS System</h1>
            <button
              onClick={closeDrawer}
              className="p-2 rounded-full hover:bg-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <User size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Menu Items - Scrollable */}
        <nav className="flex-1 p-2 overflow-y-auto min-h-0">
          {menuItems.map((item) => {
            if (!hasAccess(item.permission)) return null
            
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeDrawer}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1 text-sm">{item.label}</span>
                <ChevronRight size={16} className="text-gray-500" />
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-700 safe-area-bottom flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-300 hover:bg-red-600 hover:text-white active:bg-red-700 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {bottomNavItems.map((item) => {
            if (!hasAccess(item.permission || 'all')) return null
            
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500 active:text-gray-700'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          {/* More menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-500 active:text-gray-700"
          >
            <Menu size={24} />
            <span className="text-xs mt-1">Lainnya</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
