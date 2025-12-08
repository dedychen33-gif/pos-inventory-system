import { useState } from 'react'
import { Download, Printer, Calendar, Search, Eye, X as XIcon, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, BarChart3, PieChart, Ban } from 'lucide-react'
import { useTransactionStore } from '../store/transactionStore'
import { useProductStore } from '../store/productStore'
import { useMarketplaceStore } from '../store/marketplaceStore'
import { useAuthStore } from '../store/authStore'

export default function Reports() {
  const [reportType, setReportType] = useState('transactions')
  const [dateRange, setDateRange] = useState('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const { transactions, getTodaySales, voidTransaction } = useTransactionStore()
  const { products, stockHistory, updateStock } = useProductStore()
  const { stores } = useMarketplaceStore()
  const { user } = useAuthStore()

  const reportTypes = [
    { id: 'transactions', label: 'Transaksi Kasir' },
    { id: 'sales', label: 'Laporan Penjualan' },
    { id: 'stock', label: 'Laporan Stok' },
    { id: 'products', label: 'Produk Terlaris' },
    { id: 'profit', label: 'Laba Rugi' },
    { id: 'source', label: 'Omzet per Sumber' },
  ]

  // Filter transactions by date range
  const getFilteredByDate = (data, dateField = 'date') => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField])
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      
      if (dateRange === 'today') {
        const itemDay = new Date(itemDate)
        itemDay.setHours(0, 0, 0, 0)
        return itemDay.getTime() === today.getTime()
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return itemDate >= weekAgo
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return itemDate >= monthAgo
      } else if (dateRange === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1)
        return itemDate >= yearStart
      }
      return true
    })
  }

  const handleExportExcel = () => {
    // Create CSV content
    let csvContent = ''
    const filteredTx = getFilteredByDate(transactions)
    
    if (reportType === 'transactions' || reportType === 'sales') {
      csvContent = 'ID,Tanggal,Pelanggan,Items,Subtotal,Diskon,Pajak,Total,Pembayaran,Status\n'
      filteredTx.forEach(t => {
        csvContent += `${t.id},${new Date(t.date).toLocaleString('id-ID')},${t.customer?.name || '-'},${t.items.length},${t.subtotal},${t.discount},${t.tax},${t.total},${t.paymentMethod},${t.status}\n`
      })
    } else if (reportType === 'stock') {
      csvContent = 'Kode,Nama,Kategori,Stok,Min Stok,Harga,HPP,Nilai Stok\n'
      products.forEach(p => {
        csvContent += `${p.code},${p.name},${p.category},${p.stock},${p.minStock},${p.price},${p.cost || 0},${p.price * p.stock}\n`
      })
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-${reportType}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan & Analytics</h1>
        <p className="text-gray-600 mt-1">Monitor performa bisnis Anda</p>
      </div>

      {/* Report Selector */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="input flex-1"
          >
            {reportTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input"
          >
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
            <option value="year">Tahun Ini</option>
            <option value="custom">Periode Custom</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input"
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input"
              />
            </>
          )}

          <button onClick={handleExportExcel} className="btn btn-primary flex items-center gap-2">
            <Download size={20} />
            Export CSV
          </button>
          
          <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-2">
            <Printer size={20} />
            Print
          </button>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'transactions' && <TransactionsReport transactions={transactions} voidTransaction={voidTransaction} updateStock={updateStock} user={user} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'sales' && <SalesReport transactions={transactions} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'stock' && <StockReport products={products} stockHistory={stockHistory} />}
      {reportType === 'products' && <ProductsReport transactions={transactions} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'profit' && <ProfitReport transactions={transactions} products={products} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'source' && <SourceReport transactions={transactions} stores={stores} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
    </div>
  )
}

