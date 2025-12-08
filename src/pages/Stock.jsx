import { useState } from 'react'
import { Package, TrendingUp, TrendingDown, RefreshCw, AlertTriangle, DollarSign } from 'lucide-react'
import { useProductStore } from '../store/productStore'

export default function Stock() {
  const [activeTab, setActiveTab] = useState('overview')
  const { products, updateStock, getLowStockProducts } = useProductStore()
  
  const lowStockProducts = getLowStockProducts()
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0)

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'adjustment', label: 'Penyesuaian Stok' },
    { id: 'opname', label: 'Stock Opname' },
    { id: 'transfer', label: 'Transfer Stok' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manajemen Stok</h1>
        <p className="text-gray-600 mt-1">Monitor dan kelola stok barang</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Item</p>
              <p className="text-2xl font-bold mt-1">{products.length}</p>
            </div>
            <Package className="text-primary" size={40} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nilai Stok</p>
              <p className="text-2xl font-bold mt-1">Rp {(totalValue / 1000000).toFixed(1)}M</p>
            </div>
            <DollarSign className="text-success" size={40} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stok Rendah</p>
              <p className="text-2xl font-bold mt-1 text-warning">{lowStockProducts.length}</p>
            </div>
            <AlertTriangle className="text-warning" size={40} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stok</p>
              <p className="text-2xl font-bold mt-1">
                {products.reduce((sum, p) => sum + p.stock, 0)}
              </p>
            </div>
            <Package className="text-info" size={40} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
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
      {activeTab === 'adjustment' && <StockAdjustment products={products} updateStock={updateStock} />}
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

function StockAdjustment({ products, updateStock }) {
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('')
  const [type, setType] = useState('add')
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedProduct || !quantity) return

    updateStock(parseInt(selectedProduct), parseInt(quantity), type)
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
            <label className="block text-sm font-medium mb-2">Tipe</label>
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
          <label className="block text-sm font-medium mb-2">Alasan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            rows="3"
            placeholder="Alasan penyesuaian stok..."
          />
        </div>

        <button type="submit" className="btn btn-primary">
          <RefreshCw size={20} />
          Sesuaikan Stok
        </button>
      </form>
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

function DollarSign(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  )
}
