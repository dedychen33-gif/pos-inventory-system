import { useState } from 'react'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Receipt
} from 'lucide-react'
import { useExpenseStore } from '../store/expenseStore'
import { useAuthStore } from '../store/authStore'

const EXPENSE_CATEGORIES = [
  { id: 'operational', label: 'Operasional', color: 'bg-blue-100 text-blue-800' },
  { id: 'salary', label: 'Gaji Karyawan', color: 'bg-green-100 text-green-800' },
  { id: 'rent', label: 'Sewa', color: 'bg-purple-100 text-purple-800' },
  { id: 'utilities', label: 'Listrik/Air/Internet', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'supplies', label: 'Perlengkapan', color: 'bg-orange-100 text-orange-800' },
  { id: 'maintenance', label: 'Perawatan', color: 'bg-red-100 text-red-800' },
  { id: 'transport', label: 'Transportasi', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'marketing', label: 'Marketing', color: 'bg-pink-100 text-pink-800' },
  { id: 'other', label: 'Lainnya', color: 'bg-gray-100 text-gray-800' },
]

export default function Expenses() {
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [amountDisplay, setAmountDisplay] = useState('')
  
  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenseStore()
  const { user } = useAuthStore()

  // Filter expenses
  const filteredExpenses = (expenses || []).filter(expense => {
    const matchSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       expense.note?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = filterCategory === 'all' || expense.category === filterCategory
    
    let matchDate = true
    if (filterDateFrom) {
      matchDate = matchDate && new Date(expense.date) >= new Date(filterDateFrom)
    }
    if (filterDateTo) {
      matchDate = matchDate && new Date(expense.date) <= new Date(filterDateTo)
    }
    
    return matchSearch && matchCategory && matchDate
  }).sort((a, b) => new Date(b.date) - new Date(a.date))

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // Format number to IDR display
  const formatToIDR = (value) => {
    const num = value.replace(/\D/g, '')
    return num ? parseInt(num).toLocaleString('id-ID') : ''
  }

  // Parse IDR display back to number
  const parseFromIDR = (value) => {
    return parseInt(value.replace(/\D/g, '')) || 0
  }

  const handleAmountChange = (e) => {
    const formatted = formatToIDR(e.target.value)
    setAmountDisplay(formatted)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const expenseData = {
      description: formData.get('description'),
      amount: parseFromIDR(amountDisplay),
      category: formData.get('category'),
      date: formData.get('date'),
      note: formData.get('note'),
      createdBy: user?.name || 'Unknown'
    }

    if (editingExpense) {
      await updateExpense(editingExpense.id, expenseData)
    } else {
      await addExpense(expenseData)
    }

    setShowModal(false)
    setEditingExpense(null)
    setAmountDisplay('')
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setAmountDisplay(expense.amount ? expense.amount.toLocaleString('id-ID') : '')
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus pengeluaran ini?')) {
      await deleteExpense(id)
    }
  }

  const getCategoryInfo = (categoryId) => {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  }

  const exportToCSV = () => {
    const headers = ['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', 'Catatan', 'Dibuat Oleh']
    const rows = filteredExpenses.map(e => [
      new Date(e.date).toLocaleDateString('id-ID'),
      e.description,
      getCategoryInfo(e.category).label,
      e.amount,
      e.note || '',
      e.createdBy || ''
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pengeluaran-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengeluaran</h1>
          <p className="text-gray-600">Kelola pengeluaran toko</p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null)
            setAmountDisplay('')
            setShowModal(true)
          }}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Tambah Pengeluaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Pengeluaran</p>
              <p className="text-2xl font-bold">Rp {totalExpenses.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Receipt size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Jumlah Transaksi</p>
              <p className="text-2xl font-bold">{filteredExpenses.length}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Rata-rata/Transaksi</p>
              <p className="text-2xl font-bold">
                Rp {filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString('id-ID') : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari pengeluaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">Semua Kategori</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="input w-full md:w-40"
            placeholder="Dari tanggal"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="input w-full md:w-40"
            placeholder="Sampai tanggal"
          />
          <button onClick={exportToCSV} className="btn btn-outline">
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Belum ada data pengeluaran</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const category = getCategoryInfo(expense.category)
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(expense.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{expense.description}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${category.color}`}>
                          {category.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-red-600">
                        Rp {(expense.amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {expense.note || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">
                {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
              </h3>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingExpense(null)
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi *</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingExpense?.description}
                  required
                  className="input"
                  placeholder="Contoh: Bayar listrik bulan Desember"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jumlah *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={amountDisplay}
                    onChange={handleAmountChange}
                    required
                    className="input pl-10 text-right"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Kategori *</label>
                <select
                  name="category"
                  defaultValue={editingExpense?.category || 'operational'}
                  required
                  className="input"
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal *</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={editingExpense?.date?.split('T')[0] || new Date().toISOString().split('T')[0]}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea
                  name="note"
                  defaultValue={editingExpense?.note}
                  className="input"
                  rows="3"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn btn-primary">
                  {editingExpense ? 'Simpan Perubahan' : 'Tambah Pengeluaran'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingExpense(null)
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
