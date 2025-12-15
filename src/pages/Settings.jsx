import { useState } from 'react'
import { Store, Upload, Image as ImageIcon, Database, Download, Trash2, Info, MessageCircle, User, Plus, Edit2, UserX, UserCheck, Shield, Key, X } from 'lucide-react'
import { useAuthStore, PERMISSION_LABELS } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useCartStore } from '../store/cartStore'
import { useSalesOrderStore } from '../store/salesOrderStore'

export default function Settings() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalMode, setUserModalMode] = useState('add')
  const [selectedUser, setSelectedUser] = useState(null)
  
  const { users = [], user: currentUser, addUser, updateUser, deleteUser, toggleUserActive, isAdmin } = useAuthStore() || {}
  const { storeInfo = {}, updateStoreInfo, whatsappNumber, whatsappMessage, updateWhatsApp } = useSettingsStore() || {}
  const { products = [] } = useProductStore() || {}
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
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const newPassword = formData.get('newPassword')
              const confirmPassword = formData.get('confirmPassword')
              
              if (newPassword !== confirmPassword) {
                alert('Password tidak cocok!')
                return
              }
              
              const result = updateUser(selectedUser.id, { password: newPassword })
              if (result.success) {
                alert('Password berhasil diubah!')
                setShowPasswordModal(false)
              } else {
                alert(result.error)
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
            <form onSubmit={(e) => {
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
                const result = addUser(userData)
                if (result.success) {
                  alert('User berhasil ditambahkan!')
                  setShowUserModal(false)
                } else {
                  alert(result.error)
                }
              } else {
                const result = updateUser(selectedUser.id, userData)
                if (result.success) {
                  alert('User berhasil diupdate!')
                  setShowUserModal(false)
                } else {
                  alert(result.error)
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
