import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Users,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  X,
  MessageCircle,
  Percent,
  Warehouse,
  Truck,
  FileText,
  Settings,
  ScanLine
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useProductStore } from '../store/productStore'
import { useTransactionStore } from '../store/transactionStore'
import { useCustomerStore } from '../store/customerStore'
import { useSettingsStore } from '../store/settingsStore'
import { Link } from 'react-router-dom'
import { isAndroid } from '../utils/platform'

export default function Dashboard() {
  const { products, getLowStockProducts } = useProductStore()
  const { transactions, getTodaySales, getTodayTransactions } = useTransactionStore()
  const { customers } = useCustomerStore()
  const { whatsappNumber, getWhatsAppLink } = useSettingsStore()
  
  const [showLowStockAlert, setShowLowStockAlert] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState([])

  const todaySales = getTodaySales()
  const todayTransactions = getTodayTransactions()
  const lowStockProducts = getLowStockProducts()
  
  // Calculate profit today (estimate based on cost)
  const todayProfit = todayTransactions.reduce((sum, t) => {
    if (t.status !== 'completed') return sum
    const itemsProfit = (t.items || []).reduce((itemSum, item) => {
      const product = products.find(p => p.id === item.id)
      const cost = product?.cost || 0
      return itemSum + ((item.price - cost) * item.quantity)
    }, 0)
    return sum + itemsProfit
  }, 0)
  
  // Products with zero stock (critical)
  const outOfStockProducts = products.filter(p => p.stock === 0)
  
  // Show alert banner if there are critical stock issues
  useEffect(() => {
    if (outOfStockProducts.length > 0 || lowStockProducts.length > 0) {
      setShowLowStockAlert(true)
    }
  }, [outOfStockProducts.length, lowStockProducts.length])

  const stats = [
    {
      title: 'Penjualan Hari Ini',
      value: `Rp ${todaySales.toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'bg-green-500',
      trend: '+12.5%',
      trendUp: true
    },
    {
      title: 'Transaksi Hari Ini',
      value: todayTransactions.length,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      trend: '+8.2%',
      trendUp: true
    },
    {
      title: 'Total Produk',
      value: products.length,
      icon: Package,
      color: 'bg-purple-500',
      trend: '+3',
      trendUp: true
    },
    {
      title: 'Total Pelanggan',
      value: customers.length,
      icon: Users,
      color: 'bg-orange-500',
      trend: '+15',
      trendUp: true
    },
  ]

  // Quick actions - different for Android vs Web
  const quickActions = isAndroid ? [
    { label: 'Scanner', path: '/scanner', color: 'bg-primary', icon: ScanLine },
    { label: 'Produk', path: '/products', color: 'bg-success', icon: Package },
    { label: 'Stok', path: '/stock', color: 'bg-warning', icon: Warehouse },
    { label: 'Pembelian', path: '/purchases', color: 'bg-info', icon: Truck },
    { label: 'Pelanggan', path: '/customers', color: 'bg-purple-500', icon: Users },
    { label: 'Laporan', path: '/reports', color: 'bg-pink-500', icon: FileText },
  ] : [
    { label: 'Transaksi Baru', path: '/pos', color: 'bg-primary', icon: ShoppingCart },
    { label: 'Tambah Produk', path: '/products', color: 'bg-success', icon: Package },
    { label: 'Cek Stok', path: '/stock', color: 'bg-warning', icon: Warehouse },
    { label: 'Barang Masuk', path: '/purchases', color: 'bg-info', icon: Truck },
  ]

  // Android-specific layout
  if (isAndroid) {
    return (
      <div className="p-4 space-y-4">
        {/* Critical Stock Alert Banner */}
        {showLowStockAlert && (outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
          <div className={`${outOfStockProducts.length > 0 ? 'bg-red-500' : 'bg-orange-500'} text-white p-3 rounded-xl flex items-center justify-between`}>
            <div className="flex items-center gap-2 flex-1">
              <Bell size={20} />
              <div className="flex-1">
                <p className="font-bold text-sm">
                  {outOfStockProducts.length > 0 
                    ? `⚠️ ${outOfStockProducts.length} produk HABIS!` 
                    : `⚠️ ${lowStockProducts.length} stok menipis`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link 
                to="/stock" 
                className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-xs font-medium"
              >
                Lihat
              </Link>
              <button 
                onClick={() => setShowLowStockAlert(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Header - Compact for Android */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Selamat datang di POS System</p>
        </div>

        {/* Stats Grid - 2x2 for Android */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <div className="flex items-center gap-0.5">
                    {stat.trendUp ? (
                      <ArrowUpRight size={14} className="text-green-600" />
                    ) : (
                      <ArrowDownRight size={14} className="text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">{stat.title}</p>
                <h3 className="text-lg font-bold text-gray-900 truncate">{stat.value}</h3>
              </div>
            )
          })}
        </div>

        {/* Quick Actions - Grid for Android */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-3">Menu Cepat</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <Link
                  key={index}
                  to={action.path}
                  className={`${action.color} text-white p-4 rounded-xl active:scale-95 transition-transform flex flex-col items-center justify-center`}
                >
                  <Icon size={28} className="mb-2" />
                  <p className="font-medium text-xs text-center">{action.label}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Profit Card - Compact */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-xs">Profit Hari Ini</p>
              <h3 className="text-2xl font-bold">Rp {todayProfit.toLocaleString('id-ID')}</h3>
              <p className="text-green-100 text-xs mt-1">
                {todayTransactions.filter(t => t.status === 'completed').length} transaksi
              </p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Percent size={24} />
            </div>
          </div>
        </div>

        {/* Low Stock - Compact List */}
        {lowStockProducts.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="text-warning" size={20} />
                Stok Menipis
              </h2>
              <Link to="/stock" className="text-primary text-sm font-medium">
                Lihat →
              </Link>
            </div>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <p className="font-medium text-gray-900 text-sm truncate flex-1">{product.name}</p>
                  <p className="font-bold text-orange-600 text-sm ml-2">{product.stock} {product.unit}</p>
                </div>
              ))}
              {lowStockProducts.length > 3 && (
                <p className="text-center text-xs text-gray-500">+{lowStockProducts.length - 3} lainnya</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Transactions - Compact */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">Transaksi Terbaru</h2>
            <Link to="/sales" className="text-primary text-sm font-medium">
              Lihat →
            </Link>
          </div>
          {todayTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm">Belum ada transaksi</p>
          ) : (
            <div className="space-y-2">
              {todayTransactions.slice(0, 3).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{transaction.id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <p className="font-bold text-green-600 text-sm">
                    Rp {transaction.total.toLocaleString('id-ID')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp CS Floating Button */}
        {whatsappNumber && (
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-20 right-4 bg-green-500 text-white p-3 rounded-full shadow-lg z-30"
          >
            <MessageCircle size={24} />
          </a>
        )}
      </div>
    )
  }

  // Web layout (original)
  return (
    <div className="p-6 space-y-6">
      {/* Critical Stock Alert Banner */}
      {showLowStockAlert && (outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
        <div className={`${outOfStockProducts.length > 0 ? 'bg-red-500' : 'bg-orange-500'} text-white p-4 rounded-xl flex items-center justify-between animate-pulse`}>
          <div className="flex items-center gap-3">
            <Bell size={24} />
            <div>
              <p className="font-bold">
                {outOfStockProducts.length > 0 
                  ? `⚠️ ${outOfStockProducts.length} produk HABIS!` 
                  : `⚠️ ${lowStockProducts.length} produk stok menipis`}
              </p>
              <p className="text-sm opacity-90">
                {outOfStockProducts.length > 0 
                  ? 'Segera lakukan restock untuk produk yang sudah habis'
                  : 'Beberapa produk mendekati batas minimum stok'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              to="/stock" 
              className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Lihat Detail
            </Link>
            <button 
              onClick={() => setShowLowStockAlert(false)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp CS Floating Button */}
      {whatsappNumber && (
        <a
          href={getWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-colors z-50 flex items-center gap-2"
          title="Hubungi Customer Service"
        >
          <MessageCircle size={24} />
        </a>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Selamat datang di sistem POS & Inventory Management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                  <div className="flex items-center gap-1 mt-2">
                    {stat.trendUp ? (
                      <ArrowUpRight size={16} className="text-green-600" />
                    ) : (
                      <ArrowDownRight size={16} className="text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.trend}
                    </span>
                    <span className="text-sm text-gray-500">vs kemarin</span>
                  </div>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <Icon size={24} className="text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.path}
                className={`${action.color} text-white p-6 rounded-xl hover:opacity-90 transition-opacity`}
              >
                <Icon size={32} className="mb-3" />
                <p className="font-semibold">{action.label}</p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Profit Summary Card */}
      <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Estimasi Profit Hari Ini</p>
            <h3 className="text-3xl font-bold mt-1">Rp {todayProfit.toLocaleString('id-ID')}</h3>
            <p className="text-green-100 text-sm mt-2">
              Dari {todayTransactions.filter(t => t.status === 'completed').length} transaksi selesai
            </p>
          </div>
          <div className="bg-white/20 p-4 rounded-xl">
            <Percent size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AlertTriangle className="text-warning" size={24} />
              Stok Menipis
            </h2>
            <Link to="/stock" className="text-primary hover:underline text-sm">
              Lihat Semua
            </Link>
          </div>
          
          {lowStockProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Semua stok aman</p>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-600">{product.stock} {product.unit}</p>
                    <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Transaksi Terbaru</h2>
            <Link to="/sales" className="text-primary hover:underline text-sm">
              Lihat Semua
            </Link>
          </div>
          
          {todayTransactions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada transaksi hari ini</p>
          ) : (
            <div className="space-y-3">
              {todayTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.id}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.date).toLocaleTimeString('id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      Rp {transaction.total.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{transaction.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
