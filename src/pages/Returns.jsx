import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Package, User, Calendar, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'
import { useSalesOrderStore } from '../store/salesOrderStore'
import { useAuthStore } from '../store/authStore'
import { firebaseDB } from '../lib/firebase'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Returns store with Firebase sync
const useReturnsStore = create(
  persist(
    (set, get) => ({
      returns: [],
      setReturns: (returns) => set({ returns }),
      
      addReturn: async (returnItem) => {
        const now = new Date()
        const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '')
        const timeStr = now.toTimeString().slice(0, 5).replace(':', '')
        const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
        const returnId = `RTN-${dateStr}-${timeStr}-${randomNum}`
        
        const newReturn = {
          ...returnItem,
          id: returnId,
          createdAt: now.toISOString()
        }
        
        // Save to Firebase
        await firebaseDB.set(`returns/${returnId}`, newReturn)
        return newReturn
      },
      
      updateReturn: async (id, data) => {
        // Update in Firebase
        await firebaseDB.update(`returns/${id}`, data)
        // Also update local state immediately
        set((state) => ({
          returns: state.returns.map(r => r.id === id ? { ...r, ...data } : r)
        }))
      },
      
      deleteReturn: async (id) => {
        // Delete from Firebase
        await firebaseDB.remove(`returns/${id}`)
        // Also update local state immediately
        set((state) => ({
          returns: state.returns.filter(r => r.id !== id)
        }))
      }
    }),
    { name: 'returns-storage' }
  )
)

// Export for use in useFirebaseSync
export { useReturnsStore }

