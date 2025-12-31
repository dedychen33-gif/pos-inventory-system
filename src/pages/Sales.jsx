import { useState, useEffect, useRef } from 'react'
import { Plus, Search, Edit, Trash2, Eye, Package, User, Calendar, Printer, TrendingUp, DollarSign, ShoppingCart, CheckCircle, ScanLine, Wallet, PenTool, X, Camera } from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSalesOrderStore } from '../store/salesOrderStore'
import { useTransactionStore } from '../store/transactionStore'
import { useAuthStore } from '../store/authStore'
import { useAccountStore } from '../store/accountStore'
import { isAndroid } from '../utils/platform'

// Signature Pad Component
function SignaturePad({ onSave, onClose, initialSignature }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (initialSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)
        setHasSignature(true)
      }
      img.src = initialSignature
    }
  }, [initialSignature])

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const coords = getCoordinates(e)
    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const saveSignature = () => {
    if (!hasSignature) {
      alert('Silakan tanda tangan terlebih dahulu')
      return
    }
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-xl max-w-lg w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <PenTool size={20} />
            Tanda Tangan Penerima
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg mb-4 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full cursor-crosshair"
            style={{ touchAction: 'none' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <p className="text-xs text-gray-500 text-center mb-4">
          Tanda tangan di area di atas menggunakan mouse atau jari (touchscreen)
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearSignature}
            className="flex-1 btn btn-secondary"
          >
            Hapus
          </button>
          <button
            type="button"
            onClick={saveSignature}
            className="flex-1 btn btn-primary"
          >
            Simpan Tanda Tangan
          </button>
        </div>
      </div>
    </div>
  )
}


