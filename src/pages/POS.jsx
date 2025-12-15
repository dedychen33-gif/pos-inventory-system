import { useState, useRef, useEffect, Component } from 'react'
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus,
  User,
  Percent,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Smartphone,
  Wallet,
  Pause,
  X,
  Check,
  Printer,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useCartStore } from '../store/cartStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAuthStore } from '../store/authStore'
import { firebaseDB } from '../lib/firebase'

function POSContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)
  const [cashAmount, setCashAmount] = useState('')
  const [remoteScanEnabled, setRemoteScanEnabled] = useState(false)
  const [lastRemoteScan, setLastRemoteScan] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const searchInputRef = useRef(null)
  
  const { products, updateStock } = useProductStore()
  const { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity,
    updateItemDiscount,
    setDiscount,
    setCustomer,
    setPaymentMethod,
    selectedCustomer,
    discount,
    discountType,
    paymentMethod,
    getSubtotal,
    getDiscount,
    getTax,
    getTotal,
    clearCart,
    holdTransaction
  } = useCartStore()
  
  const { customers } = useCustomerStore()
  const { addTransaction } = useTransactionStore()
  const { storeInfo } = useSettingsStore()
  const { user } = useAuthStore()

  // Listen for remote barcode scans from Android via Firebase
  useEffect(() => {
    if (!remoteScanEnabled) return

    // Listen to Firebase barcode_scans
    const unsubscribe = firebaseDB.onValue('barcode_scans', async (data) => {
      if (!data) return
      
      // Find unprocessed scans
      const scans = Object.entries(data).map(([id, scan]) => ({ ...scan, id }))
      const unprocessedScans = scans.filter(s => !s.processed)
      
      for (const scan of unprocessedScans) {
        // Find product by barcode
        const product = products.find(p => 
          p.barcode === scan.barcode || 
          p.code === scan.barcode || 
          p.sku === scan.barcode
        )
        
        if (product) {
          // Add to cart
          if (product.stock > 0) {
            addToCart(product)
            setLastRemoteScan({
              barcode: scan.barcode,
              product: product.name,
              device: scan.device_name,
              time: new Date().toLocaleTimeString()
            })
            
            // Play success sound (optional)
            try {
              const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp2LdV1PU2V4jZ+jnIxvVEJIX3mOnaCXhWlNOT9Wd46hpJuGZkQwPFd0j6OlloBcOiotUXORpqmhimE/LzNTdJOnq6OKXzgoLVJ1k6mupYlaPyctUneVq7CnilY4Ji5VeZitsKmIUjYmL1h8m6+xqYdNMyYwW4CfsrOpg0gvJjFehKKzsqV9QysmM2OIpbSypXY+JyU2aI2otbKicDkkJDlukqu2sqBqNSMjPHOWrre0nWQxIiJAfpqxuLSZXSwgIkWDn7S4tJRVKR4hSoiltbi0kE4lHSBOjqm3uLSMRyIbIFOTrLi4tIY/HxofWJivuLi0gDgdGR5dnbG4uLR5MRoYHmKhsri4tHIrFxYeZ6WzuLhzLA==')
              audio.volume = 0.3
              audio.play()
            } catch {}
          }
        } else {
          setLastRemoteScan({
            barcode: scan.barcode,
            product: null,
            device: scan.device_name,
            time: new Date().toLocaleTimeString(),
            error: 'Produk tidak ditemukan'
          })
        }
        
        // Mark as processed
        await firebaseDB.update(`barcode_scans/${scan.id}`, { 
          processed: true, 
          processed_at: new Date().toISOString() 
        })
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [remoteScanEnabled, products, addToCart])

  const filteredProducts = (products || []).filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode?.includes(searchTerm)
  )

  const handleAddProduct = (product) => {
    if (product.stock > 0) {
      addToCart(product)
      setSearchTerm('')
      searchInputRef.current?.focus()
    } else {
      alert('Stok habis!')
    }
  }

  const handleProcessPayment = () => {
    if (cartItems.length === 0) {
      alert('Cart masih kosong!')
      return
    }
    setShowPaymentModal(true)
  }

  const handleCompleteTransaction = async () => {
    const total = getTotal()
    const cash = parseFloat(cashAmount) || 0
    
    if (paymentMethod === 'cash' && cash < total) {
      alert('Jumlah uang tidak cukup!')
      return
    }

    setIsProcessing(true)

    try {
      // Create transaction
      const transaction = {
        items: cartItems,
        customer: selectedCustomer,
        subtotal: getSubtotal(),
        discount: getDiscount(),
        tax: getTax(),
        total: total,
        paymentMethod: paymentMethod,
        cashAmount: paymentMethod === 'cash' ? cash : total,
        change: paymentMethod === 'cash' ? cash - total : 0,
        cashierName: user?.name || 'Kasir',
        cashierId: user?.id
      }

      // Update stock with history tracking (reason: 'sale')
      for (const item of cartItems) {
        try {
          await updateStock(item.id, item.quantity, 'subtract', 'sale', `Penjualan`, user?.id)
        } catch (stockError) {
          console.warn('Stock update error for item:', item.id, stockError)
        }
      }

      // Save transaction
      const result = await addTransaction(transaction)
      
      // addTransaction returns { success, transaction } or { success, error }
      // Use the original transaction object which has all the data
      setLastTransaction(transaction)
      setShowPaymentModal(false)
      setShowReceiptModal(true)
      clearCart()
      setCashAmount('')
    } catch (error) {
      console.error('Transaction error:', error)
      alert('Gagal memproses transaksi: ' + (error?.message || 'Unknown error'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
    setShowReceiptModal(false)
  }

  const handleHold = () => {
    if (cartItems.length === 0) {
      alert('Cart masih kosong!')
      return
    }
    
    const id = holdTransaction()
    alert(`Transaksi disimpan dengan ID: ${id}`)
  }

  const handleVoid = () => {
    if (confirm('Batalkan transaksi ini?')) {
      clearCart()
    }
  }

  const subtotal = getSubtotal()
  const discountAmount = getDiscount()
  const tax = getTax()
  const total = getTotal()

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Remote Scan Notification */}
      {lastRemoteScan && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg animate-pulse ${
          lastRemoteScan.error ? 'bg-red-500' : 'bg-green-500'
        } text-white max-w-sm`}>
          <div className="flex items-center gap-3">
            {lastRemoteScan.error ? (
              <X className="flex-shrink-0" size={24} />
            ) : (
              <Check className="flex-shrink-0" size={24} />
            )}
            <div>
              <p className="font-semibold">
                {lastRemoteScan.error || lastRemoteScan.product}
              </p>
              <p className="text-sm opacity-90">
                {lastRemoteScan.barcode} • {lastRemoteScan.device}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setLastRemoteScan(null)}
            className="absolute top-1 right-1 p-1 hover:bg-white/20 rounded"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Left Panel - Products & Cart */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk (nama, kode, atau scan barcode)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
            {/* Remote Scan Toggle */}
            <button
              onClick={() => setRemoteScanEnabled(!remoteScanEnabled)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                remoteScanEnabled 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title="Aktifkan untuk menerima scan dari HP Android"
            >
              {remoteScanEnabled ? <Wifi size={20} /> : <WifiOff size={20} />}
              <span className="hidden lg:inline">
                {remoteScanEnabled ? 'Scanner Aktif' : 'Remote Scan'}
              </span>
            </button>
            <button
              onClick={() => setShowCustomerModal(true)}
              className="btn btn-outline flex items-center gap-2"
            >
              <User size={20} />
              {selectedCustomer ? selectedCustomer.name : 'Pilih Pelanggan'}
            </button>
          </div>
          
          {/* Remote scan status bar */}
          {remoteScanEnabled && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-green-700 font-medium">Menunggu scan dari Android...</span>
              </div>
              <p className="text-green-600 text-sm ml-auto">
                Buka "Remote Scanner" di HP untuk scan barcode
              </p>
            </div>
          )}
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {searchTerm && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-lg ${
                    product.stock > 0
                      ? 'border-gray-200 hover:border-primary bg-white'
                      : 'border-red-200 bg-red-50 cursor-not-allowed opacity-50'
                  }`}
                  disabled={product.stock === 0}
                >
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.code}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-primary">
                      Rp {(product.price || 0).toLocaleString('id-ID')}
                    </p>
                    <p className={`text-sm ${product.stock > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                      Stock: {product.stock}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!searchTerm && (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <Search size={64} className="mx-auto mb-4 opacity-50" />
                <p>Cari atau scan produk untuk memulai transaksi</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white border-l flex flex-col">
        {/* Cart Header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Keranjang</h2>
          <p className="text-sm text-gray-600">{cartItems.length} item</p>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <ShoppingBag size={64} className="mx-auto mb-4 opacity-50" />
                <p>Keranjang kosong</p>
              </div>
            </div>
          ) : (
            (cartItems || []).map((item) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      Rp {(item.price || 0).toLocaleString('id-ID')} x {item.quantity}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-600 hover:bg-red-100 p-1 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded hover:bg-gray-300"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-primary text-white rounded hover:bg-blue-600"
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="font-bold text-gray-900">
                    Rp {((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        <div className="p-4 border-t space-y-3">
          <div className="flex items-center justify-between text-gray-600">
            <span>Subtotal</span>
            <span>Rp {(subtotal || 0).toLocaleString('id-ID')}</span>
          </div>
          
          <div className="flex items-center justify-between text-gray-600">
            <span>Diskon</span>
            <span className="text-red-600">- Rp {(discountAmount || 0).toLocaleString('id-ID')}</span>
          </div>
          
          <div className="flex items-center justify-between text-gray-600">
            <span>Pajak (11%)</span>
            <span>Rp {(tax || 0).toLocaleString('id-ID')}</span>
          </div>
          
          <div className="flex items-center justify-between text-xl font-bold pt-3 border-t">
            <span>Total</span>
            <span className="text-primary">Rp {(total || 0).toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          <button
            onClick={handleProcessPayment}
            disabled={cartItems.length === 0}
            className="w-full btn btn-success py-4 text-lg font-bold"
          >
            <Check size={24} />
            BAYAR
          </button>
          
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleHold} className="btn btn-warning">
              <Pause size={18} />
              Hold
            </button>
            <button onClick={handleVoid} className="btn btn-danger">
              <X size={18} />
              Void
            </button>
            <button className="btn btn-secondary">
              <Percent size={18} />
              Diskon
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <Modal onClose={() => setShowCustomerModal(false)} title="Pilih Pelanggan">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(customers || []).map((customer) => (
              <button
                key={customer.id}
                onClick={() => {
                  setCustomer(customer)
                  setShowCustomerModal(false)
                }}
                className={`w-full p-3 rounded-lg border-2 text-left hover:border-primary transition-colors ${
                  selectedCustomer?.id === customer.id
                    ? 'border-primary bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <p className="font-semibold">{customer.name}</p>
                <p className="text-sm text-gray-600">{customer.phone}</p>
                {customer.type !== 'walk-in' && (
                  <p className="text-xs text-primary mt-1">Poin: {customer.points}</p>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <Modal onClose={() => setShowPaymentModal(false)} title="Pembayaran">
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold text-center text-primary mb-6">
                Rp {(total || 0).toLocaleString('id-ID')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Tunai', icon: DollarSign },
                  { id: 'card', label: 'Kartu', icon: CreditCard },
                  { id: 'ewallet', label: 'E-Wallet', icon: Smartphone },
                  { id: 'transfer', label: 'Transfer', icon: Wallet },
                ].map((method) => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 ${
                        paymentMethod === method.id
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      <Icon size={24} />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium mb-2">Jumlah Uang</label>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                  className="input text-xl text-right"
                  autoFocus
                />
                {cashAmount && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium">Kembalian:</span>
                      <span className="text-xl font-bold text-green-600">
                        Rp {Math.max(0, parseFloat(cashAmount) - total).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[50000, 100000, 200000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCashAmount(amount.toString())}
                      className="btn btn-outline"
                    >
                      {amount.toLocaleString('id-ID')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCompleteTransaction}
              disabled={isProcessing}
              className="w-full btn btn-success py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Memproses...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Selesaikan Transaksi
                </>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && lastTransaction && (
        <Modal onClose={() => setShowReceiptModal(false)} title="Struk Pembayaran">
          <div id="receipt" className="space-y-4">
            <div className="text-center border-b pb-4">
              <h2 className="text-2xl font-bold">{storeInfo?.name || 'TOKO SAYA'}</h2>
              <p className="text-sm text-gray-600">{storeInfo?.address || 'Alamat Toko'}</p>
              <p className="text-sm text-gray-600">Telp: {storeInfo?.phone || '-'}</p>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>No. Transaksi:</span>
                <span className="font-semibold">{lastTransaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal:</span>
                <span>{lastTransaction?.date ? new Date(lastTransaction.date).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{lastTransaction.cashierName}</span>
              </div>
            </div>

            <div className="border-t border-b py-3 space-y-2">
              {(lastTransaction?.items || []).map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span>Rp {((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {item.quantity} x Rp {(item.price || 0).toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Rp {(lastTransaction?.subtotal || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Diskon:</span>
                <span>- Rp {(lastTransaction?.discount || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Pajak (11%):</span>
                <span>Rp {(lastTransaction?.tax || 0).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>Rp {(lastTransaction?.total || 0).toLocaleString('id-ID')}</span>
              </div>
              
              {lastTransaction.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Bayar:</span>
                    <span>Rp {(lastTransaction?.cashAmount || 0).toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Kembali:</span>
                    <span>Rp {(lastTransaction?.change || 0).toLocaleString('id-ID')}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center text-sm text-gray-600 pt-4 border-t">
              <p>Terima kasih atas kunjungan Anda</p>
              <p>Barang yang sudah dibeli tidak dapat ditukar</p>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button onClick={handlePrintReceipt} className="flex-1 btn btn-primary">
              <Printer size={20} />
              Print Struk
            </button>
            <button onClick={() => setShowReceiptModal(false)} className="flex-1 btn btn-secondary">
              Tutup
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Modal({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

// Error Boundary (must be defined before use)
class POSErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('POS Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
            <h2 className="text-xl font-bold text-red-600 mb-4">Terjadi Kesalahan</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'Unknown error'}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// Main export with Error Boundary
export default function POS() {
  return (
    <POSErrorBoundary>
      <POSContent />
    </POSErrorBoundary>
  )
}
