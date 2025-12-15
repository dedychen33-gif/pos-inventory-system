import { useState } from 'react'
import { Download, Printer, Calendar, Search, Eye, X as XIcon, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Package, BarChart3, PieChart, Ban, Wallet, CreditCard } from 'lucide-react'
import { useTransactionStore } from '../store/transactionStore'
import { useProductStore } from '../store/productStore'
import { useMarketplaceStore } from '../store/marketplaceStore'
import { useAuthStore } from '../store/authStore'
import { useSalesOrderStore } from '../store/salesOrderStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useExpenseStore } from '../store/expenseStore'
import { useDebtStore } from '../store/debtStore'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Get returns store
const useReturnsStore = create(
  persist(
    (set) => ({
      returns: [],
    }),
    { name: 'returns-storage' }
  )
)
import { isAndroid } from '../utils/platform'

export default function Reports() {
  const [reportType, setReportType] = useState('transactions')
  const [dateRange, setDateRange] = useState('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const { transactions, getTodaySales, voidTransaction } = useTransactionStore()
  const { products, stockHistory, updateStock } = useProductStore()
  const { stores } = useMarketplaceStore()
  const { user } = useAuthStore()
  const { salesOrders } = useSalesOrderStore()
  const { returns } = useReturnsStore()
  const { purchases, suppliers } = usePurchaseStore()
  const { expenses } = useExpenseStore()
  const { debts } = useDebtStore()

  const reportTypes = [
    { id: 'transactions', label: 'Transaksi Kasir' },
    { id: 'sales', label: 'Laporan Penjualan' },
    { id: 'salesorders', label: 'Sales Order' },
    { id: 'purchases', label: 'Laporan Pembelian' },
    { id: 'expenses', label: 'Laporan Pengeluaran' },
    { id: 'debts', label: 'Hutang Piutang' },
    { id: 'returns', label: 'Laporan Retur' },
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
    <div className={`${isAndroid ? 'p-4' : 'p-6'} space-y-4`}>
      {/* Header */}
      <div>
        <h1 className={`${isAndroid ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Laporan</h1>
        <p className="text-gray-600 text-sm mt-1">Monitor performa bisnis</p>
      </div>

      {/* Report Selector - Android optimized */}
      <div className={`bg-white rounded-xl ${isAndroid ? 'p-3' : 'p-6'} shadow-sm border border-gray-100`}>
        <div className={`flex flex-col ${isAndroid ? 'gap-3' : 'md:flex-row gap-4'}`}>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className={`input flex-1 ${isAndroid ? 'text-sm' : ''}`}
          >
            {reportTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.label}</option>
            ))}
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className={`input ${isAndroid ? 'text-sm' : ''}`}
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
      {reportType === 'salesorders' && <SalesOrdersReport salesOrders={salesOrders} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'purchases' && <PurchasesReport purchases={purchases} suppliers={suppliers} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'expenses' && <ExpensesReport expenses={expenses} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'debts' && <DebtsReport debts={debts} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
      {reportType === 'returns' && <ReturnsReport returns={returns} dateRange={dateRange} customStartDate={customStartDate} customEndDate={customEndDate} />}
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

  const completedTransactions = filterByDate(transactions).filter((t) => !t.status || t.status === 'completed')
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
  
  // Damaged stock calculations
  const totalDamagedStock = products.reduce((sum, p) => sum + (p.damagedStock || 0), 0)
  const totalDamagedValue = products.reduce((sum, p) => sum + ((p.damagedStock || 0) * (p.cost || p.price || 0)), 0)
  const damagedProductsCount = products.filter(p => (p.damagedStock || 0) > 0).length

  // Filter and sort products
  let filteredProducts = [...products]
  if (filterStatus === 'low') {
    filteredProducts = filteredProducts.filter(p => p.stock <= p.minStock && p.stock > 0)
  } else if (filterStatus === 'out') {
    filteredProducts = filteredProducts.filter(p => p.stock === 0)
  } else if (filterStatus === 'normal') {
    filteredProducts = filteredProducts.filter(p => p.stock > p.minStock)
  } else if (filterStatus === 'damaged') {
    filteredProducts = filteredProducts.filter(p => (p.damagedStock || 0) > 0)
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
        <div className="card">
          <p className="text-sm text-gray-600">Stok Rusak</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{totalDamagedStock}</p>
          <p className="text-xs text-gray-500">{damagedProductsCount} produk, Rp {totalDamagedValue.toLocaleString('id-ID')}</p>
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
            <option value="damaged">Stok Rusak</option>
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
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rusak</th>
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
                  <td className="px-4 py-3 text-right">
                    {(product.damagedStock || 0) > 0 ? (
                      <span className="text-orange-600 font-medium">{product.damagedStock}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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

// Sales Orders Report
function SalesOrdersReport({ salesOrders, dateRange, customStartDate, customEndDate }) {
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt)
      
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

  const filteredOrders = filterByDate(salesOrders || [])
  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length
  const completedOrders = filteredOrders.filter(o => o.status === 'lunas' || o.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total SO</p>
          <p className="text-2xl font-bold">{totalOrders}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Nilai</p>
          <p className="text-2xl font-bold text-green-600">Rp {totalRevenue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Lunas</p>
          <p className="text-2xl font-bold text-blue-600">{completedOrders}</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Daftar Sales Order</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data Sales Order
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {order.orderNumber || order.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">{order.customer?.name || 'Walk-in'}</td>
                    <td className="px-4 py-3 text-center">{order.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      Rp {(order.total || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'lunas' || order.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status === 'lunas' ? 'Lunas' : order.status === 'completed' ? 'Selesai' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Returns Report
function ReturnsReport({ returns, dateRange, customStartDate, customEndDate }) {
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt)
      
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

  const filteredReturns = filterByDate(returns || [])
  const totalReturns = filteredReturns.length
  const totalValue = filteredReturns.reduce((sum, r) => sum + (r.total || 0), 0)
  const pendingReturns = filteredReturns.filter(r => r.status === 'pending').length
  const completedReturns = filteredReturns.filter(r => r.status === 'completed').length
  const damagedReturns = filteredReturns.filter(r => r.reason === 'Barang rusak/cacat').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total Retur</p>
          <p className="text-2xl font-bold">{totalReturns}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Nilai Retur</p>
          <p className="text-2xl font-bold text-red-600">Rp {totalValue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingReturns}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Selesai</p>
          <p className="text-2xl font-bold text-green-600">{completedReturns}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Barang Rusak</p>
          <p className="text-2xl font-bold text-orange-600">{damagedReturns}</p>
        </div>
      </div>

      {/* Returns Table */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Daftar Retur</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Retur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data Retur
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-sm">{ret.id}</td>
                    <td className="px-4 py-3 font-mono text-blue-600 text-sm">{ret.orderNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(ret.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">{ret.customer?.name || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      Rp {(ret.total || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${ret.reason === 'Barang rusak/cacat' ? 'text-red-600 font-medium' : ''}`}>
                        {ret.reason || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ret.status === 'completed' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {ret.status === 'completed' ? 'Selesai' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Returns by Reason Chart */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Retur berdasarkan Alasan</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(
            filteredReturns.reduce((acc, r) => {
              const reason = r.reason || 'Lainnya'
              acc[reason] = (acc[reason] || 0) + 1
              return acc
            }, {})
          ).map(([reason, count]) => (
            <div key={reason} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{reason}</p>
              <p className="text-xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Purchases Report
function PurchasesReport({ purchases, suppliers, dateRange, customStartDate, customEndDate }) {
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt || item.date)
      
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

  const filteredPurchases = filterByDate(purchases || [])
  const totalPurchases = filteredPurchases.length
  const totalValue = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0)
  const pendingPurchases = filteredPurchases.filter(p => p.status === 'pending').length
  const completedPurchases = filteredPurchases.filter(p => p.status === 'completed' || p.status === 'received').length
  const totalItems = filteredPurchases.reduce((sum, p) => sum + (p.items?.length || 0), 0)

  // Get supplier stats
  const supplierStats = filteredPurchases.reduce((acc, p) => {
    const supplierName = p.supplier?.name || 'Tidak diketahui'
    if (!acc[supplierName]) {
      acc[supplierName] = { count: 0, total: 0 }
    }
    acc[supplierName].count++
    acc[supplierName].total += p.total || 0
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Total PO</p>
          <p className="text-2xl font-bold">{totalPurchases}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Nilai</p>
          <p className="text-2xl font-bold text-blue-600">Rp {totalValue.toLocaleString('id-ID')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingPurchases}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Selesai</p>
          <p className="text-2xl font-bold text-green-600">{completedPurchases}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Item</p>
          <p className="text-2xl font-bold">{totalItems}</p>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Daftar Pembelian</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. PO</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data Pembelian
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-600">
                      {purchase.id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(purchase.createdAt || purchase.date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">{purchase.supplier?.name || '-'}</td>
                    <td className="px-4 py-3 text-center">{purchase.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      Rp {(purchase.total || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        purchase.status === 'completed' || purchase.status === 'received'
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {purchase.status === 'completed' || purchase.status === 'received' ? 'Selesai' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Stats */}
      {Object.keys(supplierStats).length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Pembelian per Supplier</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(supplierStats)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, data]) => (
                <div key={name} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{name}</p>
                  <p className="text-sm text-gray-600">{data.count} PO</p>
                  <p className="text-lg font-bold text-blue-600">Rp {data.total.toLocaleString('id-ID')}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Suppliers List */}
      {suppliers && suppliers.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Daftar Supplier ({suppliers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="p-4 border rounded-lg">
                <p className="font-medium">{supplier.name}</p>
                <p className="text-sm text-gray-600">{supplier.phone || '-'}</p>
                <p className="text-xs text-gray-500">{supplier.address || '-'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Expenses Report Component
function ExpensesReport({ expenses, dateRange, customStartDate, customEndDate }) {
  const EXPENSE_CATEGORIES = [
    { id: 'utilities', label: 'Listrik/Air/Internet', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'rent', label: 'Sewa Tempat', color: 'bg-blue-100 text-blue-800' },
    { id: 'salary', label: 'Gaji Karyawan', color: 'bg-green-100 text-green-800' },
    { id: 'supplies', label: 'Perlengkapan Toko', color: 'bg-purple-100 text-purple-800' },
    { id: 'transport', label: 'Transportasi', color: 'bg-orange-100 text-orange-800' },
    { id: 'maintenance', label: 'Perawatan/Perbaikan', color: 'bg-red-100 text-red-800' },
    { id: 'marketing', label: 'Marketing/Promosi', color: 'bg-pink-100 text-pink-800' },
    { id: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-800' },
  ]

  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return (data || []).filter(item => {
      const itemDate = new Date(item.date || item.createdAt)
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

  const filteredExpenses = filterByDate(expenses)
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const categoryStats = filteredExpenses.reduce((acc, expense) => {
    const cat = expense.category || 'other'
    if (!acc[cat]) acc[cat] = { total: 0, count: 0 }
    acc[cat].total += expense.amount || 0
    acc[cat].count += 1
    return acc
  }, {})
  const getCategoryInfo = (categoryId) => EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[7]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card"><div className="flex items-center gap-3"><Wallet className="text-red-500" size={32} /><div><p className="text-sm text-gray-600">Total Pengeluaran</p><p className="text-2xl font-bold text-red-600">Rp {totalExpenses.toLocaleString('id-ID')}</p></div></div></div>
        <div className="card"><p className="text-sm text-gray-600">Jumlah Transaksi</p><p className="text-2xl font-bold mt-1">{filteredExpenses.length}</p></div>
        <div className="card"><p className="text-sm text-gray-600">Rata-rata</p><p className="text-2xl font-bold mt-1">Rp {filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString('id-ID') : 0}</p></div>
      </div>
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Pengeluaran per Kategori</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(categoryStats).sort((a, b) => b[1].total - a[1].total).map(([catId, data]) => {
            const catInfo = getCategoryInfo(catId)
            return (<div key={catId} className="p-4 bg-gray-50 rounded-lg"><span className={`text-xs px-2 py-1 rounded ${catInfo.color}`}>{catInfo.label}</span><p className="text-lg font-bold mt-2">Rp {data.total.toLocaleString('id-ID')}</p><p className="text-sm text-gray-600">{data.count} transaksi</p></div>)
          })}
        </div>
      </div>
      <div className="card overflow-hidden">
        <h3 className="text-lg font-bold mb-4 px-6 pt-6">Rincian Pengeluaran</h3>
        <div className="overflow-x-auto">
          <table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th></tr></thead>
          <tbody className="divide-y">{filteredExpenses.length === 0 ? (<tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Tidak ada data</td></tr>) : filteredExpenses.map((e) => (<tr key={e.id} className="hover:bg-gray-50"><td className="px-6 py-4">{new Date(e.date || e.createdAt).toLocaleDateString('id-ID')}</td><td className="px-6 py-4">{e.description}</td><td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded ${getCategoryInfo(e.category).color}`}>{getCategoryInfo(e.category).label}</span></td><td className="px-6 py-4 text-right font-semibold text-red-600">Rp {(e.amount || 0).toLocaleString('id-ID')}</td></tr>))}</tbody></table>
        </div>
      </div>
    </div>
  )
}

// Debts Report Component
function DebtsReport({ debts, dateRange, customStartDate, customEndDate }) {
  const filterByDate = (data) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return (data || []).filter(item => {
      const itemDate = new Date(item.createdAt)
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        end.setHours(23, 59, 59, 999)
        return itemDate >= start && itemDate <= end
      }
      if (dateRange === 'today') { const itemDay = new Date(itemDate); itemDay.setHours(0, 0, 0, 0); return itemDay.getTime() === today.getTime() }
      else if (dateRange === 'week') { const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7); return itemDate >= weekAgo }
      else if (dateRange === 'month') { const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1); return itemDate >= monthAgo }
      return true
    })
  }
  const filteredDebts = filterByDate(debts)
  const payables = filteredDebts.filter(d => d.type === 'payable')
  const receivables = filteredDebts.filter(d => d.type === 'receivable')
  const totalPayables = payables.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0)
  const totalReceivables = receivables.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0)
  const getStatusBadge = (s) => s === 'paid' ? 'bg-green-100 text-green-800' : s === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
  const getStatusLabel = (s) => s === 'paid' ? 'Lunas' : s === 'partial' ? 'Sebagian' : 'Belum Bayar'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card border-l-4 border-red-500"><div className="flex items-center gap-3"><TrendingDown className="text-red-500" size={32} /><div><p className="text-sm text-gray-600">Total Hutang</p><p className="text-2xl font-bold text-red-600">Rp {totalPayables.toLocaleString('id-ID')}</p></div></div></div>
        <div className="card border-l-4 border-green-500"><div className="flex items-center gap-3"><TrendingUp className="text-green-500" size={32} /><div><p className="text-sm text-gray-600">Total Piutang</p><p className="text-2xl font-bold text-green-600">Rp {totalReceivables.toLocaleString('id-ID')}</p></div></div></div>
        <div className="card"><p className="text-sm text-gray-600">Selisih</p><p className={`text-2xl font-bold mt-1 ${totalReceivables - totalPayables >= 0 ? 'text-green-600' : 'text-red-600'}`}>Rp {(totalReceivables - totalPayables).toLocaleString('id-ID')}</p></div>
        <div className="card"><p className="text-sm text-gray-600">Total Data</p><p className="text-2xl font-bold mt-1">{filteredDebts.length}</p></div>
      </div>
      <div className="card overflow-hidden">
        <h3 className="text-lg font-bold mb-4 px-6 pt-6 flex items-center gap-2"><TrendingDown className="text-red-500" size={20} /> Daftar Hutang</h3>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
        <tbody className="divide-y">{payables.length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Tidak ada data hutang</td></tr>) : payables.map((d) => (<tr key={d.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{d.personName}</td><td className="px-6 py-4">{d.description}</td><td className="px-6 py-4 text-right">Rp {(d.amount || 0).toLocaleString('id-ID')}</td><td className="px-6 py-4 text-right font-semibold text-red-600">Rp {((d.amount || 0) - (d.paidAmount || 0)).toLocaleString('id-ID')}</td><td className="px-6 py-4 text-center"><span className={`text-xs px-2 py-1 rounded ${getStatusBadge(d.status)}`}>{getStatusLabel(d.status)}</span></td></tr>))}</tbody></table></div>
      </div>
      <div className="card overflow-hidden">
        <h3 className="text-lg font-bold mb-4 px-6 pt-6 flex items-center gap-2"><TrendingUp className="text-green-500" size={20} /> Daftar Piutang</h3>
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50 border-b"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th><th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th></tr></thead>
        <tbody className="divide-y">{receivables.length === 0 ? (<tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Tidak ada data piutang</td></tr>) : receivables.map((d) => (<tr key={d.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium">{d.personName}</td><td className="px-6 py-4">{d.description}</td><td className="px-6 py-4 text-right">Rp {(d.amount || 0).toLocaleString('id-ID')}</td><td className="px-6 py-4 text-right font-semibold text-green-600">Rp {((d.amount || 0) - (d.paidAmount || 0)).toLocaleString('id-ID')}</td><td className="px-6 py-4 text-center"><span className={`text-xs px-2 py-1 rounded ${getStatusBadge(d.status)}`}>{getStatusLabel(d.status)}</span></td></tr>))}</tbody></table></div>
      </div>
    </div>
  )
}
