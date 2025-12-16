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
    { id: 'damaged', label: 'Stok Rusak' },
    { id: 'adjustment', label: 'Penyesuaian Stok' },
    { id: 'history', label: 'Riwayat Stok' },
    { id: 'opname', label: 'Stock Opname' },
    { id: 'transfer', label: 'Transfer Stok' },
  ]
  
  const totalDamagedStock = products.reduce((sum, p) => sum + (p.damagedStock || 0), 0)

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
      {activeTab === 'damaged' && <DamagedStock products={products} />}
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

function DamagedStock({ products }) {
  const damagedProducts = products.filter(p => (p.damagedStock || 0) > 0)
  const totalDamaged = products.reduce((sum, p) => sum + (p.damagedStock || 0), 0)
  const totalDamagedValue = products.reduce((sum, p) => sum + ((p.damagedStock || 0) * (p.cost || p.price || 0)), 0)

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">Stok Barang Rusak</h3>
          <p className="text-sm text-gray-500">Barang rusak dari retur pelanggan</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-red-600">{totalDamaged} unit</p>
          <p className="text-sm text-gray-500">Nilai: Rp {totalDamagedValue.toLocaleString('id-ID')}</p>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Normal</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Rusak</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nilai Rusak</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {damagedProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  Tidak ada barang rusak
                </td>
              </tr>
            ) : (
              damagedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                    {product.code || product.sku || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {product.category || '-'}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {product.stock || 0}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">
                    {product.damagedStock || 0}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    Rp {((product.damagedStock || 0) * (product.cost || product.price || 0)).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
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
  const { updateStock } = useProductStore()
  const { user } = useAuthStore()
  const [isOpnameActive, setIsOpnameActive] = useState(false)
  const [opnameData, setOpnameData] = useState([])
  const [opnameHistory, setOpnameHistory] = useState(() => {
    const saved = localStorage.getItem('stock-opname-history')
    return saved ? JSON.parse(saved) : []
  })
  const [searchTerm, setSearchTerm] = useState('')

  const startOpname = () => {
    // Initialize opname data with current products
    const initialData = products.map(p => ({
      productId: p.id,
      productName: p.name,
      productCode: p.code || p.sku,
      category: p.category,
      unit: p.unit,
      systemStock: p.stock,
      actualStock: '',
      difference: 0,
      note: ''
    }))
    setOpnameData(initialData)
    setIsOpnameActive(true)
  }

  const updateActualStock = (productId, value) => {
    setOpnameData(prev => prev.map(item => {
      if (item.productId === productId) {
        const actual = value === '' ? '' : parseInt(value) || 0
        return {
          ...item,
          actualStock: actual,
          difference: actual === '' ? 0 : actual - item.systemStock
        }
      }
      return item
    }))
  }

  const updateNote = (productId, note) => {
    setOpnameData(prev => prev.map(item => 
      item.productId === productId ? { ...item, note } : item
    ))
  }

  const saveOpname = async () => {
    // Filter items that have been counted
    const countedItems = opnameData.filter(item => item.actualStock !== '')
    
    if (countedItems.length === 0) {
      alert('Belum ada produk yang dihitung!')
      return
    }

    const itemsWithDifference = countedItems.filter(item => item.difference !== 0)
    
    if (!confirm(`Simpan hasil stock opname?\n\n${countedItems.length} produk dihitung\n${itemsWithDifference.length} produk ada selisih\n\nStok akan disesuaikan otomatis.`)) {
      return
    }

    // Create opname record
    const opnameRecord = {
      id: Date.now(),
      date: new Date().toISOString(),
      countedBy: user?.name || 'System',
      totalProducts: countedItems.length,
      productsWithDifference: itemsWithDifference.length,
      items: countedItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        systemStock: item.systemStock,
        actualStock: item.actualStock,
        difference: item.difference,
        note: item.note
      }))
    }

    // Save to history
    const newHistory = [opnameRecord, ...opnameHistory]
    setOpnameHistory(newHistory)
    localStorage.setItem('stock-opname-history', JSON.stringify(newHistory))

    // Update stock for items with difference
    for (const item of itemsWithDifference) {
      await updateStock(
        item.productId, 
        item.actualStock, 
        'set', 
        'opname', 
        `Stock Opname: ${item.note || 'Penyesuaian stok fisik'}`,
        user?.id
      )
    }

    alert(`✅ Stock opname berhasil disimpan!\n\n${itemsWithDifference.length} produk telah disesuaikan stoknya.`)
    setIsOpnameActive(false)
    setOpnameData([])
  }

  const cancelOpname = () => {
    if (!confirm('Batalkan stock opname? Data yang sudah diinput akan hilang.')) return
    setIsOpnameActive(false)
    setOpnameData([])
  }

  const filteredOpnameData = opnameData.filter(item => 
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.productCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const deleteOpnameHistory = (id) => {
    if (!confirm('Hapus riwayat opname ini?')) return
    const newHistory = opnameHistory.filter(h => h.id !== id)
    setOpnameHistory(newHistory)
    localStorage.setItem('stock-opname-history', JSON.stringify(newHistory))
  }

  if (!isOpnameActive) {
    return (
      <div className="space-y-6">
        {/* Start Opname Card */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold">Stock Opname</h3>
              <p className="text-sm text-gray-500">Penghitungan fisik stok barang</p>
            </div>
            <button onClick={startOpname} className="btn btn-primary">
              + Mulai Stock Opname
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Petunjuk:</strong> Stock opname digunakan untuk mencocokkan stok sistem dengan stok fisik di gudang. 
              Setelah selesai, sistem akan otomatis menyesuaikan stok berdasarkan hasil penghitungan.
            </p>
          </div>
        </div>

        {/* Opname History */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Riwayat Stock Opname</h3>
          {opnameHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Belum ada riwayat stock opname</p>
          ) : (
            <div className="space-y-4">
              {opnameHistory.slice(0, 10).map(record => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{new Date(record.date).toLocaleString('id-ID')}</p>
                      <p className="text-sm text-gray-500">Oleh: {record.countedBy}</p>
                    </div>
                    <button 
                      onClick={() => deleteOpnameHistory(record.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Produk:</span>
                      <span className="ml-2 font-medium">{record.totalProducts}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ada Selisih:</span>
                      <span className={`ml-2 font-medium ${record.productsWithDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {record.productsWithDifference}
                      </span>
                    </div>
                  </div>
                  {record.items && record.items.filter(i => i.difference !== 0).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-blue-600 cursor-pointer">Lihat detail selisih</summary>
                      <div className="mt-2 text-sm">
                        {record.items.filter(i => i.difference !== 0).map((item, idx) => (
                          <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                            <span>{item.productName}</span>
                            <span className={item.difference > 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.difference > 0 ? '+' : ''}{item.difference}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Active Opname View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold">Stock Opname Aktif</h3>
            <p className="text-sm text-gray-500">Input stok fisik untuk setiap produk</p>
          </div>
          <div className="flex gap-2">
            <button onClick={cancelOpname} className="btn btn-secondary">Batalkan</button>
            <button onClick={saveOpname} className="btn btn-primary">Simpan Opname</button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Cari produk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input"
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{opnameData.length}</p>
          <p className="text-sm text-gray-600">Total Produk</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {opnameData.filter(i => i.actualStock !== '').length}
          </p>
          <p className="text-sm text-gray-600">Sudah Dihitung</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {opnameData.filter(i => i.actualStock !== '' && i.difference !== 0).length}
          </p>
          <p className="text-sm text-gray-600">Ada Selisih</p>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stok Sistem</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stok Fisik</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Selisih</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredOpnameData.map(item => (
                <tr key={item.productId} className={`hover:bg-gray-50 ${item.difference !== 0 ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.productCode} • {item.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {item.systemStock} {item.unit}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.actualStock}
                      onChange={(e) => updateActualStock(item.productId, e.target.value)}
                      className="input w-24 text-center mx-auto"
                      min="0"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {item.actualStock !== '' && (
                      <span className={`font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateNote(item.productId, e.target.value)}
                      className="input text-sm"
                      placeholder="Catatan..."
                    />
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

function StockTransfer({ products }) {
  const { updateStock } = useProductStore()
  const { user } = useAuthStore()
  const [showModal, setShowModal] = useState(false)
  const [transferHistory, setTransferHistory] = useState(() => {
    const saved = localStorage.getItem('stock-transfer-history')
    return saved ? JSON.parse(saved) : []
  })
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    fromWarehouse: 'Gudang Utama',
    toWarehouse: '',
    note: ''
  })

  const warehouses = ['Gudang Utama', 'Gudang Cabang 1', 'Gudang Cabang 2', 'Gudang Toko', 'Gudang Retur']

  const handleTransfer = (e) => {
    e.preventDefault()
    
    const product = products.find(p => p.id === formData.productId)
    if (!product) {
      alert('Produk tidak ditemukan')
      return
    }

    const qty = parseInt(formData.quantity)
    if (qty <= 0) {
      alert('Jumlah harus lebih dari 0')
      return
    }

    if (qty > product.stock) {
      alert(`Stok tidak cukup! Stok tersedia: ${product.stock}`)
      return
    }

    if (formData.fromWarehouse === formData.toWarehouse) {
      alert('Gudang asal dan tujuan tidak boleh sama')
      return
    }

    // Create transfer record
    const transfer = {
      id: Date.now(),
      productId: product.id,
      productName: product.name,
      productCode: product.code || product.sku,
      quantity: qty,
      fromWarehouse: formData.fromWarehouse,
      toWarehouse: formData.toWarehouse,
      note: formData.note,
      transferredBy: user?.name || 'System',
      createdAt: new Date().toISOString()
    }

    // Save to history
    const newHistory = [transfer, ...transferHistory]
    setTransferHistory(newHistory)
    localStorage.setItem('stock-transfer-history', JSON.stringify(newHistory))

    // Update stock (for demo, we just log it - in real app would update warehouse-specific stock)
    // updateStock(product.id, qty, 'subtract', 'transfer', `Transfer ke ${formData.toWarehouse}`, user?.id)

    alert(`✅ Transfer berhasil!\n\n${product.name}\nJumlah: ${qty}\nDari: ${formData.fromWarehouse}\nKe: ${formData.toWarehouse}`)
    
    setFormData({
      productId: '',
      quantity: '',
      fromWarehouse: 'Gudang Utama',
      toWarehouse: '',
      note: ''
    })
    setShowModal(false)
  }

  const handleDeleteTransfer = (id) => {
    if (!confirm('Hapus riwayat transfer ini?')) return
    const newHistory = transferHistory.filter(t => t.id !== id)
    setTransferHistory(newHistory)
    localStorage.setItem('stock-transfer-history', JSON.stringify(newHistory))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold">Transfer Stok Antar Gudang</h3>
            <p className="text-sm text-gray-500">Pindahkan stok dari satu gudang ke gudang lain</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Transfer Baru
          </button>
        </div>

        {/* Warehouse Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {warehouses.map(wh => {
            const transfersIn = transferHistory.filter(t => t.toWarehouse === wh).reduce((sum, t) => sum + t.quantity, 0)
            const transfersOut = transferHistory.filter(t => t.fromWarehouse === wh).reduce((sum, t) => sum + t.quantity, 0)
            return (
              <div key={wh} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 truncate">{wh}</p>
                <p className="text-sm font-semibold text-green-600">+{transfersIn}</p>
                <p className="text-sm font-semibold text-red-600">-{transfersOut}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transfer History */}
      <div className="card">
        <h3 className="text-lg font-bold mb-4">Riwayat Transfer</h3>
        {transferHistory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada riwayat transfer</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dari</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ke</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oleh</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transferHistory.slice(0, 20).map(transfer => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(transfer.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{transfer.productName}</p>
                      <p className="text-xs text-gray-500">{transfer.productCode}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{transfer.quantity}</td>
                    <td className="px-4 py-3 text-sm">{transfer.fromWarehouse}</td>
                    <td className="px-4 py-3 text-sm">{transfer.toWarehouse}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{transfer.transferredBy}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleDeleteTransfer(transfer.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Transfer Stok Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Pilih Produk</label>
                <select 
                  value={formData.productId}
                  onChange={(e) => setFormData({...formData, productId: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jumlah</label>
                <input 
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="input"
                  min="1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dari Gudang</label>
                  <select 
                    value={formData.fromWarehouse}
                    onChange={(e) => setFormData({...formData, fromWarehouse: e.target.value})}
                    className="input"
                    required
                  >
                    {warehouses.map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ke Gudang</label>
                  <select 
                    value={formData.toWarehouse}
                    onChange={(e) => setFormData({...formData, toWarehouse: e.target.value})}
                    className="input"
                    required
                  >
                    <option value="">-- Pilih --</option>
                    {warehouses.filter(wh => wh !== formData.fromWarehouse).map(wh => (
                      <option key={wh} value={wh}>{wh}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan (opsional)</label>
                <textarea 
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  className="input"
                  rows="2"
                  placeholder="Alasan transfer..."
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