export default function Sales() {
  const [showModal, setShowModal] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  
  const { salesOrders, addSalesOrder, updateSalesOrder, deleteSalesOrder, updateStatus } = useSalesOrderStore()
  const { products, updateStock } = useProductStore()
  const { customers } = useCustomerStore()
  const { storeInfo } = useSettingsStore()
  const { addTransaction } = useTransactionStore()
  const { user } = useAuthStore()
  const { accounts, addCashFlow } = useAccountStore()
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [selectedSaleForSignature, setSelectedSaleForSignature] = useState(null)
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false)
  const [selectedSaleForProof, setSelectedSaleForProof] = useState(null)
  const paymentProofInputRef = useRef(null)
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
      deleteSalesOrder(id)
    }
  }

  const handleAddSignature = (sale) => {
    setSelectedSaleForSignature(sale)
    setShowSignatureModal(true)
  }

  const handleSaveSignature = async (signature) => {
    if (selectedSaleForSignature) {
      await updateSalesOrder(selectedSaleForSignature.id, { signature })
      setShowSignatureModal(false)
      setSelectedSaleForSignature(null)
    }
  }

  const handleOpenPaymentProof = (sale) => {
    setSelectedSaleForProof(sale)
    setShowPaymentProofModal(true)
  }

  const handleUploadPaymentProof = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Convert to base64
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target.result
      if (selectedSaleForProof) {
        await updateSalesOrder(selectedSaleForProof.id, { paymentProof: base64 })
        setSelectedSaleForProof({ ...selectedSaleForProof, paymentProof: base64 })
        alert('✓ Bukti pembayaran berhasil disimpan!')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeletePaymentProof = async () => {
    if (selectedSaleForProof && confirm('Hapus bukti pembayaran ini?')) {
      await updateSalesOrder(selectedSaleForProof.id, { paymentProof: null })
      setSelectedSaleForProof({ ...selectedSaleForProof, paymentProof: null })
    }
  }

  const handleMarkAsPaid = async (sale) => {
    if (sale.status === 'completed') {
      alert('Sales order ini sudah lunas!')
      return
    }
    
    // Show payment modal to select account
    setSelectedSaleForPayment(sale)
    setSelectedAccountId(accounts.length > 0 ? accounts[0].id : '')
    setShowPaymentModal(true)
  }

  const processPayment = async () => {
    const sale = selectedSaleForPayment
    if (!sale) return

    if (!selectedAccountId) {
      alert('Pilih rekening tujuan pembayaran!')
      return
    }

    try {
      const selectedAccount = accounts.find(a => a.id === selectedAccountId)
      
      // Create transaction record with same orderNumber as Sales Order
      const transaction = {
        id: sale.orderNumber || sale.id,
        items: sale.items.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.qty,
          cost: item.cost || 0
        })),
        customer: sale.customer,
        subtotal: sale.subtotal,
        discount: sale.discount || 0,
        tax: 0,
        total: sale.total,
        paymentMethod: selectedAccount?.type || 'cash',
        accountId: selectedAccountId,
        accountName: selectedAccount?.name || 'Kas',
        cashAmount: sale.total,
        change: 0,
        cashierName: user?.name || 'Admin',
        cashierId: user?.id,
        source: 'sales_order',
        salesOrderId: sale.id,
        notes: `Pembayaran SO: ${sale.orderNumber || sale.id}`
      }
      
      await addTransaction(transaction)

      // Add cash flow (money in)
      await addCashFlow({
        type: 'in',
        amount: sale.total,
        accountId: selectedAccountId,
        category: 'sales',
        description: `Penjualan SO: ${sale.orderNumber || sale.id}`,
        referenceId: sale.id,
        referenceType: 'sales_order'
      })

      // Update SO status to completed
      await updateStatus(sale.id, 'completed')

      setShowPaymentModal(false)
      setSelectedSaleForPayment(null)
      alert('✓ Sales Order berhasil ditandai LUNAS!\n\nUang masuk ke: ' + (selectedAccount?.name || 'Kas'))
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert('Gagal memproses: ' + error.message)
    }
  }

  const handlePrint = (sale) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) {
      alert('Popup diblokir! Izinkan popup untuk mencetak invoice.')
      return
    }
    
    // Handle undefined values
    const subtotal = sale.subtotal || 0
    const discount = sale.discount || 0
    const total = sale.total || 0
    const customerName = sale.customer?.name || 'Customer'
    const storeName = storeInfo?.name || 'Toko Saya'
    const storeAddress = storeInfo?.address || ''
    const storePhone = storeInfo?.phone || '-'
    const storeEmail = storeInfo?.email || '-'
    const storeLogo = storeInfo?.logo || ''
    const signature = sale.signature || ''
    
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${sale.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { background: #ffffff !important; color: #000000 !important; }
          body { font-family: Arial, sans-serif; padding: 70px 15px 15px 15px; font-size: 10px; }
          .invoice-header { text-align: center; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; }
          .logo-section { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 6px; }
          .logo { width: 40px; height: 40px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 6px; display: flex; align-items: center; justify-center; overflow: hidden; }
          .logo img { width: 100%; height: 100%; object-fit: contain; }
          .logo svg { width: 24px; height: 24px; color: white; }
          .company-info { text-align: center; }
          .company-info h2 { font-size: 12px; color: #1e293b; font-weight: bold; margin-bottom: 2px; }
          .company-info p { font-size: 8px; color: #64748b; line-height: 1.3; }
          .invoice-header h1 { font-size: 14px; color: #2563eb; margin-bottom: 2px; }
          .invoice-header p { color: #666; font-size: 8px; }
          .invoice-info { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .info-section h3 { font-size: 8px; color: #666; margin-bottom: 2px; }
          .info-section p { font-size: 9px; margin-bottom: 2px; }
          .invoice-id { font-size: 10px; font-weight: bold; color: #2563eb; }
          table { width: 100%; border-collapse: collapse; margin: 8px 0; }
          th { background: #f3f4f6; padding: 4px 6px; text-align: left; font-size: 8px; color: #666; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
          td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-section { margin-top: 8px; float: right; width: 180px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 9px; }
          .total-row.grand { font-size: 11px; font-weight: bold; border-top: 1px solid #333; padding-top: 6px; margin-top: 4px; }
          .notes { margin-top: 15px; padding: 8px; background: #f9fafb; border-left: 2px solid #2563eb; font-size: 8px; }
          .notes h4 { font-size: 9px; margin-bottom: 4px; }
          .receipt-section { margin-top: 30px; border: 2px solid #333; padding: 15px; background: #fafafa; }
          .receipt-title { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 15px; text-transform: uppercase; border-bottom: 1px dashed #333; padding-bottom: 8px; }
          .receipt-content { display: flex; justify-content: space-between; align-items: flex-start; }
          .receipt-info { flex: 1; }
          .receipt-info p { margin-bottom: 5px; font-size: 9px; }
          .receipt-signature { width: 200px; text-align: center; }
          .signature-box { border: 1px solid #ccc; height: 80px; margin-bottom: 5px; background: white; display: flex; align-items: center; justify-content: center; }
          .signature-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .signature-label { font-size: 8px; color: #666; }
          .signature-name { font-size: 10px; font-weight: bold; margin-top: 5px; }
          .footer { margin-top: 20px; text-align: center; color: #666; font-size: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
          .action-buttons { position: fixed; top: 0; left: 0; right: 0; display: flex; justify-content: center; gap: 12px; z-index: 9999; background: #1e293b; padding: 12px 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
          .action-buttons button { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
          .btn-print { background: #22c55e; color: white; }
          .btn-close { background: #ef4444; color: white; }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
            .action-buttons { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="action-buttons no-print">
          <button class="btn-print" onclick="window.print()">🖨️ Print</button>
          <button class="btn-close" onclick="closeWindow()">✕ Tutup</button>
        </div>
        <script>
          function closeWindow() {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              window.close();
            }
            // Fallback: redirect to main page after short delay
            setTimeout(function() {
              window.location.href = '/sales';
            }, 100);
          }
        </script>
        <div class="invoice-header">
          <div class="logo-section">
            <div class="logo">
              ${storeLogo ? 
                `<img src="${storeLogo}" alt="Logo" />` : 
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 7h-9"></path>
                  <path d="M14 17H5"></path>
                  <circle cx="17" cy="17" r="3"></circle>
                  <circle cx="7" cy="7" r="3"></circle>
                </svg>`
              }
            </div>
            <div class="company-info">
              <h2>${storeName}</h2>
              <p>${storeAddress}<br/>
              Telp: ${storePhone} | Email: ${storeEmail}</p>
            </div>
          </div>
          <h1>INVOICE</h1>
          <p>Sales Order</p>
        </div>
        
        <div class="invoice-info">
          <div class="info-section">
            <h3>Invoice No:</h3>
            <p class="invoice-id">${sale.orderNumber || sale.id}</p>
            <h3 style="margin-top: 15px;">Tanggal:</h3>
            <p>${new Date(sale.date || new Date()).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div class="info-section" style="text-align: right;">
            <h3>Pelanggan:</h3>
            <p style="font-weight: bold; font-size: 18px;">${customerName}</p>
            <h3 style="margin-top: 15px;">Jatuh Tempo:</h3>
            <p>${new Date(sale.dueDate || new Date()).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
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
            <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row">
            <span>Diskon:</span>
            <span style="color: #ef4444;">- Rp ${discount.toLocaleString('id-ID')}</span>
          </div>
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span style="color: #16a34a;">Rp ${total.toLocaleString('id-ID')}</span>
          </div>
        </div>

        <div style="clear: both;"></div>

        ${sale.notes ? `
          <div class="notes">
            <h4>Catatan:</h4>
            <p>${sale.notes}</p>
          </div>
        ` : ''}

        <!-- Tanda Terima Section -->
        <div class="receipt-section">
          <div class="receipt-title">📋 TANDA TERIMA BARANG</div>
          <div class="receipt-content">
            <div class="receipt-info">
              <p><strong>No. Invoice:</strong> ${sale.orderNumber || sale.id}</p>
              <p><strong>Tanggal Terima:</strong> ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Penerima:</strong> ${customerName}</p>
              <p><strong>Total Item:</strong> ${sale.items.reduce((sum, item) => sum + item.qty, 0)} pcs</p>
              <p><strong>Total Nilai:</strong> Rp ${total.toLocaleString('id-ID')}</p>
              <p style="margin-top: 10px; font-size: 8px; color: #666;">Dengan menandatangani dokumen ini, penerima menyatakan telah menerima barang dalam kondisi baik dan lengkap sesuai dengan daftar di atas.</p>
            </div>
            <div class="receipt-signature">
              <div class="signature-box">
                ${signature ? `<img src="${signature}" alt="Tanda Tangan" />` : '<span style="color: #999; font-size: 10px;">Tanda Tangan</span>'}
              </div>
              <div class="signature-label">Tanda Tangan Penerima</div>
              <div class="signature-name">${customerName}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Terima kasih atas kepercayaan Anda!</p>
          <p style="margin-top: 5px;">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <script>
          // Auto print disabled for Android - use Print button instead
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
      processing: 'badge badge-primary',
      delivered: 'badge badge-success',
      completed: 'badge badge-success',
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
      completed: 'Lunas',
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

      {/* Search and Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari no. pesanan, pelanggan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Diproses</option>
            <option value="completed">Lunas</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Dari Tanggal"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Sampai Tanggal"
          />
        </div>
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
          <p className="text-sm text-gray-600">Lunas</p>
          <p className="text-2xl font-bold mt-1 text-success">
            {salesOrders.filter(s => s.status === 'completed').length}
          </p>
        </div>
      </div>

      {/* Sales Orders Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. Pesanan</th>
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
              {(() => {
                // Filter sales orders
                const filteredSales = salesOrders.filter(s => {
                  // Basic filter for valid sales
                  if (!(s.items?.length > 0 || s.total > 0)) return false
                  // Search filter
                  if (searchQuery) {
                    const query = searchQuery.toLowerCase()
                    const matchOrder = (s.orderNumber || s.id || '').toLowerCase().includes(query)
                    const matchCustomer = (s.customer?.name || s.customerName || '').toLowerCase().includes(query)
                    if (!matchOrder && !matchCustomer) return false
                  }
                  // Status filter
                  if (statusFilter !== 'all' && s.status !== statusFilter) return false
                  // Date filter
                  if (dateFrom) {
                    const saleDate = new Date(s.date)
                    const fromDate = new Date(dateFrom)
                    if (saleDate < fromDate) return false
                  }
                  if (dateTo) {
                    const saleDate = new Date(s.date)
                    const toDate = new Date(dateTo)
                    toDate.setHours(23, 59, 59, 999)
                    if (saleDate > toDate) return false
                  }
                  return true
                })

                if (filteredSales.length === 0) {
                  return (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <Package size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">{salesOrders.length === 0 ? 'Belum ada sales order' : 'Tidak ada hasil'}</p>
                        <p className="text-sm mt-1">{salesOrders.length === 0 ? 'Klik "Buat Sales Order" untuk menambah penjualan baru' : 'Coba ubah filter pencarian'}</p>
                      </td>
                    </tr>
                  )
                }

                return filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-mono font-semibold">
                    {sale.orderNumber || sale.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {sale.date && !isNaN(new Date(sale.date).getTime()) 
                      ? new Date(sale.date).toLocaleDateString('id-ID') 
                      : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium">{sale.customer?.name || sale.customerName || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-gray-400" />
                      <span>{sale.items?.length || 0} item</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-green-600">
                    Rp {(sale.total || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{sale.dueDate && !isNaN(new Date(sale.dueDate).getTime()) ? new Date(sale.dueDate).toLocaleDateString('id-ID') : '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(sale.status)}>
                      {getStatusLabel(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    {sale.status !== 'completed' && (
                      <button
                        onClick={() => handleMarkAsPaid(sale)}
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Tandai Lunas"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleAddSignature(sale)}
                      className={`${sale.signature ? 'text-purple-600' : 'text-gray-400'} hover:text-purple-700`}
                      title={sale.signature ? 'Lihat/Ubah Tanda Tangan' : 'Tambah Tanda Tangan'}
                    >
                      <PenTool size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenPaymentProof(sale)}
                      className={`${sale.paymentProof ? 'text-orange-600' : 'text-gray-400'} hover:text-orange-700`}
                      title={sale.paymentProof ? 'Lihat Bukti Bayar' : 'Upload Bukti Bayar'}
                    >
                      <Camera size={18} />
                    </button>
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
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Hapus"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
              })()}
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
          onSubmit={async (sale) => {
            try {
              if (editingSale) {
                await updateSalesOrder(sale.id, sale)
                setShowModal(false)
                setEditingSale(null)
              } else {
                // Kurangi stok saat buat SO baru
                for (const item of sale.items) {
                  await updateStock(item.id, item.qty, 'subtract', 'sales_order', `SO: ${sale.orderNumber || 'New'}`, user?.id)
                }
                await addSalesOrder(sale)
                setShowModal(false)
                alert('✓ Sales Order berhasil dibuat!\nStok produk sudah dikurangi.')
              }
            } catch (error) {
              console.error('Error saving sales order:', error)
              alert('Gagal menyimpan: ' + error.message)
            }
          }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSaleForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Konfirmasi Pembayaran</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Sales Order</p>
                <p className="font-bold text-lg">{selectedSaleForPayment.orderNumber || selectedSaleForPayment.id}</p>
                <p className="text-sm text-gray-600 mt-2">Total Pembayaran</p>
                <p className="font-bold text-2xl text-primary">
                  Rp {(selectedSaleForPayment.total || 0).toLocaleString('id-ID')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  <Wallet size={16} className="inline mr-1" />
                  Uang Masuk ke Rekening *
                </label>
                {accounts.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      Belum ada rekening. Tambahkan rekening di menu Pengaturan → Kelola Rekening.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="input"
                  >
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.type === 'cash' ? 'Kas' : account.type === 'bank' ? 'Bank' : 'E-Wallet'})
                        {' - Saldo: Rp ' + (account.balance || 0).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={processPayment}
                  disabled={accounts.length === 0}
                  className="flex-1 btn btn-primary"
                >
                  Konfirmasi Pembayaran
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && selectedSaleForSignature && (
        <SignaturePad
          initialSignature={selectedSaleForSignature.signature}
          onSave={handleSaveSignature}
          onClose={() => {
            setShowSignatureModal(false)
            setSelectedSaleForSignature(null)
          }}
        />
      )}

      {/* Payment Proof Modal */}
      {showPaymentProofModal && selectedSaleForProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Bukti Pembayaran</h3>
              <button onClick={() => setShowPaymentProofModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              <p><strong>No. Pesanan:</strong> {selectedSaleForProof.orderNumber || selectedSaleForProof.id}</p>
              <p><strong>Pelanggan:</strong> {selectedSaleForProof.customer?.name || '-'}</p>
              <p><strong>Total:</strong> Rp {(selectedSaleForProof.total || 0).toLocaleString('id-ID')}</p>
            </div>

            {selectedSaleForProof.paymentProof ? (
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={selectedSaleForProof.paymentProof} 
                    alt="Bukti Pembayaran" 
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => paymentProofInputRef.current?.click()}
                    className="flex-1 btn btn-primary flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Ganti Foto
                  </button>
                  <button
                    onClick={handleDeletePaymentProof}
                    className="flex-1 btn btn-danger flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  onClick={() => paymentProofInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
                >
                  <Camera size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">Klik untuk upload foto</p>
                  <p className="text-sm text-gray-400 mt-1">Foto resi transfer / bukti pembayaran</p>
                </div>
              </div>
            )}

            <input
              ref={paymentProofInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPaymentProof}
              className="hidden"
            />
          </div>
        </div>
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
    notes: '',
    signature: ''
  })

  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
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
                  const customer = customers.find(c => c.id === e.target.value)
                  if (customer) {
                    // Update existing items with customer's custom prices
                    const updatedItems = formData.items.map(item => {
                      const customPrice = customer.customPrices?.[item.id]
                      if (customPrice) {
                        return { ...item, price: customPrice }
                      }
                      // Reset to default price if no custom price
                      const product = products.find(p => p.id === item.id)
                      return { ...item, price: product?.price || item.price }
                    })
                    setFormData({ ...formData, customer, items: updatedItems })
                  } else {
                    setFormData({ ...formData, customer: null })
                  }
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="Contoh: PO-2025-001"
                  className="input flex-1"
                />
                {isAndroid && (
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="btn btn-secondary px-3"
                    title="Scan Barcode"
                  >
                    <ScanLine size={20} />
                  </button>
                )}
              </div>
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
                    {filteredProducts.map(p => {
                      const customerPrice = getCustomerPrice(p, formData.customer)
                      const hasCustomPrice = formData.customer?.customPrices?.[p.id]
                      return (
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
                              {hasCustomPrice ? (
                                <>
                                  <p className="font-semibold text-green-600">Rp {customerPrice.toLocaleString('id-ID')}</p>
                                  <p className="text-xs text-gray-400 line-through">Rp {p.price.toLocaleString('id-ID')}</p>
                                  <p className="text-xs text-green-600">✓ Harga Khusus</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-semibold text-primary">Rp {p.price.toLocaleString('id-ID')}</p>
                                  <p className="text-xs text-gray-600">Stok: {p.stock} {p.unit}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
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

          {/* Signature Section */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <PenTool size={16} />
              Tanda Tangan Penerima
            </label>
            {formData.signature ? (
              <div className="space-y-2">
                <div className="border rounded-lg p-2 bg-gray-50">
                  <img 
                    src={formData.signature} 
                    alt="Tanda Tangan" 
                    className="max-h-24 mx-auto"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSignaturePad(true)}
                    className="flex-1 btn btn-secondary text-sm"
                  >
                    Ubah Tanda Tangan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, signature: '' })}
                    className="btn btn-secondary text-sm text-red-600"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <PenTool size={20} />
                Klik untuk Tanda Tangan
              </button>
            )}
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

      {/* Barcode Scanner for No. Pesanan */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setFormData({ ...formData, orderNumber: barcode })
            setShowBarcodeScanner(false)
          }}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          initialSignature={formData.signature}
          onSave={(signature) => {
            setFormData({ ...formData, signature })
            setShowSignaturePad(false)
          }}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  )
}
