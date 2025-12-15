import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Search, Edit, Trash2, Package, Truck, Calendar, FileText, DollarSign } from 'lucide-react'
import { usePurchaseStore } from '../store/purchaseStore'
import { useProductStore } from '../store/productStore'
import { useAuthStore } from '../store/authStore'
import { isAndroid } from '../utils/platform'
import PullToRefresh from '../components/PullToRefresh'

export default function Purchases() {
  const [showModal, setShowModal] = useState(false)
  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(null)
  const { purchases, suppliers, addPurchase, updatePurchase, deletePurchase, addSupplier, deleteSupplier } = usePurchaseStore()
  const { products, updateStock } = useProductStore()
  const { user } = useAuthStore()

  // Pull to refresh handler
  const handleRefresh = useCallback(async () => {
    if (window.__forceSync) {
      await window.__forceSync()
    }
  }, [])

  const handleAddPurchase = () => {
    setEditingPurchase(null)
    setShowModal(true)
  }

  const handleEdit = (purchase) => {
    setEditingPurchase(purchase)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus pembelian ini?')) {
      deletePurchase(id)
    }
  }

  const handleSubmit = (purchaseData) => {
    if (editingPurchase) {
      updatePurchase(editingPurchase.id, purchaseData)
    } else {
      addPurchase(purchaseData)
      // Update stock produk dengan history tracking
      purchaseData.items.forEach(item => {
        const product = products.find(p => p.id === item.productId)
        if (product) {
          updateStock(
            item.productId, 
            item.qty, 
            'add', 
            'purchase', 
            `PO: ${purchaseData.poNumber || 'Manual'}`, 
            user?.id
          )
        }
      })
    }
    setShowModal(false)
    setEditingPurchase(null)
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge badge-warning',
      received: 'badge badge-success',
      partial: 'badge badge-info',
      cancelled: 'badge badge-danger'
    }
    return badges[status] || 'badge'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      received: 'Diterima',
      partial: 'Sebagian',
      cancelled: 'Dibatalkan'
    }
    return labels[status] || status
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pembelian</h1>
          <p className="text-gray-600 mt-1">Kelola pembelian barang dari supplier</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSupplierModal(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Truck size={20} />
            Kelola Supplier
          </button>
          <button
            onClick={handleAddPurchase}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            Buat Purchase Order
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Purchase Order</p>
          <p className="text-2xl font-bold mt-1">{purchases.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold mt-1 text-warning">
            {purchases.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Diterima</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {purchases.filter(p => p.status === 'received').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Supplier</p>
          <p className="text-2xl font-bold mt-1 text-primary">
            {suppliers.length}
          </p>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <Package size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Belum ada purchase order</p>
                    <p className="text-sm mt-1">Klik "Buat Purchase Order" untuk menambah pembelian baru</p>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold">
                      {purchase.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(purchase.date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck size={16} className="text-gray-400" />
                        <span className="font-medium">{purchase.supplierName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span>{purchase.items.length} item</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-primary">
                      Rp {purchase.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(purchase.status)}>
                        {getStatusLabel(purchase.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      <button
                        onClick={() => handleEdit(purchase)}
                        className="text-primary hover:text-blue-700"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Modal */}
      {showModal && (
        <PurchaseModal
          purchase={editingPurchase}
          suppliers={suppliers}
          products={products}
          onClose={() => {
            setShowModal(false)
            setEditingPurchase(null)
          }}
          onSubmit={handleSubmit}
        />
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <SupplierModal
          suppliers={suppliers}
          onClose={() => setShowSupplierModal(false)}
          onAdd={addSupplier}
          onDelete={deleteSupplier}
        />
      )}
    </div>
    </PullToRefresh>
  )
}

function PurchaseModal({ purchase, suppliers, products, onClose, onSubmit }) {
  const [formData, setFormData] = useState(purchase || {
    supplier: null,
    items: [],
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    notes: ''
  })

  const [productSearch, setProductSearch] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredProducts = products.filter(p =>
    productSearch && (
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase()))
    )
  )

  const addItem = (product) => {
    if (!product) return

    const existingItem = formData.items.find(i => i.productId === product.id)
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map(i =>
          i.productId === product.id ? { ...i, qty: i.qty + quantity } : i
        )
      })
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          costPrice: product.costPrice || 0,
          qty: quantity
        }]
      })
    }

    setProductSearch('')
    setShowProductDropdown(false)
    setQuantity(1)
  }

  const updateItemQty = (productId, newQty) => {
    setFormData({
      ...formData,
      items: formData.items.map(item =>
        item.productId === productId ? { ...item, qty: parseInt(newQty) || 1 } : item
      )
    })
  }

  const updateItemPrice = (productId, newPrice) => {
    setFormData({
      ...formData,
      items: formData.items.map(item =>
        item.productId === productId ? { ...item, costPrice: parseFloat(newPrice) || 0 } : item
      )
    })
  }

  const removeItem = (productId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.productId !== productId)
    })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.costPrice * item.qty), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.supplier) {
      alert('Pilih supplier terlebih dahulu')
      return
    }
    if (formData.items.length === 0) {
      alert('Tambahkan minimal 1 produk')
      return
    }

    const supplier = suppliers.find(s => s.id === formData.supplier || String(s.id) === String(formData.supplier))
    onSubmit({
      ...formData,
      supplierId: formData.supplier,
      supplierName: supplier?.name || '',
      subtotal: calculateTotal(),
      total: calculateTotal()
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">
            {purchase ? 'Edit Purchase Order' : 'Buat Purchase Order Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Supplier *</label>
              <select
                value={formData.supplier || ''}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="input"
                required
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tanggal *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          {/* Add Products */}
          <div>
            <label className="block text-sm font-medium mb-2">Tambah Produk</label>
            <div className="flex gap-2">
              <div className="flex-1 relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Cari produk (nama atau SKU)..."
                  className="input"
                />
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addItem(product)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-600">
                          SKU: {product.sku} | Modal: Rp {product.costPrice?.toLocaleString('id-ID')}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                className="input w-24"
                placeholder="Qty"
              />
            </div>
          </div>

          {/* Items Table */}
          {formData.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Harga Modal</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formData.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.sku}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => updateItemQty(item.productId, e.target.value)}
                          className="input-sm w-20 text-center"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.costPrice}
                          onChange={(e) => updateItemPrice(item.productId, e.target.value)}
                          className="input-sm w-32 text-right"
                          min="0"
                          step="100"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        Rp {(item.costPrice * item.qty).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="3" className="px-4 py-3 text-right font-bold">TOTAL:</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-primary">
                      Rp {calculateTotal().toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows="2"
              placeholder="Catatan tambahan..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="input"
            >
              <option value="pending">Pending</option>
              <option value="partial">Sebagian Diterima</option>
              <option value="received">Diterima</option>
              <option value="cancelled">Dibatalkan</option>
            </select>
          </div>
        </form>

        <div className="flex gap-3 p-6 border-t">
          <button type="button" onClick={handleSubmit} className="flex-1 btn btn-primary">
            {purchase ? 'Update Purchase Order' : 'Buat Purchase Order'}
          </button>
          <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}

function SupplierModal({ suppliers, onClose, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', contact: '', email: '', address: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd(formData)
    setFormData({ name: '', contact: '', email: '', address: '' })
    setShowForm(false)
  }

  const handleDelete = (id, name) => {
    if (confirm(`Hapus supplier "${name}"?`)) {
      onDelete(id)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">Kelola Supplier</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!showForm ? (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="w-full btn btn-primary flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Tambah Supplier Baru
              </button>

              <div className="space-y-3">
                {suppliers.map(supplier => (
                  <div key={supplier.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{supplier.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          📞 {supplier.phone || supplier.contact} | ✉️ {supplier.email}
                        </p>
                        <p className="text-sm text-gray-600">📍 {supplier.address}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Hapus Supplier"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Supplier *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Kontak *</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Alamat</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input"
                  rows="2"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 btn btn-primary">Simpan</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn btn-secondary">
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="p-6 border-t">
          <button onClick={onClose} className="w-full btn btn-secondary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