function TransactionsReport({ transactions, voidTransaction, updateStock, user, dateRange, customStartDate, customEndDate }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [transactionToVoid, setTransactionToVoid] = useState(null)

  const handleVoidClick = (transaction) => {
    setTransactionToVoid(transaction)
    setVoidReason('')
    setShowVoidModal(true)
  }

  const handleConfirmVoid = async () => {
    if (!voidReason.trim()) {
      alert('Masukkan alasan void transaksi')
      return
    }
    
    await voidTransaction(transactionToVoid.id, voidReason, updateStock, user?.id, user?.name)
    setShowVoidModal(false)
    setTransactionToVoid(null)
    setVoidReason('')
    alert('Transaksi berhasil di-void dan stok telah dikembalikan')
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const transactionDate = new Date(t.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let matchDate = true
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate)
      const end = new Date(customEndDate)
      end.setHours(23, 59, 59, 999)
      matchDate = transactionDate >= start && transactionDate <= end
    } else if (dateRange === 'today') {
      const txDate = new Date(transactionDate)
      txDate.setHours(0, 0, 0, 0)
      matchDate = txDate.getTime() === today.getTime()
    } else if (dateRange === 'week') {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      matchDate = transactionDate >= weekAgo
    } else if (dateRange === 'month') {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      matchDate = transactionDate >= monthAgo
    }
    
    return matchSearch && matchDate
  })

  const totalSales = filteredTransactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.total, 0)

  const handleViewDetail = (transaction) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <p className="text-sm text-gray-600">Total Transaksi</p>
            <p className="text-2xl font-bold mt-1">
              {filteredTransactions.filter((t) => t.status === 'completed').length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Penjualan</p>
            <p className="text-2xl font-bold mt-1 text-green-600">
              Rp {totalSales.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Transaksi Void</p>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {filteredTransactions.filter((t) => t.status === 'void').length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari ID transaksi..."
              className="w-full pl-10 input"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="card overflow-hidden">
          <h3 className="text-lg font-bold mb-4 px-6 pt-6">Riwayat Transaksi Kasir</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Transaksi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pembayaran</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                      {transaction.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(transaction.date).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.customer?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.items.length} item
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">
                      Rp {transaction.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize">
                      {transaction.paymentMethod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.status === 'completed' ? (
                        <span className="badge badge-success">Selesai</span>
                      ) : (
                        <span className="badge badge-danger">Void</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleViewDetail(transaction)}
                        className="text-primary hover:text-blue-700"
                        title="Lihat Detail"
                      >
                        <Eye size={18} />
                      </button>
                      {transaction.status === 'completed' && (
                        <button 
                          onClick={() => handleVoidClick(transaction)}
                          className="text-red-500 hover:text-red-700"
                          title="Void Transaksi"
                        >
                          <Ban size={18} />
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-700" title="Print">
                        <Printer size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Void Modal */}
      {showVoidModal && transactionToVoid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-red-600">Void Transaksi</h3>
            <p className="text-gray-600 mb-4">
              Void transaksi <strong>{transactionToVoid.id}</strong> senilai <strong>Rp {transactionToVoid.total.toLocaleString('id-ID')}</strong>?
            </p>
            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded mb-4">
              ⚠️ Stok produk akan dikembalikan otomatis
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Alasan Void *</label>
              <textarea
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Masukkan alasan void..."
                className="input w-full"
                rows={3}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVoidModal(false)}
                className="btn btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="btn btn-danger flex-1"
              >
                Konfirmasi Void
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold">Detail Transaksi</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">ID Transaksi</p>
                  <p className="font-semibold">{selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Tanggal</p>
                  <p className="font-semibold">
                    {new Date(selectedTransaction.date).toLocaleString('id-ID')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Kasir</p>
                  <p className="font-semibold">{selectedTransaction.cashier}</p>
                </div>
                <div>
                  <p className="text-gray-600">Metode Pembayaran</p>
                  <p className="font-semibold capitalize">{selectedTransaction.paymentMethod}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <p className="font-semibold">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>Rp {selectedTransaction.subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Diskon</span>
                  <span>- Rp {selectedTransaction.discount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pajak</span>
                  <span>Rp {selectedTransaction.tax.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">
                    Rp {selectedTransaction.total.toLocaleString('id-ID')}
                  </span>
                </div>
                
                {selectedTransaction.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bayar</span>
                      <span>Rp {selectedTransaction.cashAmount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Kembali</span>
                      <span className="text-green-600">
                        Rp {selectedTransaction.change.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SalesReport({ transactions, dateRange, customStartDate, customEndDate }) {
  // Filter transactions by date
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.date)
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      
      if (dateRange === 'today') {
        const itemDay = new Date(itemDate)
        itemDay.setHours(0, 0, 0, 0)
        return itemDay.getTime() === today.getTime()
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return itemDate >= weekAgo
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return itemDate >= monthAgo
      }
      return true
    })
  }

  const completedTransactions = filterByDate(transactions).filter((t) => t.status === 'completed')
  const totalSales = completedTransactions.reduce((sum, t) => sum + t.total, 0)
  const totalTax = completedTransactions.reduce((sum, t) => sum + t.tax, 0)
  const totalDiscount = completedTransactions.reduce((sum, t) => sum + t.discount, 0)
  const avgTransaction = completedTransactions.length > 0 ? totalSales / completedTransactions.length : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Transaksi</p>
          <p className="text-2xl font-bold mt-1">{completedTransactions.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Penjualan</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            Rp {totalSales.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Pajak</p>
          <p className="text-2xl font-bold mt-1">
            Rp {totalTax.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Diskon</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            Rp {totalDiscount.toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Rincian Penjualan</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Transaksi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diskon</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pajak</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {completedTransactions.slice(0, 10).map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(transaction.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {transaction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    Rp {transaction.subtotal.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                    - Rp {transaction.discount.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    Rp {transaction.tax.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                    Rp {transaction.total.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StockReport({ products, stockHistory }) {
  const [sortBy, setSortBy] = useState('name')
  const [filterStatus, setFilterStatus] = useState('all')
  
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  const totalCostValue = products.reduce((sum, p) => sum + ((p.cost || 0) * p.stock), 0)
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length
  const outOfStockCount = products.filter((p) => p.stock === 0).length
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)

  // Filter and sort products
  let filteredProducts = [...products]
  if (filterStatus === 'low') {
    filteredProducts = filteredProducts.filter(p => p.stock <= p.minStock && p.stock > 0)
  } else if (filterStatus === 'out') {
    filteredProducts = filteredProducts.filter(p => p.stock === 0)
  } else if (filterStatus === 'normal') {
    filteredProducts = filteredProducts.filter(p => p.stock > p.minStock)
  }

  if (sortBy === 'stock-asc') {
    filteredProducts.sort((a, b) => a.stock - b.stock)
  } else if (sortBy === 'stock-desc') {
    filteredProducts.sort((a, b) => b.stock - a.stock)
  } else if (sortBy === 'value-desc') {
    filteredProducts.sort((a, b) => (b.price * b.stock) - (a.price * a.stock))
  } else {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name))
  }

  // Recent stock changes
  const recentChanges = (stockHistory || []).slice(0, 10)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Produk</p>
          <p className="text-2xl font-bold mt-1">{products.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Unit</p>
          <p className="text-2xl font-bold mt-1">{totalStock.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Nilai Jual</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            Rp {(totalValue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Nilai Modal (HPP)</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">
            Rp {(totalCostValue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Stok Bermasalah</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{lowStockCount + outOfStockCount}</p>
          <p className="text-xs text-gray-500">{outOfStockCount} habis, {lowStockCount} rendah</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input">
            <option value="all">Semua Status</option>
            <option value="normal">Stok Normal</option>
            <option value="low">Stok Rendah</option>
            <option value="out">Stok Habis</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
            <option value="name">Urut: Nama A-Z</option>
            <option value="stock-asc">Urut: Stok Terendah</option>
            <option value="stock-desc">Urut: Stok Tertinggi</option>
            <option value="value-desc">Urut: Nilai Tertinggi</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Detail Stok Produk ({filteredProducts.length} produk)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga Jual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HPP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Stok</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.slice(0, 50).map((product) => (
                <tr key={product.id} className={`hover:bg-gray-50 ${product.stock === 0 ? 'bg-red-50' : product.stock <= product.minStock ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.code} {product.sku ? `• ${product.sku}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {product.minStock}
                  </td>
                  <td className="px-4 py-3 text-right">
                    Rp {(product.price || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    Rp {(product.cost || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    Rp {((product.price || 0) * product.stock).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {product.stock === 0 ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">HABIS</span>
                    ) : product.stock <= product.minStock ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">Rendah</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProducts.length > 50 && (
          <p className="text-center text-gray-500 py-4 text-sm">Menampilkan 50 dari {filteredProducts.length} produk</p>
        )}
      </div>

      {/* Recent Stock Changes */}
      {recentChanges.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Perubahan Stok Terakhir</h3>
          <div className="space-y-2">
            {recentChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{change.productName}</p>
                  <p className="text-xs text-gray-500">{new Date(change.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <div className="text-right">
                  <span className={`font-bold ${change.change > 0 ? 'text-green-600' : change.change < 0 ? 'text-red-600' : ''}`}>
                    {change.change > 0 ? '+' : ''}{change.change}
                  </span>
                  <p className="text-xs text-gray-500">{change.oldStock} → {change.newStock}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ProductsReport({ transactions, dateRange, customStartDate, customEndDate }) {
  // Filter transactions by date
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.date)
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      
      if (dateRange === 'today') {
        const itemDay = new Date(itemDate)
        itemDay.setHours(0, 0, 0, 0)
        return itemDay.getTime() === today.getTime()
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return itemDate >= weekAgo
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return itemDate >= monthAgo
      }
      return true
    })
  }

  // Calculate best selling products
  const productSales = {}
  
  filterByDate(transactions).filter((t) => t.status === 'completed').forEach((transaction) => {
    transaction.items.forEach((item) => {
      if (!productSales[item.id]) {
        productSales[item.id] = {
          name: item.name,
          quantity: 0,
          revenue: 0
        }
      }
      productSales[item.id].quantity += item.quantity
      productSales[item.id].revenue += item.price * item.quantity
    })
  })

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)

  const totalQty = topProducts.reduce((sum, p) => sum + p.quantity, 0)
  const totalRevenue = topProducts.reduce((sum, p) => sum + p.revenue, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Produk Terjual</p>
          <p className="text-2xl font-bold mt-1">{totalQty} items</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Revenue (Top 10)</p>
          <p className="text-2xl font-bold mt-1 text-green-600">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Rata-rata per Produk</p>
          <p className="text-2xl font-bold mt-1">
            Rp {topProducts.length > 0 ? (totalRevenue / topProducts.length).toLocaleString('id-ID') : 0}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Top 10 Produk Terlaris</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ranking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty Terjual</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Revenue</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% dari Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProducts.map((product, index) => {
                const percentage = totalRevenue > 0 ? ((product.revenue / totalRevenue) * 100).toFixed(1) : 0
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-400 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium">{product.name}</td>
                    <td className="px-6 py-4 text-right font-semibold">{product.quantity}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600">
                      Rp {product.revenue.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                        <span className="text-sm">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {topProducts.length === 0 && (
          <p className="text-center text-gray-500 py-8">Belum ada data penjualan untuk periode ini</p>
        )}
      </div>
    </div>
  )
}

function ProfitReport({ transactions, products, dateRange, customStartDate, customEndDate }) {
  // Filter transactions by date
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.date)
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      
      if (dateRange === 'today') {
        const itemDay = new Date(itemDate)
        itemDay.setHours(0, 0, 0, 0)
        return itemDay.getTime() === today.getTime()
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return itemDate >= weekAgo
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return itemDate >= monthAgo
      } else if (dateRange === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1)
        return itemDate >= yearStart
      }
      return true
    })
  }

  const filteredTransactions = filterByDate(transactions).filter(t => t.status === 'completed')
  
  // Build product cost map
  const productCostMap = {}
  products.forEach(p => {
    productCostMap[p.id] = p.cost || 0
  })

  // Calculate profit per product
  const productProfit = {}
  let totalRevenue = 0
  let totalCOGS = 0 // Cost of Goods Sold (HPP)
  let totalDiscount = 0
  let totalTax = 0

  filteredTransactions.forEach(t => {
    totalDiscount += t.discount || 0
    totalTax += t.tax || 0
    
    t.items.forEach(item => {
      const cost = productCostMap[item.id] || item.cost || 0
      const revenue = item.price * item.quantity
      const cogs = cost * item.quantity
      const profit = revenue - cogs
      
      totalRevenue += revenue
      totalCOGS += cogs
      
      if (!productProfit[item.id]) {
        productProfit[item.id] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        }
      }
      productProfit[item.id].quantity += item.quantity
      productProfit[item.id].revenue += revenue
      productProfit[item.id].cogs += cogs
      productProfit[item.id].profit += profit
    })
  })

  const grossProfit = totalRevenue - totalCOGS
  const netProfit = grossProfit - totalDiscount + totalTax
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0

  const topProfitProducts = Object.values(productProfit)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Pendapatan</p>
              <p className="text-2xl font-bold mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</p>
            </div>
            <DollarSign size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">HPP (COGS)</p>
              <p className="text-2xl font-bold mt-1">Rp {totalCOGS.toLocaleString('id-ID')}</p>
            </div>
            <Package size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Laba Kotor</p>
              <p className="text-2xl font-bold mt-1">Rp {grossProfit.toLocaleString('id-ID')}</p>
              <p className="text-xs opacity-75">Margin: {grossMargin}%</p>
            </div>
            <TrendingUp size={40} className="opacity-80" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Laba Bersih</p>
              <p className="text-2xl font-bold mt-1">Rp {netProfit.toLocaleString('id-ID')}</p>
              <p className="text-xs opacity-75">Margin: {netMargin}%</p>
            </div>
            <BarChart3 size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Profit Breakdown */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Rincian Laba Rugi</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="font-medium">Total Pendapatan (Revenue)</span>
            <span className="font-bold text-blue-600">Rp {totalRevenue.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-red-600">
            <span>(-) Harga Pokok Penjualan (HPP)</span>
            <span>Rp {totalCOGS.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-2 border-b bg-green-50 px-2 rounded">
            <span className="font-medium text-green-700">= Laba Kotor (Gross Profit)</span>
            <span className="font-bold text-green-600">Rp {grossProfit.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-2 border-b text-red-600">
            <span>(-) Total Diskon</span>
            <span>Rp {totalDiscount.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span>(+) PPN yang Dipungut</span>
            <span>Rp {totalTax.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between py-3 bg-purple-50 px-2 rounded text-lg">
            <span className="font-bold text-purple-700">= Laba Bersih (Net Profit)</span>
            <span className="font-bold text-purple-600">Rp {netProfit.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* Profit per Product */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Profit per Produk (Top 10)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">HPP</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topProfitProducts.map((product, index) => {
                const margin = product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : 0
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-right">{product.quantity}</td>
                    <td className="px-4 py-3 text-right">Rp {product.revenue.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right text-red-600">Rp {product.cogs.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">Rp {product.profit.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        margin >= 30 ? 'bg-green-100 text-green-700' :
                        margin >= 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {margin}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {topProfitProducts.length === 0 && (
          <p className="text-center text-gray-500 py-8">Belum ada data transaksi untuk periode ini</p>
        )}
      </div>

      {/* Info Box */}
      <div className="card bg-blue-50 border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>💡 Tips:</strong> Pastikan HPP (Harga Pokok Penjualan) di setiap produk sudah diisi dengan benar 
          untuk mendapatkan laporan laba rugi yang akurat. Anda dapat mengisi HPP di menu Produk.
        </p>
      </div>
    </div>
  )
}

// Revenue by Source Report
function SourceReport({ transactions, stores, dateRange, customStartDate, customEndDate }) {
  // Filter transactions by date
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.date)
      
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      
      if (dateRange === 'today') {
        const itemDay = new Date(itemDate)
        itemDay.setHours(0, 0, 0, 0)
        return itemDay.getTime() === today.getTime()
      } else if (dateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return itemDate >= weekAgo
      } else if (dateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return itemDate >= monthAgo
      }
      return true
    })
  }

  const filteredTransactions = filterByDate(transactions).filter(t => t.status === 'completed')

  // Group by source
  const sourceData = {
    pos: { label: 'POS (Kasir)', color: 'bg-blue-500', transactions: 0, revenue: 0 },
    shopee: { label: 'Shopee', color: 'bg-orange-500', transactions: 0, revenue: 0 },
    lazada: { label: 'Lazada', color: 'bg-purple-500', transactions: 0, revenue: 0 },
    tokopedia: { label: 'Tokopedia', color: 'bg-green-500', transactions: 0, revenue: 0 },
    tiktok: { label: 'TikTok Shop', color: 'bg-gray-800', transactions: 0, revenue: 0 },
  }

  filteredTransactions.forEach(t => {
    const source = t.source || 'pos'
    if (sourceData[source]) {
      sourceData[source].transactions += 1
      sourceData[source].revenue += t.total
    } else {
      sourceData.pos.transactions += 1
      sourceData.pos.revenue += t.total
    }
  })

  const totalRevenue = Object.values(sourceData).reduce((sum, s) => sum + s.revenue, 0)
  const totalTransactions = Object.values(sourceData).reduce((sum, s) => sum + s.transactions, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Omzet Semua Sumber</p>
          <p className="text-3xl font-bold mt-1 text-green-600">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Transaksi</p>
          <p className="text-3xl font-bold mt-1">{totalTransactions}</p>
        </div>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(sourceData).map(([key, data]) => {
          const percentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : 0
          return (
            <div key={key} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-4 h-4 rounded ${data.color}`}></div>
                <h4 className="font-bold">{data.label}</h4>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaksi</span>
                  <span className="font-medium">{data.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Omzet</span>
                  <span className="font-bold text-green-600">Rp {data.revenue.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kontribusi</span>
                  <span className="font-medium">{percentage}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`${data.color} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Connected Stores Info */}
      {stores && stores.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Toko Marketplace Terhubung</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(store => (
              <div key={store.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${store.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">{store.shopName}</span>
                </div>
                <p className="text-sm text-gray-600 capitalize">{store.platform}</p>
                <p className="text-xs text-gray-500">
                  Last sync: {store.lastSync ? new Date(store.lastSync).toLocaleString('id-ID') : 'Never'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>📊 Info:</strong> Data marketplace akan otomatis ter-update ketika Anda melakukan sinkronisasi 
          dari halaman Marketplace Integration. Pastikan semua toko sudah terhubung untuk laporan yang akurat.
        </p>
      </div>
    </div>
  )
}