export default function Returns() {
  const [showModal, setShowModal] = useState(false)
  const [editingReturn, setEditingReturn] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { returns, addReturn, updateReturn, deleteReturn } = useReturnsStore()
  const { products, updateStock, updateDamagedStock } = useProductStore()
  const { customers } = useCustomerStore()
  const { transactions } = useTransactionStore()
  const { salesOrders } = useSalesOrderStore()
  const { user } = useAuthStore()

  const handleAddReturn = () => {
    setEditingReturn(null)
    setShowModal(true)
  }

  const handleEdit = (returnItem) => {
    setEditingReturn(returnItem)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus data retur ini?')) {
      deleteReturn(id)
    }
  }

  const handleProcessReturn = async (returnItem) => {
    if (returnItem.status === 'completed') {
      alert('Retur ini sudah diproses!')
      return
    }

    const isDamaged = returnItem.reason === 'Barang rusak/cacat'
    const stockDestination = isDamaged ? 'Stok Barang Rusak' : 'Stok Normal'
    
    if (!confirm(`Proses retur ${returnItem.id}?\n\nAlasan: ${returnItem.reason}\nStok akan masuk ke: ${stockDestination}`)) {
      return
    }

    try {
      // Add stock back for each returned item
      for (const item of returnItem.items) {
        const qty = item.returnQty || item.qty
        if (isDamaged) {
          // Barang rusak masuk ke stok rusak
          await updateDamagedStock(item.id, qty, 'add', `Retur rusak: ${returnItem.id}`)
        } else {
          // Selain barang rusak masuk ke stok normal
          await updateStock(item.id, qty, 'add', 'return', `Retur: ${returnItem.id}`, user?.id)
        }
      }

      // Update return status
      updateReturn(returnItem.id, { status: 'completed', processedAt: new Date().toISOString() })
      
      if (isDamaged) {
        alert('✓ Retur berhasil diproses!\nBarang rusak masuk ke Stok Barang Rusak.')
      } else {
        alert('✓ Retur berhasil diproses!\nStok produk sudah ditambahkan kembali.')
      }
    } catch (error) {
      console.error('Error processing return:', error)
      alert('Gagal memproses retur: ' + error.message)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge badge-warning',
      completed: 'badge badge-success',
      cancelled: 'badge badge-danger'
    }
    return badges[status] || 'badge'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      completed: 'Selesai',
      cancelled: 'Dibatalkan'
    }
    return labels[status] || status
  }

  // Filter Sales Orders by search query
  const filteredSalesOrders = searchQuery 
    ? salesOrders.filter(so => 
        (so.orderNumber || so.id).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  // Handle create return from Sales Order
  const handleCreateReturnFromSO = (salesOrder, reason) => {
    if (!reason) {
      alert('Pilih alasan retur terlebih dahulu!')
      return
    }
    
    const returnItems = (salesOrder.items || []).map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      price: item.price,
      qty: item.qty,
      returnQty: item.qty
    }))
    
    setEditingReturn({
      customer: salesOrder.customer,
      salesOrderId: salesOrder.id,
      orderNumber: salesOrder.orderNumber || salesOrder.id,
      items: returnItems,
      reason: reason,
      status: 'pending',
      notes: ''
    })
    setShowModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Barang Retur</h1>
        <p className="text-gray-600 mt-1">Cari No. Pesanan untuk membuat retur</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Retur</p>
          <p className="text-2xl font-bold mt-1">{returns.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold mt-1 text-warning">
            {returns.filter(r => r.status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Selesai</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {returns.filter(r => r.status === 'completed').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Total Nilai Retur</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            Rp {returns.reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Search Sales Order */}
      <div className="card">
        <label className="block text-sm font-medium mb-2">Cari Sales Order untuk Retur</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Ketik No. Pesanan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Sales Orders Search Results */}
      {searchQuery && (
        <div className="card overflow-hidden">
          <h3 className="text-lg font-bold mb-4">Hasil Pencarian Sales Order</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan Retur</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSalesOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      Tidak ada Sales Order dengan No. Pesanan "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredSalesOrders.map((so) => (
                    <SOReturnRow 
                      key={so.id} 
                      salesOrder={so} 
                      onCreateReturn={handleCreateReturnFromSO} 
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Existing Returns Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-bold mb-4">Daftar Retur</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Retur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                    Belum ada data retur
                  </td>
                </tr>
              ) : (
                returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-sm">
                      {returnItem.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-600">
                      {returnItem.orderNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(returnItem.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-sm">{returnItem.customer?.name || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package size={16} className="text-gray-400" />
                        <span className="text-sm">{returnItem.items?.length || 0} item</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-red-600 text-sm">
                      Rp {(returnItem.total || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {returnItem.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(returnItem.status)}>
                        {getStatusLabel(returnItem.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                      {returnItem.status === 'pending' && (
                        <button
                          onClick={() => handleProcessReturn(returnItem)}
                          className="text-emerald-600 hover:text-emerald-700"
                          title="Proses Retur"
                        >
                          <CheckCircle size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(returnItem)}
                        className="text-primary hover:text-blue-700"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(returnItem.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Hapus"
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

      {/* Modal */}
      {showModal && (
        <ReturnModal
          returnItem={editingReturn}
          products={products}
          customers={customers}
          transactions={transactions}
          salesOrders={salesOrders}
          onClose={() => {
            setShowModal(false)
            setEditingReturn(null)
          }}
          onSubmit={(data) => {
            if (editingReturn?.id) {
              updateReturn(editingReturn.id, data)
            } else {
              addReturn(data)
            }
            setShowModal(false)
            setEditingReturn(null)
          }}
        />
      )}
    </div>
  )
}

// Component for SO row with reason dropdown
function SOReturnRow({ salesOrder, onCreateReturn }) {
  const [selectedReason, setSelectedReason] = useState('')
  
  const returnReasons = [
    'Barang rusak/cacat',
    'Salah kirim barang',
    'Tidak sesuai pesanan',
    'Kadaluarsa',
    'Lainnya'
  ]

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold text-blue-600">
        {salesOrder.orderNumber || salesOrder.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {new Date(salesOrder.createdAt).toLocaleDateString('id-ID')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {salesOrder.customer?.name || 'Walk-in'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {salesOrder.items?.length || 0} produk
      </td>
      <td className="px-6 py-4 whitespace-nowrap font-medium">
        Rp {(salesOrder.total || 0).toLocaleString('id-ID')}
      </td>
      <td className="px-4 py-4">
        <select
          value={selectedReason}
          onChange={(e) => setSelectedReason(e.target.value)}
          className="input text-sm py-1 px-2"
        >
          <option value="">-- Pilih Alasan --</option>
          {returnReasons.map(reason => (
            <option key={reason} value={reason}>{reason}</option>
          ))}
        </select>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button
          onClick={() => onCreateReturn(salesOrder, selectedReason)}
          className="btn btn-primary btn-sm flex items-center gap-1"
        >
          <RotateCcw size={16} />
          Retur
        </button>
      </td>
    </tr>
  )
}

function ReturnModal({ returnItem, products, customers, transactions, salesOrders, onClose, onSubmit }) {
  const [formData, setFormData] = useState(returnItem || {
    customer: null,
    salesOrderId: '',
    orderNumber: '',
    items: [],
    reason: '',
    status: 'pending',
    notes: ''
  })

  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const filteredProducts = products.filter(p => 
    productSearch && (
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
    )
  )

  const addItem = (product) => {
    const existingItem = formData.items.find(i => i.id === product.id)
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map(i => 
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        )
      })
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, {
          id: product.id,
          name: product.name,
          sku: product.sku || product.code,
          price: product.price,
          qty: 1
        }]
      })
    }
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const updateItemQty = (itemId, qty) => {
    if (qty < 1) {
      setFormData({
        ...formData,
        items: formData.items.filter(i => i.id !== itemId)
      })
    } else {
      setFormData({
        ...formData,
        items: formData.items.map(i => 
          i.id === itemId ? { ...i, qty } : i
        )
      })
    }
  }

  const removeItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== itemId)
    })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.items.length === 0) {
      alert('Tambahkan minimal 1 item untuk retur!')
      return
    }
    onSubmit({
      ...formData,
      total: calculateTotal()
    })
  }

  const returnReasons = [
    'Barang rusak/cacat',
    'Salah kirim barang',
    'Tidak sesuai pesanan',
    'Barang kadaluarsa',
    'Pelanggan berubah pikiran',
    'Lainnya'
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {returnItem ? 'Edit Retur' : 'Buat Retur Baru'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] space-y-6">
          {/* Customer & Order Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pelanggan</label>
              <select
                value={formData.customer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === e.target.value)
                  setFormData({ ...formData, customer })
                }}
                className="input"
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">No. Pesanan (dari Penjualan)</label>
              <select
                value={formData.salesOrderId || ''}
                onChange={(e) => {
                  const selectedSO = salesOrders.find(so => so.id === e.target.value)
                  if (selectedSO) {
                    // Convert SO items to return items format
                    const returnItems = (selectedSO.items || []).map(item => ({
                      id: item.id,
                      name: item.name,
                      code: item.code,
                      price: item.price,
                      qty: item.qty,
                      returnQty: item.qty
                    }))
                    setFormData({ 
                      ...formData, 
                      salesOrderId: selectedSO.id,
                      orderNumber: selectedSO.orderNumber || selectedSO.id,
                      customer: selectedSO.customer,
                      items: returnItems
                    })
                  } else {
                    setFormData({ ...formData, salesOrderId: '', orderNumber: '', items: [] })
                  }
                }}
                className="input"
              >
                <option value="">-- Pilih Sales Order --</option>
                {salesOrders.map(so => (
                  <option key={so.id} value={so.id}>
                    {so.orderNumber || so.id} - {so.customer?.name || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Alasan Retur *</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input"
              required
            >
              <option value="">-- Pilih Alasan --</option>
              {returnReasons.map(reason => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>

          {/* Info: Produk otomatis dari Sales Order */}
          {formData.salesOrderId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                ✓ Produk otomatis diambil dari Sales Order yang dipilih
              </p>
            </div>
          )}

          {/* Items Table */}
          {formData.items.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produk</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 w-24">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                    <th className="px-4 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {formData.items.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku}</p>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItemQty(item.id, parseInt(e.target.value) || 1)}
                          className="input w-20 text-center"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        Rp {item.price.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-sm">
                        Rp {(item.price * item.qty).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
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
                    <td colSpan="3" className="px-4 py-3 text-right font-semibold">Total Retur:</td>
                    <td className="px-4 py-3 text-right font-bold text-lg text-red-600">
                      Rp {calculateTotal().toLocaleString('id-ID')}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              rows="3"
              placeholder="Catatan tambahan..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {returnItem ? 'Update Retur' : 'Simpan Retur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
