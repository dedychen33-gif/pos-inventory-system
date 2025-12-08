import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, User, Store, Printer, Bell, Key, X, Upload, Image as ImageIcon, Database, Download, UploadCloud, Trash2, Info, Phone, Code, Cloud, RefreshCw, Check, AlertCircle, Plus, Edit2, UserX, UserCheck, Shield, ShoppingBag } from 'lucide-react'
import { useAuthStore, PERMISSION_LABELS } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'
import { usePurchaseStore } from '../store/purchaseStore'
import { useCartStore } from '../store/cartStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { getSyncStatus, syncLocalToSupabase } from '../services/supabaseSync'

export default function Settings() {
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showUserModal, setShowUserModal] = useState(false)
  const [userModalMode, setUserModalMode] = useState('add') // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null)
  const { users, user: currentUser, addUser, updateUser, deleteUser, toggleUserActive, isAdmin } = useAuthStore()
  const { storeInfo, updateStoreInfo, setLogo } = useSettingsStore()
  const { products } = useProductStore()
  const { customers } = useCustomerStore()
  const { transactions } = useTransactionStore()
  const { purchases, suppliers } = usePurchaseStore()
  const { cartItems } = useCartStore()
  const [formData, setFormData] = useState(storeInfo)

  const handleBackupDatabase = () => {
    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        products: products,
        customers: customers,
        transactions: transactions,
        purchases: purchases,
        suppliers: suppliers,
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
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target.result)
        
        // Validate backup format
        if (!backupData.version || !backupData.data) {
          throw new Error('Format backup tidak valid')
        }

        // Restore to localStorage
        localStorage.setItem('product-storage', JSON.stringify({ state: { products: backupData.data.products, categories: backupData.data.products?.[0]?.category ? [...new Set(backupData.data.products.map(p => p.category))] : [] } }))
        localStorage.setItem('customer-storage', JSON.stringify({ state: { customers: backupData.data.customers } }))
        localStorage.setItem('transaction-storage', JSON.stringify({ state: { transactions: backupData.data.transactions } }))
        localStorage.setItem('purchase-storage', JSON.stringify({ state: { purchases: backupData.data.purchases, suppliers: backupData.data.suppliers } }))
        localStorage.setItem('settings-storage', JSON.stringify({ state: { storeInfo: backupData.data.settings } }))
        localStorage.setItem('auth-storage', JSON.stringify({ state: { users: backupData.data.users, isAuthenticated: true } }))
        
        alert('Restore database berhasil! Halaman akan di-refresh.')
        window.location.reload()
      } catch (error) {
        alert('Error restore database: ' + error.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearDatabase = () => {
    if (!confirm('⚠️ PERINGATAN!\n\nIni akan menghapus SEMUA data:\n- Produk\n- Customer\n- Transaksi\n- Pembelian\n- Supplier\n- Settings\n- Cache Shopee\n\nData TIDAK BISA dikembalikan!\nLanjutkan?')) {
      return
    }

    if (!confirm('Konfirmasi sekali lagi: Anda yakin ingin menghapus SEMUA database?')) {
      return
    }

    // Clear all Zustand stores first (in-memory state)
    useProductStore.setState({ products: [], categories: ['Makanan', 'Minuman', 'Snack', 'Sembako', 'Elektronik', 'Alat Tulis'] })
    useCustomerStore.setState({ customers: [{ id: 1, name: 'Walk-in Customer', phone: '-', email: '-', address: '-', type: 'walk-in', points: 0, totalSpent: 0, customPrices: {} }] })
    useTransactionStore.setState({ transactions: [] })
    usePurchaseStore.setState({ purchases: [], suppliers: [] })
    useCartStore.setState({ items: [], discount: 0, discountType: 'percent', paymentMethod: 'cash', customerId: null })

    // Clear all localStorage
    localStorage.removeItem('product-storage')
    localStorage.removeItem('customer-storage')
    localStorage.removeItem('transaction-storage')
    localStorage.removeItem('purchase-storage')
    localStorage.removeItem('settings-storage')
    localStorage.removeItem('cart-storage')
    
    // Clear Shopee cache data
    localStorage.removeItem('shopee_products_cache')
    localStorage.removeItem('shopee_orders_cache')
    localStorage.removeItem('shopee_returns_cache')
    localStorage.removeItem('shopee_last_sync')
    
    alert('Semua database berhasil dihapus! Halaman akan di-refresh.')
    // Force hard reload to clear any cached state
    window.location.reload(true)
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogo(reader.result)
        setFormData({ ...formData, logo: reader.result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveStoreInfo = () => {
    updateStoreInfo(formData)
    alert('Informasi toko berhasil disimpan!')
  }

  const handleChangePassword = (user) => {
    setSelectedUser(user)
    setShowPasswordModal(true)
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
    if (!confirm(`Hapus user "${user.name}"?\n\nData user akan dihapus permanen.`)) return
    
    const result = deleteUser(user.id)
    if (!result.success) {
      alert(result.error)
    }
  }

  const handleToggleUserActive = (user) => {
    const action = user.isActive ? 'nonaktifkan' : 'aktifkan'
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.name}"?`)) return
    
    const result = toggleUserActive(user.id)
    if (!result.success) {
      alert(result.error)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-600 mt-1">Konfigurasi sistem dan preferensi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Store className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Informasi Toko</h3>
          </div>
          <div className="space-y-4">
            {/* Logo Upload */}
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
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alamat</label>
              <textarea 
                className="input" 
                rows="2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Telepon</label>
              <input 
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input" 
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
            <button onClick={handleSaveStoreInfo} className="btn btn-primary">Simpan Informasi</button>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Pengaturan Pajak</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Aktifkan Pajak PPN</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Persentase PPN (%)</label>
              <input type="number" defaultValue="11" className="input" />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" />
                <span>Tampilkan harga sudah termasuk pajak</span>
              </label>
            </div>
            <button className="btn btn-primary">Simpan</button>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Printer className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Pengaturan Printer</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nama Printer</label>
              <select className="input">
                <option>Thermal Printer (Default)</option>
                <option>HP LaserJet</option>
                <option>Canon Pixma</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Ukuran Kertas</label>
              <select className="input">
                <option>58mm (Thermal)</option>
                <option>80mm (Thermal)</option>
                <option>A4</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span>Cetak otomatis setelah transaksi</span>
              </label>
            </div>
            <button className="btn btn-secondary">Test Print</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Notifikasi</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span>Alert stok menipis</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span>Alert produk mendekati expired</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Notifikasi email harian</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4" />
              <span>Notifikasi WhatsApp</span>
            </label>
            <button className="btn btn-primary mt-4">Simpan</button>
          </div>
        </div>

        {/* User Management */}
        <div className="card md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <User className="text-primary" size={24} />
              <h3 className="text-lg font-bold">Manajemen Pengguna</h3>
            </div>
            {isAdmin() && (
              <button
                onClick={handleAddUser}
                className="btn btn-primary btn-sm inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Tambah User
              </button>
            )}
          </div>
          
          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{users.length}</p>
              <p className="text-xs text-blue-600">Total User</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{users.filter(u => u.isActive !== false).length}</p>
              <p className="text-xs text-green-600">User Aktif</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{users.filter(u => u.role === 'admin').length}</p>
              <p className="text-xs text-purple-600">Admin</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-700">{users.filter(u => u.marketplaceCredentials?.shopee?.isConnected).length}</p>
              <p className="text-xs text-orange-600">Terhubung Shopee</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marketplace</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className={user.isActive === false ? 'bg-gray-50 opacity-60' : ''}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          user.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                        {currentUser?.id === user.id && (
                          <span className="badge badge-info text-xs">Anda</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-info'}`}>
                        {user.role === 'admin' ? 'Admin' : 'Kasir'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {user.permissions.includes('all') ? (
                          <span className="badge badge-success text-xs">Semua Akses</span>
                        ) : (
                          user.permissions.slice(0, 3).map(perm => (
                            <span key={perm} className="badge badge-secondary text-xs">
                              {PERMISSION_LABELS[perm] || perm}
                            </span>
                          ))
                        )}
                        {!user.permissions.includes('all') && user.permissions.length > 3 && (
                          <span className="badge badge-secondary text-xs">+{user.permissions.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {user.marketplaceCredentials?.shopee?.isConnected ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="text-sm text-green-700">Shopee</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`badge ${user.isActive !== false ? 'badge-success' : 'badge-danger'}`}>
                        {user.isActive !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleChangePassword(user)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ganti Password"
                        >
                          <Key size={16} className="text-gray-600" />
                        </button>
                        {isAdmin() && (
                          <>
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit User"
                            >
                              <Edit2 size={16} className="text-blue-600" />
                            </button>
                            {user.id !== 1 && user.id !== currentUser?.id && (
                              <>
                                <button
                                  onClick={() => handleToggleUserActive(user)}
                                  className="p-2 hover:bg-yellow-50 rounded-lg transition-colors"
                                  title={user.isActive !== false ? 'Nonaktifkan' : 'Aktifkan'}
                                >
                                  {user.isActive !== false ? (
                                    <UserX size={16} className="text-yellow-600" />
                                  ) : (
                                    <UserCheck size={16} className="text-green-600" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Hapus User"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Backup & Restore Database */}
        <div className="card md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Backup & Restore Database</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-blue-100 p-4 rounded-full">
                  <Download className="text-primary" size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Backup Database</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Download semua data sistem (produk, customer, transaksi, dll) dalam format JSON
                  </p>
                  <button 
                    onClick={handleBackupDatabase}
                    className="btn btn-primary inline-flex items-center gap-2"
                  >
                    <Download size={20} />
                    Download Backup
                  </button>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-warning transition-colors">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-orange-100 p-4 rounded-full">
                  <UploadCloud className="text-warning" size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Restore Database</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload file backup untuk mengembalikan data sistem
                  </p>
                  <input
                    type="file"
                    id="restore-upload"
                    accept=".json"
                    onChange={handleRestoreDatabase}
                    className="hidden"
                  />
                  <label 
                    htmlFor="restore-upload"
                    className="btn btn-warning inline-flex items-center gap-2 cursor-pointer"
                  >
                    <UploadCloud size={20} />
                    Upload Backup
                  </label>
                </div>
              </div>
            </div>

            <div className="border-2 border-dashed border-red-300 rounded-lg p-6 text-center hover:border-red-500 transition-colors md:col-span-2">
              <div className="flex flex-col items-center gap-4">
                <div className="bg-red-100 p-4 rounded-full">
                  <Trash2 className="text-danger" size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2 text-red-700">Hapus Seluruh Database</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Menghapus SEMUA data sistem. Data tidak bisa dikembalikan!
                  </p>
                  <button 
                    onClick={handleClearDatabase}
                    className="btn btn-danger inline-flex items-center gap-2"
                  >
                    <Trash2 size={20} />
                    Hapus Semua Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="text-yellow-600 font-bold">⚠️</div>
              <div>
                <h5 className="font-bold text-yellow-800 mb-1">Peringatan</h5>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Backup database secara rutin untuk keamanan data</li>
                  <li>• Restore akan mengganti semua data yang ada saat ini</li>
                  <li>• Pastikan file backup valid sebelum melakukan restore</li>
                  <li>• <strong>Hapus Database akan menghapus SEMUA data tanpa bisa dikembalikan!</strong></li>
                  <li>• Sistem akan refresh otomatis setelah restore/clear berhasil</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* About App */}
        <CloudSyncSection 
          products={products}
          customers={customers}
          transactions={transactions}
        />

        {/* About App */}
        <div className="card md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-primary" size={24} />
            <h3 className="text-lg font-bold">Tentang Aplikasi</h3>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* App Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                    <Store className="text-white" size={32} />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">POS & Inventory System</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                      <Code size={14} />
                      Versi 1.0.0
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Aplikasi Point of Sale dan Manajemen Inventori lengkap dengan fitur kasir, manajemen produk, 
                  pelacakan stok, laporan penjualan, dan sinkronisasi real-time. Dirancang untuk memudahkan 
                  pengelolaan bisnis retail Anda.
                </p>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Manajemen Produk & Kategori
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Transaksi Penjualan (Kasir)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Pelacakan Stok Real-time
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Laporan Penjualan & Analitik
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Sinkronisasi Cloud (Supabase)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Scan Barcode (Android)
                  </div>
                </div>
              </div>

              {/* Developer Info */}
              <div className="md:w-72 bg-white rounded-xl p-5 shadow-sm">
                <h5 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  Pengembang
                </h5>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nama</p>
                    <p className="font-semibold text-gray-900">DedyChen</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp</p>
                    <a 
                      href="https://wa.me/6281213821828" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-green-600 font-semibold hover:text-green-700 transition-colors"
                    >
                      <Phone size={16} />
                      0812-1382-1828
                    </a>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <a 
                      href="https://wa.me/6281213821828?text=Halo%20DedyChen,%20saya%20ingin%20bertanya%20tentang%20aplikasi%20POS" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full btn bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Hubungi via WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
              <p>© 2024 POS & Inventory System. Dikembangkan dengan ❤️ oleh DedyChen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <ChangePasswordModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false)
            setSelectedUser(null)
          }}
        />
      )}

      {/* User Modal (Add/Edit) */}
      {showUserModal && (
        <UserModal
          mode={userModalMode}
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false)
            setSelectedUser(null)
          }}
        />
      )}
    </div>
  )
}

function ChangePasswordModal({ user, onClose }) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { changePassword } = useAuthStore()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (formData.newPassword.length < 4) {
      setError('Password minimal 4 karakter')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password tidak cocok')
      return
    }

    changePassword(user.username, formData.newPassword)
    setSuccess(true)
    
    setTimeout(() => {
      onClose()
    }, 1500)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Key className="text-primary" size={24} />
            <div>
              <h3 className="text-xl font-bold">Ganti Password</h3>
              <p className="text-sm text-gray-600">User: {user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-bold text-green-600 mb-2">Password Berhasil Diubah!</h4>
            <p className="text-gray-600">Password untuk {user.name} telah diperbarui</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Password Baru *</label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="input"
                placeholder="Masukkan password baru"
                required
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Minimal 4 karakter</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Konfirmasi Password *</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="input"
                placeholder="Ketik ulang password baru"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 btn btn-primary">
                Ubah Password
              </button>
              <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// User Modal Component (Add/Edit)
function UserModal({ mode, user, onClose }) {
  const { addUser, updateUser } = useAuthStore()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const allPermissions = [
    'pos', 'products', 'products_view', 'stock', 'customers', 
    'customers_view', 'sales', 'purchases', 'reports', 'marketplace', 'settings'
  ]
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    password: '',
    confirmPassword: '',
    name: user?.name || '',
    role: user?.role || 'cashier',
    permissions: user?.permissions || ['pos', 'products_view'],
    isActive: user?.isActive !== false
  })

  const handlePermissionToggle = (perm) => {
    if (perm === 'all') {
      setFormData({ ...formData, permissions: formData.permissions.includes('all') ? [] : ['all'] })
    } else {
      const newPerms = formData.permissions.filter(p => p !== 'all')
      if (newPerms.includes(perm)) {
        setFormData({ ...formData, permissions: newPerms.filter(p => p !== perm) })
      } else {
        setFormData({ ...formData, permissions: [...newPerms, perm] })
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.username.trim()) {
      setError('Username harus diisi')
      return
    }
    
    if (!formData.name.trim()) {
      setError('Nama harus diisi')
      return
    }

    if (mode === 'add') {
      if (!formData.password) {
        setError('Password harus diisi')
        return
      }
      if (formData.password.length < 4) {
        setError('Password minimal 4 karakter')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Konfirmasi password tidak cocok')
        return
      }
    }

    if (formData.permissions.length === 0) {
      setError('Pilih minimal 1 permission')
      return
    }

    if (mode === 'add') {
      const result = addUser({
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        name: formData.name.trim(),
        role: formData.role,
        permissions: formData.permissions
      })
      
      if (!result.success) {
        setError(result.error)
        return
      }
    } else {
      const updates = {
        username: formData.username.trim().toLowerCase(),
        name: formData.name.trim(),
        role: formData.role,
        permissions: formData.permissions,
        isActive: formData.isActive
      }
      
      // Only update password if provided
      if (formData.password) {
        if (formData.password.length < 4) {
          setError('Password minimal 4 karakter')
          return
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Konfirmasi password tidak cocok')
          return
        }
        updates.password = formData.password
      }
      
      const result = updateUser(user.id, updates)
      if (!result.success) {
        setError(result.error)
        return
      }
    }

    setSuccess(true)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${mode === 'add' ? 'bg-green-100' : 'bg-blue-100'}`}>
              {mode === 'add' ? (
                <Plus className="text-green-600" size={24} />
              ) : (
                <Edit2 className="text-blue-600" size={24} />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold">{mode === 'add' ? 'Tambah User Baru' : 'Edit User'}</h3>
              {mode === 'edit' && <p className="text-sm text-gray-600">@{user.username}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="text-green-600" size={32} />
            </div>
            <h4 className="text-lg font-bold text-green-600 mb-2">
              {mode === 'add' ? 'User Berhasil Ditambahkan!' : 'User Berhasil Diperbarui!'}
            </h4>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input"
                  placeholder="username"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nama Lengkap *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Nama Lengkap"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password {mode === 'add' ? '*' : '(kosongkan jika tidak diubah)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required={mode === 'add'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Konfirmasi Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required={mode === 'add'}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Role *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="cashier"
                    checked={formData.role === 'cashier'}
                    onChange={() => setFormData({ ...formData, role: 'cashier' })}
                    className="w-4 h-4"
                  />
                  <span className="badge badge-info">Kasir</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={formData.role === 'admin'}
                    onChange={() => setFormData({ ...formData, role: 'admin', permissions: ['all'] })}
                    className="w-4 h-4"
                  />
                  <span className="badge badge-danger">Admin</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Shield size={16} className="inline mr-1" />
                Permissions *
              </label>
              <div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                {/* All Access Option */}
                <label className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes('all')}
                    onChange={() => handlePermissionToggle('all')}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-green-700">🔓 Semua Akses (Admin)</span>
                </label>
                
                <hr />
                
                {/* Individual Permissions */}
                <div className="grid grid-cols-2 gap-2">
                  {allPermissions.map(perm => (
                    <label 
                      key={perm} 
                      className={`flex items-center gap-2 cursor-pointer p-2 rounded transition-colors ${
                        formData.permissions.includes('all') 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes('all') || formData.permissions.includes(perm)}
                        onChange={() => !formData.permissions.includes('all') && handlePermissionToggle(perm)}
                        disabled={formData.permissions.includes('all')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{PERMISSION_LABELS[perm] || perm}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.permissions.includes('all') 
                  ? 'User memiliki akses ke semua fitur' 
                  : `${formData.permissions.length} permission dipilih`}
              </p>
            </div>

            {mode === 'edit' && user?.id !== 1 && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>User Aktif</span>
                </label>
                <p className="text-xs text-gray-500 ml-6">User nonaktif tidak bisa login</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 btn btn-primary">
                {mode === 'add' ? 'Tambah User' : 'Simpan Perubahan'}
              </button>
              <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Cloud Sync Section Component
function CloudSyncSection({ products, customers, transactions }) {
  const [syncStatus, setSyncStatus] = useState({ isConfigured: false, isOnline: false, message: 'Memeriksa...' })
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const status = await getSyncStatus()
    setSyncStatus(status)
  }

  const handleSyncToCloud = async () => {
    if (!confirm('Upload semua data lokal ke Supabase?\n\nData di cloud akan di-update/ditambahkan.')) return

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const result = await syncLocalToSupabase(products, customers, transactions)
      setSyncResult(result.data)
    } catch (error) {
      setSyncResult({ errors: [error.message] })
    }

    setIsSyncing(false)
    await checkStatus()
  }

  return (
    <div className="card md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Cloud className="text-primary" size={24} />
          <h3 className="text-lg font-bold">Sinkronisasi Cloud (Supabase)</h3>
        </div>
        <button onClick={checkStatus} className="btn btn-secondary btn-sm flex items-center gap-2">
          <RefreshCw size={16} />
          Refresh Status
        </button>
      </div>

      {/* Status */}
      <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
        syncStatus.isOnline 
          ? 'bg-green-50 border border-green-200' 
          : syncStatus.isConfigured 
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-gray-50 border border-gray-200'
      }`}>
        {syncStatus.isOnline ? (
          <Check className="text-green-600" size={24} />
        ) : (
          <AlertCircle className={syncStatus.isConfigured ? 'text-yellow-600' : 'text-gray-400'} size={24} />
        )}
        <div>
          <p className={`font-semibold ${
            syncStatus.isOnline ? 'text-green-700' : syncStatus.isConfigured ? 'text-yellow-700' : 'text-gray-600'
          }`}>
            {syncStatus.isOnline ? '✓ Terhubung ke Supabase' : syncStatus.message}
          </p>
          {syncStatus.productCount !== undefined && (
            <p className="text-sm text-gray-600">{syncStatus.productCount} produk di cloud</p>
          )}
        </div>
      </div>

      {/* Local Data Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">{products.length}</p>
          <p className="text-sm text-blue-600">Produk Lokal</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-700">{customers.length}</p>
          <p className="text-sm text-purple-600">Customer Lokal</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">{transactions.length}</p>
          <p className="text-sm text-green-600">Transaksi Lokal</p>
        </div>
      </div>

      {/* Sync Button */}
      <button
        onClick={handleSyncToCloud}
        disabled={!syncStatus.isOnline || isSyncing}
        className={`btn w-full flex items-center justify-center gap-2 ${
          syncStatus.isOnline ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
        }`}
      >
        {isSyncing ? (
          <>
            <RefreshCw size={20} className="animate-spin" />
            Menyinkronkan...
          </>
        ) : (
          <>
            <UploadCloud size={20} />
            Upload Data Lokal ke Cloud
          </>
        )}
      </button>

      {/* Sync Result */}
      {syncResult && (
        <div className={`mt-4 p-4 rounded-lg ${
          syncResult.errors?.length ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          {syncResult.errors?.length > 0 ? (
            <div>
              <p className="font-semibold text-red-700 mb-2">Beberapa error terjadi:</p>
              <ul className="text-sm text-red-600 list-disc list-inside">
                {syncResult.errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {syncResult.errors.length > 5 && (
                  <li>...dan {syncResult.errors.length - 5} error lainnya</li>
                )}
              </ul>
            </div>
          ) : (
            <div className="text-green-700">
              <p className="font-semibold mb-1">✓ Sinkronisasi berhasil!</p>
              <p className="text-sm">
                {syncResult.products} produk, {syncResult.customers} customer, {syncResult.transactions} transaksi ter-sync
              </p>
            </div>
          )}
        </div>
      )}

      {!isSupabaseConfigured() && (
        <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Belum terkonfigurasi:</strong> Tambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env
          </p>
        </div>
      )}
    </div>
  )
}
