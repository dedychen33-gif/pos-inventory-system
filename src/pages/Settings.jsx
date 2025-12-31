import { useState } from 'react'
import { Store, Upload, Image as ImageIcon, Database, Download, Trash2, Info, MessageCircle, User, Plus, Edit2, UserX, UserCheck, Shield, Key, X, Tag, Ruler, Check, ShoppingBag } from 'lucide-react'
import { useAuthStore, PERMISSION_LABELS } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useCartStore } from '../store/cartStore'
import { useSalesOrderStore } from '../store/salesOrderStore'
import { firebaseDB } from '../lib/firebase'

export default function Settings() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalMode, setUserModalMode] = useState('add')
  const [selectedUser, setSelectedUser] = useState(null)
  
  const { users = [], user: currentUser, addUser, updateUser, deleteUser, toggleUserActive, isAdmin } = useAuthStore() || {}
  const { storeInfo = {}, updateStoreInfo, whatsappNumber, whatsappMessage, updateWhatsApp, shopeeCredentials = {}, updateShopeeCredentials } = useSettingsStore() || {}
  const { products = [], categories = [], units = [], setCategories, setUnits } = useProductStore() || {}
  const { customers = [] } = useCustomerStore() || {}
  const { transactions = [] } = useTransactionStore() || {}
  const { purchases = [], suppliers = [] } = usePurchaseStore() || {}
  const { cartItems = [] } = useCartStore() || {}
  const { salesOrders = [] } = useSalesOrderStore() || {}
  
  const [formData, setFormData] = useState(storeInfo || {})
  const [waFormData, setWaFormData] = useState({ 
    number: whatsappNumber || '', 
    message: whatsappMessage || 'Halo, saya ingin bertanya tentang produk di toko Anda.' 
  })
  const [shopeeFormData, setShopeeFormData] = useState({
    partnerId: shopeeCredentials?.partnerId || '',
    partnerKey: shopeeCredentials?.partnerKey || '',
    shopId: shopeeCredentials?.shopId || '',
    pushPartnerKey: shopeeCredentials?.pushPartnerKey || ''
  })
  
  // Category & Unit management states
  const [newCategory, setNewCategory] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [editCategoryValue, setEditCategoryValue] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [editingUnit, setEditingUnit] = useState(null)
  const [editUnitValue, setEditUnitValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleBackupDatabase = () => {
    const returnsData = JSON.parse(localStorage.getItem('returns-storage') || '{}')
    const returns = returnsData?.state?.returns || []
    
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        products: products,
        customers: customers,
        transactions: transactions,
        purchases: purchases,
        suppliers: suppliers,
        salesOrders: salesOrders,
        returns: returns,
        settings: storeInfo,
        users: users,
        cart: cartItems
      }
    }

    const dataStr = JSON.stringify(backupData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `backup-pos-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    alert('Backup database berhasil diunduh!')
  }

  const handleRestoreDatabase = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!confirm('Restore database akan mengganti semua data yang ada. Lanjutkan?')) {
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result)
        
        if (!backupData.version || !backupData.data) {
          throw new Error('Format backup tidak valid')
        }

        const categories = backupData.data.products?.length > 0 
          ? [...new Set(backupData.data.products.map(p => p.category).filter(Boolean))]
          : ['Makanan', 'Minuman', 'Snack', 'Sembako', 'Elektronik', 'Alat Tulis', 'Paket Bundling']

        const normalizedProducts = (backupData.data.products || []).map(p => ({
          ...p,
          cost: p.cost || p.costPrice || 0,
          costPrice: p.costPrice || p.cost || 0,
          price: p.price || p.sellingPrice || 0,
          stock: p.stock || 0,
          minStock: p.minStock || p.min_stock || 5
        }))

        localStorage.setItem('product-storage', JSON.stringify({ 
          state: { 
            products: normalizedProducts, 
            categories: categories,
            units: ['pcs', 'kg', 'box', 'pack', 'lusin', 'kodi', 'gross', 'paket'],
            stockHistory: [],
            isOnline: false,
            isSyncing: false
          },
          version: 0
        }))
        
        localStorage.setItem('customer-storage', JSON.stringify({ 
          state: { customers: backupData.data.customers || [] },
          version: 0
        }))
        
        localStorage.setItem('transaction-storage', JSON.stringify({ 
          state: { transactions: backupData.data.transactions || [], isOnline: false },
          version: 0
        }))
        
        localStorage.setItem('purchase-storage', JSON.stringify({ 
          state: { purchases: backupData.data.purchases || [], suppliers: backupData.data.suppliers || [] },
          version: 0
        }))
        
        localStorage.setItem('settings-storage', JSON.stringify({ 
          state: { storeInfo: backupData.data.settings || {} },
          version: 0
        }))
        
        localStorage.setItem('sales-order-storage', JSON.stringify({ 
          state: { salesOrders: backupData.data.salesOrders || [] },
          version: 0
        }))
        
        localStorage.setItem('returns-storage', JSON.stringify({ 
          state: { returns: backupData.data.returns || [] },
          version: 0
        }))
        
        const users = backupData.data.users || []
        const adminUser = users.find(u => u.role === 'admin' && u.isActive) || users.find(u => u.isActive) || users[0]
        
        localStorage.setItem('auth-storage', JSON.stringify({ 
          state: { users: users, user: adminUser || null, isAuthenticated: !!adminUser },
          version: 0
        }))
        
        localStorage.setItem('restore-timestamp', Date.now().toString())
        
        if (window.migrateToFirebase) {
          try {
            const result = await window.migrateToFirebase()
            if (result.success) {
              alert(`Restore berhasil!\n\n✅ ${result.count} items di-upload ke Firebase`)
            } else {
              alert('Restore berhasil ke localStorage, tapi upload ke Firebase gagal.')
            }
          } catch (error) {
            alert('Restore berhasil ke localStorage, tapi upload ke Firebase gagal.')
          }
        } else {
          alert('Restore database berhasil!')
        }
        
        setTimeout(() => window.location.reload(), 2000)
      } catch (error) {
        alert('Error restore database: ' + error.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearDatabase = async () => {
    if (!confirm('⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data.\nData TIDAK BISA dikembalikan!\nLanjutkan?')) {
      return
    }

    if (!confirm('Konfirmasi sekali lagi: Anda yakin ingin menghapus SEMUA database?')) {
      return
    }

    useProductStore.setState({ products: [], categories: ['Makanan', 'Minuman', 'Snack', 'Sembako', 'Elektronik', 'Alat Tulis'] })
    useCustomerStore.setState({ customers: [{ id: 1, name: 'Walk-in Customer', phone: '-', email: '-', address: '-', type: 'walk-in', points: 0, totalSpent: 0, customPrices: {} }] })
    useTransactionStore.setState({ transactions: [] })
    usePurchaseStore.setState({ purchases: [], suppliers: [] })
    useCartStore.setState({ items: [], discount: 0, discountType: 'percent', paymentMethod: 'cash', customerId: null })
    useSalesOrderStore.setState({ salesOrders: [] })

    localStorage.removeItem('product-storage')
    localStorage.removeItem('customer-storage')
    localStorage.removeItem('transaction-storage')
    localStorage.removeItem('purchase-storage')
    localStorage.removeItem('settings-storage')
    localStorage.removeItem('cart-storage')
    localStorage.removeItem('sales-order-storage')
    localStorage.removeItem('returns-storage')

    alert('✅ Database berhasil dihapus!')
    window.location.reload(true)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormData({ ...formData, logo: event.target.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveStoreInfo = () => {
    updateStoreInfo(formData)
    alert('Informasi toko berhasil disimpan!')
  }

  const handleSaveWhatsApp = () => {
    updateWhatsApp(waFormData.number, waFormData.message)
    alert('Pengaturan WhatsApp berhasil disimpan!')
  }

  const handleSaveShopee = async () => {
    await updateShopeeCredentials(shopeeFormData)
    alert('Kredensial Shopee berhasil disimpan!')
  }

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    if (categories.includes(newCategory.trim())) {
      alert('Kategori sudah ada!')
      return
    }
    
    setIsSaving(true)
    try {
      const newCategories = [...categories, newCategory.trim()]
      const result = await firebaseDB.set('categories', newCategories)
      if (result.success) {
        setCategories(newCategories)
        setNewCategory('')
      } else {
        alert('Gagal menambah kategori')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditCategory = (cat) => {
    setEditingCategory(cat)
    setEditCategoryValue(cat)
  }

  const handleSaveEditCategory = async () => {
    if (!editCategoryValue.trim() || editCategoryValue.trim() === editingCategory) {
      setEditingCategory(null)
      return
    }

    setIsSaving(true)
    try {
      const oldCategory = editingCategory
      const newCategoryName = editCategoryValue.trim()
      
      // Update category list
      const newCategories = categories.map(c => c === oldCategory ? newCategoryName : c)
      const result = await firebaseDB.set('categories', newCategories)
      
      if (result.success) {
        // Update all products with old category
        const productsToUpdate = products.filter(p => p.category === oldCategory)
        const updatePromises = productsToUpdate.map(product => 
          firebaseDB.update(`products/${product.id}`, { 
            category: newCategoryName,
            updatedAt: new Date().toISOString()
          })
        )
        await Promise.all(updatePromises)
        
        setCategories(newCategories)
        setEditingCategory(null)
        setEditCategoryValue('')
        console.log(`✅ Updated ${productsToUpdate.length} products to new category "${newCategoryName}"`)
      } else {
        alert('Gagal mengubah kategori')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCategory = async (cat) => {
    const productsWithCategory = products.filter(p => p.category === cat)
    if (productsWithCategory.length > 0) {
      alert(`Tidak bisa hapus! Ada ${productsWithCategory.length} produk dengan kategori ini.`)
      return
    }
    
    if (!confirm(`Hapus kategori "${cat}"?`)) return
    
    setIsSaving(true)
    try {
      const newCategories = categories.filter(c => c !== cat)
      const result = await firebaseDB.set('categories', newCategories)
      if (result.success) {
        setCategories(newCategories)
      } else {
        alert('Gagal menghapus kategori')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Unit Management Functions
  const handleAddUnit = async () => {
    if (!newUnit.trim()) return
    if (units.includes(newUnit.trim())) {
      alert('Satuan sudah ada!')
      return
    }
    
    setIsSaving(true)
    try {
      const newUnits = [...units, newUnit.trim()]
      const result = await firebaseDB.set('units', newUnits)
      if (result.success) {
        setUnits(newUnits)
        setNewUnit('')
      } else {
        alert('Gagal menambah satuan')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditUnit = (unit) => {
    setEditingUnit(unit)
    setEditUnitValue(unit)
  }

  const handleSaveEditUnit = async () => {
    if (!editUnitValue.trim() || editUnitValue.trim() === editingUnit) {
      setEditingUnit(null)
      return
    }

    setIsSaving(true)
    try {
      const oldUnit = editingUnit
      const newUnitName = editUnitValue.trim()
      
      // Update unit list
      const newUnits = units.map(u => u === oldUnit ? newUnitName : u)
      const result = await firebaseDB.set('units', newUnits)
      
      if (result.success) {
        // Update all products with old unit
        const productsToUpdate = products.filter(p => p.unit === oldUnit)
        const updatePromises = productsToUpdate.map(product => 
          firebaseDB.update(`products/${product.id}`, { 
            unit: newUnitName,
            updatedAt: new Date().toISOString()
          })
        )
        await Promise.all(updatePromises)
        
        setUnits(newUnits)
        setEditingUnit(null)
        setEditUnitValue('')
        console.log(`✅ Updated ${productsToUpdate.length} products to new unit "${newUnitName}"`)
      } else {
        alert('Gagal mengubah satuan')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUnit = async (unit) => {
    const productsWithUnit = products.filter(p => p.unit === unit)
    if (productsWithUnit.length > 0) {
      alert(`Tidak bisa hapus! Ada ${productsWithUnit.length} produk dengan satuan ini.`)
      return
    }
    
    if (!confirm(`Hapus satuan "${unit}"?`)) return
    
    setIsSaving(true)
    try {
      const newUnits = units.filter(u => u !== unit)
      const result = await firebaseDB.set('units', newUnits)
      if (result.success) {
        setUnits(newUnits)
      } else {
        alert('Gagal menghapus satuan')
      }
    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddUser = () => {
    setUserModalMode('add')
    setSelectedUser(null)
    setShowUserModal(true)
  }

  const handleEditUser = (user) => {
    setUserModalMode('edit')
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleDeleteUser = (user) => {
    if (!confirm(`Hapus user "${user.name}"?`)) return
    const result = deleteUser(user.id)
    if (!result.success) alert(result.error)
  }

  const handleToggleUserActive = (user) => {
    const action = user.isActive ? 'nonaktifkan' : 'aktifkan'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.name}"?`)) return
    const result = toggleUserActive(user.id)
    if (!result.success) alert(result.error)
  }

  const handleChangePassword = (user) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600 mt-1">Konfigurasi sistem dan preferensi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Store className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Informasi Toko</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Logo Toko</label>
              <div className="flex items-center gap-4">
                {formData.logo ? (
                  <div className="relative w-24 h-24 rounded-lg border-2 border-gray-200 overflow-hidden">
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                    <ImageIcon className="text-gray-400" size={32} />
                  </div>
                )}
                <div>
                  <input type="file" id="logo-upload" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <label htmlFor="logo-upload" className="btn btn-secondary cursor-pointer inline-flex items-center gap-2">
                    <Upload size={16} />
                    Pilih Logo
                  </label>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG maksimal 2MB</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nama Toko</label>
              <input 
                type="text" 
                value={formData?.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alamat</label>
              <textarea 
                className="input" 
                rows="2"
                value={formData?.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telepon</label>
              <input 
                type="tel"
                value={formData?.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input 
                type="email"
                value={formData?.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input" 
              />
            </div>
            <button onClick={handleSaveStoreInfo} className="btn btn-primary">Simpan Informasi</button>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="text-green-500" size={24} />
            <h3 className="text-lg font-bold">WhatsApp Customer Service</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <Info size={14} className="inline mr-1" />
                Tambahkan nomor WhatsApp CS untuk tombol kontak cepat.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Nomor WhatsApp</label>
              <input 
                type="tel" 
                placeholder="6281234567890"
                value={waFormData.number}
                onChange={(e) => setWaFormData({ ...waFormData, number: e.target.value })}
                className="input" 
              />
              <p className="text-xs text-gray-500 mt-1">Format: 628xxx (tanpa + atau 0)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pesan Default</label>
              <textarea 
                rows="3"
                placeholder="Halo, saya ingin bertanya..."
                value={waFormData.message}
                onChange={(e) => setWaFormData({ ...waFormData, message: e.target.value })}
                className="input" 
              />
            </div>
            <button onClick={handleSaveWhatsApp} className="btn btn-primary">Simpan WhatsApp</button>
          </div>
        </div>

        {/* Shopee Integration */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="text-orange-600" size={24} />
            <h3 className="text-lg font-bold">Integrasi Shopee</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <Info size={14} className="inline mr-1" />
                Masukkan kredensial dari Shopee Open Platform untuk sinkronisasi otomatis.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Partner ID</label>
              <input 
                type="text"
                placeholder="Contoh: 2014001"
                value={shopeeFormData.partnerId}
                onChange={(e) => setShopeeFormData({ ...shopeeFormData, partnerId: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Partner Key (API Key)</label>
              <input 
                type="password"
                placeholder="shpk..."
                value={shopeeFormData.partnerKey}
                onChange={(e) => setShopeeFormData({ ...shopeeFormData, partnerKey: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Shop ID</label>
              <input 
                type="text"
                placeholder="Contoh: 669903315"
                value={shopeeFormData.shopId}
                onChange={(e) => setShopeeFormData({ ...shopeeFormData, shopId: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Push Partner Key (Webhook Key)</label>
              <input 
                type="password"
                placeholder="Untuk verifikasi webhook..."
                value={shopeeFormData.pushPartnerKey}
                onChange={(e) => setShopeeFormData({ ...shopeeFormData, pushPartnerKey: e.target.value })}
                className="input" 
              />
            </div>
            <button onClick={handleSaveShopee} className="btn btn-primary">Simpan Kredensial Shopee</button>
          </div>
        </div>

        {/* Kelola Kategori */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="text-orange-500" size={24} />
            <h3 className="text-lg font-bold">Kelola Kategori</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <Info size={14} className="inline mr-1" />
                Kategori yang ditambahkan di sini akan tersedia di semua produk (Web & Android).
              </p>
            </div>
            {/* Add New Category */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Nama kategori baru..."
                className="input flex-1"
                disabled={isSaving}
              />
              <button 
                onClick={handleAddCategory} 
                disabled={isSaving || !newCategory.trim()}
                className="btn btn-primary"
              >
                <Plus size={20} />
              </button>
            </div>
            {/* Category List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {categories.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Belum ada kategori</p>
              ) : (
                categories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                    {editingCategory === cat ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editCategoryValue}
                          onChange={(e) => setEditCategoryValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEditCategory()}
                          className="input flex-1 py-1"
                          autoFocus
                          disabled={isSaving}
                        />
                        <button
                          onClick={handleSaveEditCategory}
                          disabled={isSaving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          {isSaving ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm">{cat}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditCategory(cat)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500">Total: {categories.length} kategori</p>
          </div>
        </div>

        {/* Kelola Satuan */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Ruler className="text-teal-500" size={24} />
            <h3 className="text-lg font-bold">Kelola Satuan</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
              <p className="text-sm text-teal-800">
                <Info size={14} className="inline mr-1" />
                Satuan yang ditambahkan di sini akan tersedia di semua produk (Web & Android).
              </p>
            </div>
            {/* Add New Unit */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddUnit()}
                placeholder="Nama satuan baru..."
                className="input flex-1"
                disabled={isSaving}
              />
              <button 
                onClick={handleAddUnit} 
                disabled={isSaving || !newUnit.trim()}
                className="btn btn-primary"
              >
                <Plus size={20} />
              </button>
            </div>
            {/* Unit List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {units.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Belum ada satuan</p>
              ) : (
                units.map((unit) => (
                  <div key={unit} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100">
                    {editingUnit === unit ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editUnitValue}
                          onChange={(e) => setEditUnitValue(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSaveEditUnit()}
                          className="input flex-1 py-1"
                          autoFocus
                          disabled={isSaving}
                        />
                        <button
                          onClick={handleSaveEditUnit}
                          disabled={isSaving}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        >
                          {isSaving ? <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={() => setEditingUnit(null)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-sm">{unit}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditUnit(unit)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500">Total: {units.length} satuan</p>
          </div>
        </div>

        {/* Database */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-500" size={24} />
            <h3 className="text-lg font-bold">Database</h3>
          </div>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Info size={14} className="inline mr-1" />
                Backup dan restore data aplikasi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleBackupDatabase} className="btn btn-secondary flex items-center justify-center gap-2">
                <Download size={16} />
                Backup
              </button>
              <label className="btn btn-secondary flex items-center justify-center gap-2 cursor-pointer">
                <Upload size={16} />
                Restore
                <input type="file" accept=".json" onChange={handleRestoreDatabase} className="hidden" />
              </label>
            </div>
            <button onClick={handleClearDatabase} className="btn btn-danger w-full flex items-center justify-center gap-2">
              <Trash2 size={16} />
              Hapus Semua Data
            </button>
          </div>
        </div>

        {/* User Management */}
        {isAdmin && isAdmin() && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="text-purple-500" size={24} />
                <h3 className="text-lg font-bold">Manajemen User</h3>
              </div>
              <button onClick={handleAddUser} className="btn btn-primary btn-sm flex items-center gap-1">
                <Plus size={16} />
                Tambah
              </button>
            </div>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className={`p-3 rounded-lg border ${user.isActive ? 'bg-white' : 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.username} • {user.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleChangePassword(user)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Ganti Password">
                        <Key size={16} />
                      </button>
                      <button onClick={() => handleEditUser(user)} className="p-1 text-gray-600 hover:bg-gray-100 rounded" title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleToggleUserActive(user)} className={`p-1 rounded ${user.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`} title={user.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                        {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      {user.role !== 'admin' && (
                        <button onClick={() => handleDeleteUser(user)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Hapus">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Ganti Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const newPassword = formData.get('newPassword')
              const confirmPassword = formData.get('confirmPassword')
              
              if (newPassword !== confirmPassword) {
                alert('Password tidak cocok!')
                return
              }
              
              const result = await updateUser(selectedUser.id, { password: newPassword })
              if (result && result.success) {
                alert('Password berhasil diubah!')
                setShowPasswordModal(false)
              } else {
                alert(result?.error || 'Gagal mengubah password')
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Password Baru</label>
                  <input type="password" name="newPassword" required className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Konfirmasi Password</label>
                  <input type="password" name="confirmPassword" required className="input" />
                </div>
                <button type="submit" className="btn btn-primary w-full">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About App Section */}
      <div className="card bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200">
        <div className="flex items-center gap-3 mb-4">
          <Info className="text-indigo-600" size={24} />
          <h3 className="text-lg font-bold text-indigo-900">Tentang Aplikasi</h3>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center">
                <Store className="text-white" size={32} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900">POS Pro</h4>
                <p className="text-sm text-gray-600">Point of Sale & Inventory System</p>
                <p className="text-xs text-indigo-600 font-medium mt-1">Versi 1.0.0</p>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Deskripsi:</strong> Aplikasi POS Pro adalah sistem manajemen toko lengkap yang mencakup 
              Point of Sale (Kasir), Manajemen Produk & Varian, Stok Multi-Gudang, Pembelian, Penjualan, 
              Pelanggan & Loyalty Program, dan Laporan Analytics.
            </p>
          </div>

          <div className="border-t border-indigo-200 pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="text-indigo-600" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Dikembangkan oleh</p>
                <p className="text-lg font-bold text-indigo-600">dedychen</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2 border-t border-indigo-100">
            © 2025-2026 POS Sistem. All rights reserved.
          </div>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{userModalMode === 'add' ? 'Tambah User' : 'Edit User'}</h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const userData = {
                name: formData.get('name'),
                username: formData.get('username'),
                role: formData.get('role'),
                permissions: Array.from(formData.getAll('permissions'))
              }
              
              if (userModalMode === 'add') {
                userData.password = formData.get('password')
                const result = await addUser(userData)
                if (result && result.success) {
                  alert('User berhasil ditambahkan!')
                  setShowUserModal(false)
                } else {
                  alert(result?.error || 'Gagal menambahkan user')
                }
              } else {
                const result = await updateUser(selectedUser.id, userData)
                if (result && result.success) {
                  alert('User berhasil diupdate!')
                  setShowUserModal(false)
                } else {
                  alert(result?.error || 'Gagal mengupdate user')
                }
              }
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama</label>
                  <input type="text" name="name" defaultValue={selectedUser?.name || ''} required className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username</label>
                  <input type="text" name="username" defaultValue={selectedUser?.username || ''} required className="input" />
                </div>
                {userModalMode === 'add' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input type="password" name="password" required className="input" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select name="role" defaultValue={selectedUser?.role || 'kasir'} className="input">
                    <option value="admin">Admin</option>
                    <option value="kasir">Kasir</option>
                    <option value="gudang">Gudang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PERMISSION_LABELS || {}).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input 
                          type="checkbox" 
                          name="permissions" 
                          value={key}
                          defaultChecked={selectedUser?.permissions?.includes(key)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
