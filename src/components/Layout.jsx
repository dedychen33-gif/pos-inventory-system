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
  Cloud,
  CloudOff,
  RefreshCw,
  Bell,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useProductStore } from '../store/productStore'
import { isAndroid } from '../utils/platform'
import { isSupabaseConfigured } from '../lib/supabase'

// Filter menu items based on platform
const allMenuItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', permission: 'all' },
  { path: '/pos', icon: ShoppingCart, label: 'POS / Kasir', permission: 'pos', webOnly: true },
  { path: '/scanner', icon: ScanLine, label: 'Remote Scanner', permission: 'pos', androidOnly: true },
  { path: '/products', icon: Package, label: 'Master Produk', permission: 'products' },
  { path: '/stock', icon: Warehouse, label: 'Stok', permission: 'stock' },
  { path: '/purchases', icon: Truck, label: 'Pembelian', permission: 'purchase' },
  { path: '/sales', icon: TrendingUp, label: 'Penjualan', permission: 'sales' },
  { path: '/returns', icon: RotateCcw, label: 'Barang Retur', permission: 'sales' },
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
  { path: '/products', icon: Package, label: 'Produk' },
  { path: '/sales', icon: TrendingUp, label: 'Penjualan' },
]

// Filter bottom nav for platform
const bottomNavItems = allBottomNavItems.filter(item => {
  if (item.webOnly && isAndroid) return false
  if (item.androidOnly && !isAndroid) return false
  return true
})

export default function Layout({ children }) {
  // On desktop, sidebar is always visible. On mobile/Android, it's a drawer
  const [drawerOpen, setDrawerOpen] = useState(!isAndroid && window.innerWidth >= 768)
  const [syncStatus, setSyncStatus] = useState({ isOnline: false, isSyncing: false })
  const [showNotifications, setShowNotifications] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { products } = useProductStore()

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      // Auto-open sidebar on desktop
      if (!mobile && !isAndroid) {
        setDrawerOpen(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate low stock alerts
  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 5) && p.stock > 0)
  const outOfStockProducts = products.filter(p => p.stock === 0)
  const totalAlerts = lowStockProducts.length + outOfStockProducts.length

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
      <header className="bg-dark text-white px-3 py-2.5 flex items-center justify-between z-40 safe-area-top">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-full hover:bg-gray-700 active:bg-gray-600"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-base sm:text-lg font-semibold truncate flex-1 mx-2">
          {menuItems.find(item => item.path === location.pathname)?.label || 'POS System'}
        </h1>
        <div className="flex items-center gap-2">
          
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full hover:bg-gray-700 active:bg-gray-600 relative"
            >
              <Bell size={20} />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalAlerts > 9 ? '9+' : totalAlerts}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)} 
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Notifikasi</h3>
                  </div>
                  {totalAlerts === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Tidak ada notifikasi
                    </div>
                  ) : (
                    <div className="divide-y">
                      {outOfStockProducts.length > 0 && (
                        <div className="p-3 bg-red-50">
                          <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                            <AlertTriangle size={16} />
                            <span>Stok Habis ({outOfStockProducts.length})</span>
                          </div>
                          <div className="space-y-1">
                            {outOfStockProducts.slice(0, 5).map(p => (
                              <div key={p.id} className="text-sm text-red-600">
                                • {p.name}
                              </div>
                            ))}
                            {outOfStockProducts.length > 5 && (
                              <div className="text-xs text-red-500">
                                ...dan {outOfStockProducts.length - 5} produk lainnya
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {lowStockProducts.length > 0 && (
                        <div className="p-3 bg-yellow-50">
                          <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                            <AlertTriangle size={16} />
                            <span>Stok Menipis ({lowStockProducts.length})</span>
                          </div>
                          <div className="space-y-1">
                            {lowStockProducts.slice(0, 5).map(p => (
                              <div key={p.id} className="text-sm text-yellow-600">
                                • {p.name} (sisa: {p.stock})
                              </div>
                            ))}
                            {lowStockProducts.length > 5 && (
                              <div className="text-xs text-yellow-500">
                                ...dan {lowStockProducts.length - 5} produk lainnya
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <Link 
                        to="/stock" 
                        onClick={() => setShowNotifications(false)}
                        className="block p-3 text-center text-primary hover:bg-gray-50 text-sm font-medium"
                      >
                        Lihat Semua Stok →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
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
        </div>
      </header>

      {/* Drawer Overlay - Only on mobile */}
      {drawerOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-50"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer / Side Menu */}
      <aside
        className={`fixed top-0 left-0 h-full bg-dark text-white z-50 transform transition-transform duration-300 ease-out flex flex-col ${
          isMobile ? 'w-[85vw] max-w-xs' : 'w-64'
        } ${
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
      <main className={`flex-1 overflow-y-auto ${isAndroid ? 'pb-20' : 'pb-16'} ${drawerOpen && !isMobile ? 'ml-64' : ''} transition-all duration-300`}>
        {children}
      </main>

      {/* Bottom Navigation - Android Optimized */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom shadow-lg">
        <div className={`flex justify-around items-center ${isAndroid ? 'h-16' : 'h-14'}`}>
          {bottomNavItems.map((item) => {
            if (!hasAccess(item.permission || 'all')) return null
            
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95 ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-500 active:text-primary/70'
                }`}
              >
                <div className={`${isActive ? 'bg-primary/10 px-4 py-1 rounded-full' : ''}`}>
                  <Icon size={isAndroid ? 24 : 20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`${isAndroid ? 'text-xs' : 'text-[10px]'} mt-0.5 leading-tight ${isActive ? 'font-semibold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          {/* More menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full text-gray-500 active:text-primary/70 active:scale-95`}
          >
            <Menu size={isAndroid ? 24 : 20} />
            <span className={`${isAndroid ? 'text-xs' : 'text-[10px]'} mt-0.5 leading-tight`}>Lainnya</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
