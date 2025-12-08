import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Users,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useTransactionStore } from '../store/transactionStore'
import { useCustomerStore } from '../store/customerStore'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { products, getLowStockProducts } = useProductStore()
  const { transactions, getTodaySales, getTodayTransactions } = useTransactionStore()
  const { customers } = useCustomerStore()

  const todaySales = getTodaySales()
  const todayTransactions = getTodayTransactions()
  const lowStockProducts = getLowStockProducts()

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

  const quickActions = [
    { label: 'Transaksi Baru', path: '/pos', color: 'bg-primary', icon: ShoppingCart },
    { label: 'Tambah Produk', path: '/products', color: 'bg-success', icon: Package },
    { label: 'Cek Stok', path: '/stock', color: 'bg-warning', icon: Package },
    { label: 'Barang Masuk', path: '/purchases', color: 'bg-info', icon: TrendingUp },
  ]

  return (
    <div className="p-6 space-y-6">
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
