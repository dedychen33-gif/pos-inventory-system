import { useState } from 'react'
import { Download, Printer, Calendar, Search, Eye, X as XIcon } from 'lucide-react'
import { useTransactionStore } from '../store/transactionStore'
import { useProductStore } from '../store/productStore'

export default function Reports() {
  const [reportType, setReportType] = useState('transactions')
  const [dateRange, setDateRange] = useState('today')
  
  const { transactions, getTodaySales } = useTransactionStore()
  const { products } = useProductStore()

  const reportTypes = [
    { id: 'transactions', label: 'Transaksi Kasir' },
    { id: 'sales', label: 'Laporan Penjualan' },
    { id: 'stock', label: 'Laporan Stok' },
    { id: 'products', label: 'Produk Terlaris' },
    { id: 'profit', label: 'Laba Rugi' },
  ]

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
          </select>

          <button className="btn btn-primary flex items-center gap-2">
            <Download size={20} />
            Export Excel
          </button>
          
          <button className="btn btn-secondary flex items-center gap-2">
            <Printer size={20} />
            Print
          </button>
        </div>
      </div>

      {/* Report Content */}
      {reportType === 'transactions' && <TransactionsReport transactions={transactions} dateRange={dateRange} />}
      {reportType === 'sales' && <SalesReport transactions={transactions} />}
      {reportType === 'stock' && <StockReport products={products} />}
      {reportType === 'products' && <ProductsReport transactions={transactions} />}
      {reportType === 'profit' && <ProfitReport transactions={transactions} />}
    </div>
  )
}

function TransactionsReport({ transactions, dateRange }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch = t.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const transactionDate = new Date(t.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let matchDate = true
    if (dateRange === 'today') {
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
                      >
                        <Eye size={18} />
                      </button>
                      <button className="text-gray-600 hover:text-gray-700">
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

function SalesReport({ transactions }) {
  const completedTransactions = transactions.filter((t) => t.status === 'completed')
  const totalSales = completedTransactions.reduce((sum, t) => sum + t.total, 0)
  const totalTax = completedTransactions.reduce((sum, t) => sum + t.tax, 0)
  const totalDiscount = completedTransactions.reduce((sum, t) => sum + t.discount, 0)

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

function StockReport({ products }) {
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Produk</p>
          <p className="text-2xl font-bold mt-1">{products.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Nilai Stok</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            Rp {(totalValue / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Stok Rendah</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{lowStockCount}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Detail Stok Produk</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Harga</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Stok</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.code}</p>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {product.stock} {product.unit}
                  </td>
                  <td className="px-6 py-4 text-right">
                    Rp {product.price.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    Rp {(product.price * product.stock).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {product.stock <= product.minStock ? (
                      <span className="badge badge-danger">Rendah</span>
                    ) : (
                      <span className="badge badge-success">Normal</span>
                    )}
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

function ProductsReport({ transactions }) {
  // Calculate best selling products
  const productSales = {}
  
  transactions.filter((t) => t.status === 'completed').forEach((transaction) => {
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

  return (
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
            </tr>
          </thead>
          <tbody className="divide-y">
            {topProducts.map((product, index) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProfitReport({ transactions }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Laporan Laba Rugi</h3>
      <p className="text-gray-600">
        Fitur laporan laba rugi lengkap dengan perhitungan HPP, biaya operasional, dan margin keuntungan akan segera hadir.
      </p>
    </div>
  )
}
