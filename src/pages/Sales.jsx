import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Package, User, Calendar, Printer, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useSettingsStore } from '../store/settingsStore'
import { isAndroid } from '../utils/platform'

export default function Sales() {
  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [salesOrders, setSalesOrders] = useState([
    {
      id: 'SO001',
      date: '2025-12-06',
      customer: { id: 2, name: 'Budi Santoso' },
      items: [
        { id: 1, name: 'Indomie Goreng', sku: 'SJA123456', costPrice: 2500, price: 3000, minPrice: 2875, qty: 100, isPackage: false },
        { id: 2, name: 'Aqua 600ml', sku: 'SJA234567', costPrice: 3000, price: 3500, minPrice: 3450, qty: 50, isPackage: false }
      ],
      subtotal: 475000,
      discount: 25000,
      total: 450000,
      status: 'pending',
      dueDate: '2025-12-13',
      notes: 'Pengiriman ke alamat kantor'
    }
  ])
  
  const { products } = useProductStore()
  const { customers } = useCustomerStore()
  const { storeInfo } = useSettingsStore()

  const handleAddSale = () => {
    setEditingSale(null)
    setShowModal(true)
  }

  const handleEdit = (sale) => {
    setEditingSale(sale)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus sales order ini?')) {
      setSalesOrders(salesOrders.filter(s => s.id !== id))
    }
  }

  const handlePrint = (sale) => {
    const printWindow = window.open('', '', 'width=800,height=600')
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 40px; }
          .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo-section { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 15px; }
          .logo { width: 80px; height: 80px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; display: flex; align-items: center; justify-center; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); overflow: hidden; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .logo svg { width: 50px; height: 50px; color: white; }
          .company-info { text-align: center; }
          .company-info h2 { font-size: 24px; color: #1e293b; font-weight: bold; margin-bottom: 4px; }
          .company-info p { font-size: 13px; color: #64748b; line-height: 1.5; }
          .invoice-header h1 { font-size: 28px; color: #2563eb; margin-bottom: 5px; }
          .invoice-header p { color: #666; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-section h3 { font-size: 14px; color: #666; margin-bottom: 8px; }
          .info-section p { font-size: 16px; margin-bottom: 4px; }
          .invoice-id { font-size: 20px; font-weight: bold; color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; color: #666; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-section { margin-top: 20px; float: right; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
          .total-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; margin-top: 8px; }
          .notes { margin-top: 40px; padding: 15px; background: #f9fafb; border-left: 4px solid #2563eb; }
          .notes h4 { font-size: 14px; margin-bottom: 8px; }
          .footer { margin-top: 60px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="logo-section">
            <div class="logo">
              ${storeInfo.logo ? 
                `<img src="${storeInfo.logo}" alt="Logo" />` : 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 7h-9"></path>
                  <path d="M14 17H5"></path>
                  <circle cx="17" cy="17" r="3"></circle>
                  <circle cx="7" cy="7" r="3"></circle>
                </svg>`
              }
            </div>
            <div class="company-info">
              <h2>${storeInfo.name}</h2>
              <p>${storeInfo.address}<br/>
              Telp: ${storeInfo.phone} | Email: ${storeInfo.email}</p>
            </div>
          </div>
          <h1>INVOICE</h1>
          <p>Sales Order</p>
        </div>
        
        <div class="invoice-info">
          <div class="info-section">
            <h3>Invoice No:</h3>
            <p class="invoice-id">${sale.id}</p>
            <h3 style="margin-top: 15px;">Tanggal:</h3>
            <p>${new Date(sale.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="info-section" style="text-align: right;">
            <h3>Pelanggan:</h3>
            <p style="font-weight: bold; font-size: 18px;">${sale.customer.name}</p>
            <h3 style="margin-top: 15px;">Jatuh Tempo:</h3>
            <p>${new Date(sale.dueDate).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px;">No</th>
              <th>SKU</th>
              <th>Nama Produk</th>
              <th class="text-center" style="width: 80px;">Qty</th>
              <th class="text-right" style="width: 150px;">Harga</th>
              <th class="text-right" style="width: 150px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item, index) => `
              <tr>
                <td class="text-center">${index + 1}</td>
                <td style="font-family: monospace; font-size: 12px;">${item.sku}</td>
                <td>${item.name}${item.isPackage ? ' <span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 10px;">PAKET</span>' : ''}</td>
                <td class="text-center">${item.qty}</td>
                <td class="text-right">Rp ${item.price.toLocaleString('id-ID')}</td>
                <td class="text-right" style="font-weight: bold;">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>Rp ${sale.subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row">
            <span>Diskon:</span>
            <span style="color: #ef4444;">- Rp ${sale.discount.toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span style="color: #16a34a;">Rp ${sale.total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        ${sale.notes ? `
          <div class="notes">
            <h4>Catatan:</h4>
            <p>${sale.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Terima kasih atas kepercayaan Anda!</p>
          <p style="margin-top: 5px;">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
      </html>
    `
    printWindow.document.write(content)
    printWindow.document.close()
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge badge-warning',
      confirmed: 'badge badge-info',
      processing: 'badge badge-info',
      delivered: 'badge badge-success',
      cancelled: 'badge badge-danger'
    }
    return badges[status] || 'badge'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Dikonfirmasi',
      processing: 'Diproses',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan'
    }
    return labels[status] || status
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penjualan Member</h1>
          <p className="text-gray-600 mt-1">Kelola sales order dan penjualan ke pelanggan member</p>
        </div>
        <button
          onClick={handleAddSale}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          Buat Sales Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <p className="text-sm text-gray-600">Total Sales Order</p>
          <p className="text-2xl font-bold mt-1">{salesOrders.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold mt-1 text-warning">
            {salesOrders.filter(s => s.status === 'pending').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Diproses</p>
          <p className="text-2xl font-bold mt-1 text-info">
            {salesOrders.filter(s => s.status === 'processing').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Selesai</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {salesOrders.filter(s => s.status === 'delivered').length}
          </p>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. SO</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelanggan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {salesOrders.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold">
                    {sale.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(sale.date).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium">{sale.customer.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-400" />
                      <span>{sale.items.length} item</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">
                    Rp {sale.total.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{new Date(sale.dueDate).toLocaleDateString('id-ID')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(sale.status)}>
                      {getStatusLabel(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => handlePrint(sale)}
                      className="text-green-600 hover:text-green-700"
                      title="Print Invoice"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(sale)}
                      className="text-primary hover:text-blue-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <SalesOrderModal
          sale={editingSale}
          products={products}
          customers={customers.filter(c => c.type !== 'walk-in')}
          onClose={() => {
            setShowModal(false)
            setEditingSale(null)
          }}
          onSubmit={(sale) => {
            if (editingSale) {
              setSalesOrders(salesOrders.map(s => s.id === sale.id ? sale : s))
              setShowModal(false)
              setEditingSale(null)
            } else {
              setSalesOrders([...salesOrders, { ...sale, id: `SO${String(salesOrders.length + 1).padStart(3, '0')}` }])
              // Tidak menutup modal untuk bisa input sales order baru lagi
            }
          }}
        />
      )}
    </div>
  )
}

function SalesOrderModal({ sale, products, customers, onClose, onSubmit }) {
  const [formData, setFormData] = useState(sale || {
    orderNumber: '',
    customer: null,
    items: [],
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'pending',
    notes: ''
  })

  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
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
      (p.sku && p.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase())) ||
      p.barcode?.includes(productSearch)
    )
  )

  const getCustomerPrice = (product, customer) => {
    // Cek apakah customer memiliki harga khusus untuk produk ini
    if (customer && customer.customPrices && customer.customPrices[product.id]) {
      return customer.customPrices[product.id]
    }
    // Jika tidak ada harga khusus, gunakan harga default
    return product.price
  }

  const addItem = (product) => {
    if (!product) return

    const existingItem = formData.items.find(i => i.id === product.id)
    if (existingItem) {
      setFormData({
        ...formData,
        items: formData.items.map(i => 
          i.id === product.id ? { ...i, qty: i.qty + quantity } : i
        )
      })
    } else {
      // Hitung harga minimal (modal + 15%)
      const costPrice = product.costPrice || 0
      const minPrice = Math.ceil(costPrice * 1.15)
      
      // Gunakan harga khusus customer jika ada
      const customerPrice = getCustomerPrice(product, formData.customer)
      
      setFormData({
        ...formData,
        items: [...formData.items, {
          id: product.id,
          name: product.name,
          sku: product.sku || product.code,
          costPrice: costPrice,
          price: customerPrice,
          minPrice: minPrice,
          qty: quantity,
          isPackage: product.isPackage
        }]
      })
    }
    
    setProductSearch('')
    setShowProductDropdown(false)
    setQuantity(1)
  }

  const updateItemPrice = (itemId, newPrice) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => {
        if (item.id === itemId) {
          // Validasi: tidak boleh kurang dari modal + 15%
          if (newPrice < item.minPrice) {
            alert(`Harga tidak boleh kurang dari Rp ${item.minPrice.toLocaleString('id-ID')} (Modal + 15%)`)
            return item
          }
          return { ...item, price: parseFloat(newPrice) || item.price }
        }
        return item
      })
    })
  }

  const updateItemQty = (itemId, newQty) => {
    setFormData({
      ...formData,
      items: formData.items.map(item => 
        item.id === itemId ? { ...item, qty: parseInt(newQty) || 1 } : item
      )
    })
  }

  const removeItem = (id) => {
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    })
  }

  const subtotal = formData.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const discount = formData.discount || 0
  const total = subtotal - discount

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.customer || formData.items.length === 0) {
      alert('Pilih customer dan tambahkan minimal 1 produk')
      return
    }
    
    onSubmit({
      ...formData,
      subtotal,
      total
    })

    // Reset form untuk sales order baru
    if (!sale) {
      setFormData({
        orderNumber: '',
        customer: null,
        items: [],
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        notes: ''
      })
      setProductSearch('')
      setQuantity(1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">
            {sale ? 'Edit Sales Order' : 'Buat Sales Order Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pelanggan Member *</label>
              <select
                value={formData.customer?.id || ''}
                onChange={(e) => {
                  const customer = customers.find(c => c.id === parseInt(e.target.value))
                  setFormData({ ...formData, customer })
                }}
                className="input"
                required
              >
                <option value="">-- Pilih Pelanggan --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type.toUpperCase()})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">No. Pesanan</label>
              <input
                type="text"
                value={formData.orderNumber}
                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                placeholder="Contoh: PO-2025-001"
                className="input"
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
                <option value="confirmed">Dikonfirmasi</option>
                <option value="processing">Diproses</option>
                <option value="delivered">Terkirim</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tanggal Order</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Jatuh Tempo</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Tambah Produk</h4>
            <div className="flex gap-2 relative" ref={dropdownRef}>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={20} />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => productSearch && setShowProductDropdown(true)}
                  placeholder="Cari produk (nama, kode, atau barcode)..."
                  className="input w-full pl-10"
                />
                
                {/* Dropdown List */}
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{p.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{p.sku || p.code}</p>
                              <span className="text-xs text-gray-400">|</span>
                              <p className="text-xs text-gray-500">{p.category}</p>
                              {p.isPackage && (
                                <>
                                  <span className="text-xs text-gray-400">|</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Paket</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-primary">Rp {p.price.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-gray-600">Stok: {p.stock} {p.unit}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {showProductDropdown && productSearch && filteredProducts.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
                    <p className="text-gray-500 text-center">Produk tidak ditemukan</p>
                  </div>
                )}
              </div>
              
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                placeholder="Qty"
                className="input w-20 text-center"
              />
            </div>
            
            {productSearch && (
              <p className="text-xs text-gray-500 mt-2">
                💡 Ketik untuk mencari, klik produk untuk menambahkan
              </p>
            )}
          </div>

          {formData.items.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Items ({formData.items.length})</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Produk</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Harga Satuan</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Subtotal</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {formData.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{item.sku}</p>
                              {item.isPackage && (
                                <>
                                  <span className="text-xs text-gray-400">|</span>
                                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Paket</span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Min: Rp {item.minPrice.toLocaleString('id-ID')} (Modal + 15%)
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItemQty(item.id, e.target.value)}
                            className="input input-sm w-20 text-center"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              min={item.minPrice}
                              value={item.price}
                              onChange={(e) => updateItemPrice(item.id, e.target.value)}
                              className="input input-sm w-32 text-right"
                            />
                            {item.price < item.minPrice && (
                              <span className="text-xs text-red-600">Terlalu rendah!</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right font-semibold">
                          Rp {(item.price * item.qty).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Diskon:</span>
                  <input
                    type="number"
                    value={formData.discount || 0}
                    onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                    className="input w-32 text-right"
                    min="0"
                  />
                </div>
                <div className="flex justify-between text-xl font-bold pt-2 border-t border-blue-200">
                  <span>Total:</span>
                  <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Catatan</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows="3"
              placeholder="Catatan pengiriman, alamat, dll..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn btn-primary">
              {sale ? 'Update' : 'Simpan'} Sales Order
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
