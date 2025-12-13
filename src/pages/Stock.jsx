import { useState } from 'react'
import { Package, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, DollarSign, History } from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useAuthStore } from '../store/authStore'
import { isAndroid } from '../utils/platform'

export default function Stock() {
  const [activeTab, setActiveTab] = useState('overview')
  const { products, updateStock, getLowStockProducts, stockHistory } = useProductStore()
  const { user } = useAuthStore()
  
  const lowStockProducts = getLowStockProducts()
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'adjustment', label: 'Penyesuaian Stok' },
    { id: 'history', label: 'Riwayat Stok' },
    { id: 'opname', label: 'Stock Opname' },
    { id: 'transfer', label: 'Transfer Stok' },
  ]

  return (
    <div className={`${isAndroid ? 'p-4' : 'p-6'} space-y-4`}>
      {/* Header */}
      <div>
        <h1 className={`${isAndroid ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>Manajemen Stok</h1>
        <p className="text-gray-600 text-sm mt-1">Monitor dan kelola stok barang</p>
      </div>

      {/* Stats - Android optimized */}
      <div className={`grid ${isAndroid ? 'grid-cols-2 gap-3' : 'grid-cols-1 md:grid-cols-4 gap-6'}`}>
        <div className={`bg-white rounded-xl ${isAndroid ? 'p-3' : 'p-6'} shadow-sm border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Item</p>
              <p className={`${isAndroid ? 'text-xl' : 'text-2xl'} font-bold mt-1`}>{products.length}</p>
            </div>
            <Package className="text-primary" size={isAndroid ? 28 : 40} />
          </div>
        </div>
        
        <div className={`bg-white rounded-xl ${isAndroid ? 'p-3' : 'p-6'} shadow-sm border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Nilai Stok</p>
              <p className={`${isAndroid ? 'text-xl' : 'text-2xl'} font-bold mt-1`}>Rp {(totalValue / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="text-success" size={isAndroid ? 28 : 40} />
          </div>
        </div>
        
        <div className={`bg-white rounded-xl ${isAndroid ? 'p-3' : 'p-6'} shadow-sm border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Stok Rendah</p>
              <p className={`${isAndroid ? 'text-xl' : 'text-2xl'} font-bold mt-1 text-warning`}>{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="text-warning" size={isAndroid ? 28 : 40} />
          </div>
        </div>
        
        <div className={`bg-white rounded-xl ${isAndroid ? 'p-3' : 'p-6'} shadow-sm border border-gray-100`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Stok</p>
              <p className={`${isAndroid ? 'text-xl' : 'text-2xl'} font-bold mt-1`}>
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </p>
            </div>
            <Package className="text-info" size={isAndroid ? 28 : 40} />
          </div>
        </div>
      </div>

      {/* Tabs - Scrollable on Android */}
      <div className="border-b">
        <div className={`flex ${isAndroid ? 'overflow-x-auto hide-scrollbar gap-2 pb-1' : 'gap-4'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${isAndroid ? 'px-3 py-2 text-sm whitespace-nowrap' : 'px-4 py-2'} font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <StockOverview products={products} />}
      {activeTab === 'adjustment' && <StockAdjustment products={products} updateStock={updateStock} user={user} />}
      {activeTab === 'history' && <StockHistory stockHistory={stockHistory || []} />}
      {activeTab === 'opname' && <StockOpname products={products} />}
      {activeTab === 'transfer' && <StockTransfer products={products} />}
    </div>
  )
}

function StockOverview({ products }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Daftar Stok Produk</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Stok</th>
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
                <td className="px-6 py-4">{product.category}</td>
                <td className="px-6 py-4 text-right font-semibold">
                  {product.stock} {product.unit}
                </td>
                <td className="px-6 py-4 text-right text-gray-600">
                  {product.minStock} {product.unit}
                </td>
                <td className="px-6 py-4 text-right font-semibold">
                  Rp {(product.price * product.stock).toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 text-center">
                  {product.stock <= product.minStock ? (
                    <span className="badge badge-danger">Rendah</span>
                  ) : product.stock <= product.minStock * 2 ? (
                    <span className="badge badge-warning">Perhatian</span>
                  ) : (
                    <span className="badge badge-success">Aman</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StockAdjustment({ products, updateStock, user }) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState('add')
  const [reason, setReason] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('adjustment')

  const adjustmentTypes = [
    { value: 'adjustment', label: 'Penyesuaian Manual' },
    { value: 'purchase', label: 'Pembelian/Restock' },
    { value: 'return', label: 'Retur Barang' },
    { value: 'damage', label: 'Barang Rusak/Expired' },
    { value: 'sync_marketplace', label: 'Sinkronisasi Marketplace' },
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedProduct || !quantity) return

    updateStock(selectedProduct, parseInt(quantity), type, adjustmentType, reason || adjustmentTypes.find(a => a.value === adjustmentType)?.label, user?.id)
    alert('Stok berhasil disesuaikan')
    setSelectedProduct('')
    setQuantity('')
    setReason('')
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Penyesuaian Stok Manual</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-2">Pilih Produk</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="input"
            required
          >
            <option value="">-- Pilih Produk --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} - Stok: {p.stock} {p.unit}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Operasi</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input">
              <option value="add">Tambah Stok</option>
              <option value="subtract">Kurangi Stok</option>
              <option value="set">Set Stok</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Jumlah</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tipe Penyesuaian</label>
          <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)} className="input">
            {adjustmentTypes.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Catatan (Opsional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            rows="3"
            placeholder="Catatan tambahan..."
          />
        </div>

        <button type="submit" className="btn btn-primary inline-flex items-center gap-2">
          <RefreshCw size={20} />
          Sesuaikan Stok
        </button>
      </form>
    </div>
  )
}

// Stock History Component
function StockHistory({ stockHistory }) {
  const [filterType, setFilterType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const typeLabels = {
    sale: { label: 'Penjualan', color: 'text-red-600 bg-red-50' },
    purchase: { label: 'Pembelian', color: 'text-green-600 bg-green-50' },
    adjustment: { label: 'Penyesuaian', color: 'text-blue-600 bg-blue-50' },
    sync_marketplace: { label: 'Sync Marketplace', color: 'text-purple-600 bg-purple-50' },
    return: { label: 'Retur', color: 'text-orange-600 bg-orange-50' },
    damage: { label: 'Rusak/Expired', color: 'text-gray-600 bg-gray-100' },
  }

  const filteredHistory = stockHistory.filter(h => {
    const matchType = filterType === 'all' || h.type === filterType
    const matchSearch = !searchTerm || 
      h.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.productSku?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History size={20} />
          Riwayat Perubahan Stok
        </h3>
        <span className="text-sm text-gray-500">{stockHistory.length} total records</span>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input flex-1 max-w-xs"
        />
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="input"
        >
          <option value="all">Semua Tipe</option>
          <option value="sale">Penjualan</option>
          <option value="purchase">Pembelian</option>
          <option value="adjustment">Penyesuaian</option>
          <option value="sync_marketplace">Sync Marketplace</option>
          <option value="return">Retur</option>
        </select>
      </div>

      {filteredHistory.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Belum ada riwayat perubahan stok</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Lama</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Perubahan</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Baru</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHistory.slice(0, 100).map((h) => {
                const typeInfo = typeLabels[h.type] || { label: h.type, color: 'text-gray-600 bg-gray-50' }
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(h.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{h.productName}</p>
                      <p className="text-xs text-gray-500">{h.productSku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{h.oldStock}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${h.change > 0 ? 'text-green-600' : h.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {h.change > 0 ? '+' : ''}{h.change}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{h.newStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{h.note || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StockOpname({ products }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Stock Opname</h3>
      <p className="text-gray-600 mb-4">
        Fitur stock opname untuk penghitungan fisik stok akan segera hadir.
      </p>
      <button className="btn btn-primary">
        Mulai Stock Opname
      </button>
    </div>
  )
}

function StockTransfer({ products }) {
  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-4">Transfer Stok Antar Gudang</h3>
      <p className="text-gray-600 mb-4">
        Fitur transfer stok untuk multi-gudang akan segera hadir.
      </p>
      <button className="btn btn-primary">
        Transfer Stok
      </button>
    </div>
  )
}
