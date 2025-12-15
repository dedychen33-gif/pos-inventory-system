import { useState } from 'react'
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  DollarSign,
  Calendar,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard
} from 'lucide-react'
import { useDebtStore } from '../store/debtStore'
import { useCustomerStore } from '../store/customerStore'
import { useAuthStore } from '../store/authStore'

export default function Debts() {
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('receivable') // receivable or payable
  const [amountDisplay, setAmountDisplay] = useState('')
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('')
  
  const { debts, addDebt, updateDebt, deleteDebt, addPayment, getTotalPayables, getTotalReceivables } = useDebtStore()
  const { customers } = useCustomerStore()
  const { user } = useAuthStore()

  // Filter debts
  const filteredDebts = (debts || []).filter(debt => {
    const matchSearch = debt.personName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       debt.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = activeTab === 'all' || debt.type === activeTab
    const matchStatus = filterStatus === 'all' || debt.status === filterStatus
    
    return matchSearch && matchType && matchStatus
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  // Calculate totals
  const totalPayables = getTotalPayables()
  const totalReceivables = getTotalReceivables()

  // Format number to IDR display
  const formatToIDR = (value) => {
    const num = String(value).replace(/\D/g, '')
    return num ? parseInt(num).toLocaleString('id-ID') : ''
  }

  // Parse IDR display back to number
  const parseFromIDR = (value) => {
    return parseInt(String(value).replace(/\D/g, '')) || 0
  }

  const handleAmountChange = (e) => {
    setAmountDisplay(formatToIDR(e.target.value))
  }

  const handlePaymentAmountChange = (e) => {
    setPaymentAmountDisplay(formatToIDR(e.target.value))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const debtData = {
      type: formData.get('type'),
      personName: formData.get('personName'),
      personPhone: formData.get('personPhone'),
      description: formData.get('description'),
      amount: parseFromIDR(amountDisplay),
      dueDate: formData.get('dueDate'),
      note: formData.get('note'),
      createdBy: user?.name || 'Unknown'
    }

    if (editingDebt) {
      await updateDebt(editingDebt.id, debtData)
    } else {
      await addDebt(debtData)
    }

    setShowModal(false)
    setEditingDebt(null)
    setAmountDisplay('')
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const paymentData = {
      amount: parseFromIDR(paymentAmountDisplay),
      date: formData.get('date'),
      note: formData.get('note')
    }

    await addPayment(selectedDebt.id, paymentData)
    setShowPaymentModal(false)
    setSelectedDebt(null)
    setPaymentAmountDisplay('')
  }

  const handleEdit = (debt) => {
    setEditingDebt(debt)
    setAmountDisplay(debt.amount ? debt.amount.toLocaleString('id-ID') : '')
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (confirm('Hapus data hutang/piutang ini?')) {
      await deleteDebt(id)
    }
  }

  const handleAddPayment = (debt) => {
    setSelectedDebt(debt)
    setShowPaymentModal(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle size={12} /> Lunas</span>
      case 'partial':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock size={12} /> Sebagian</span>
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle size={12} /> Belum Bayar</span>
    }
  }

  const isOverdue = (dueDate) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date() 
  }

  const exportToCSV = () => {
    const headers = ['Tipe', 'Nama', 'Telepon', 'Deskripsi', 'Jumlah', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status']
    const rows = filteredDebts.map(d => [
      d.type === 'receivable' ? 'Piutang' : 'Hutang',
      d.personName,
      d.personPhone || '',
      d.description,
      d.amount,
      d.paidAmount || 0,
      (d.amount || 0) - (d.paidAmount || 0),
      d.dueDate ? new Date(d.dueDate).toLocaleDateString('id-ID') : '',
      d.status === 'paid' ? 'Lunas' : d.status === 'partial' ? 'Sebagian' : 'Belum Bayar'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hutang-piutang-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hutang & Piutang</h1>
          <p className="text-gray-600">Kelola hutang ke supplier dan piutang dari pelanggan</p>
        </div>
        <button
          onClick={() => {
            setEditingDebt(null)
            setAmountDisplay('')
            setShowModal(true)
          }}
          className="btn btn-primary"
        >
          <Plus size={20} />
          Tambah Baru
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <ArrowDownCircle size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Piutang (Akan Diterima)</p>
              <p className="text-2xl font-bold">Rp {totalReceivables.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <ArrowUpCircle size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Total Hutang (Harus Dibayar)</p>
              <p className="text-2xl font-bold">Rp {totalPayables.toLocaleString('id-ID')}</p>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Selisih (Piutang - Hutang)</p>
              <p className={`text-2xl font-bold ${totalReceivables - totalPayables >= 0 ? '' : 'text-yellow-200'}`}>
                Rp {(totalReceivables - totalPayables).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('receivable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'receivable' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowDownCircle size={18} className="inline mr-2" />
          Piutang (Akan Diterima)
        </button>
        <button
          onClick={() => setActiveTab('payable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'payable' 
              ? 'bg-red-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowUpCircle size={18} className="inline mr-2" />
          Hutang (Harus Dibayar)
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama atau deskripsi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Bayar</option>
            <option value="partial">Sebagian</option>
            <option value="paid">Lunas</option>
          </select>
          <button onClick={exportToCSV} className="btn btn-outline">
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      {/* Debts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dibayar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <CreditCard size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Belum ada data {activeTab === 'receivable' ? 'piutang' : 'hutang'}</p>
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => {
                  const remaining = (debt.amount || 0) - (debt.paidAmount || 0)
                  const overdue = isOverdue(debt.dueDate) && debt.status !== 'paid'
                  
                  return (
                    <tr key={debt.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-medium">{debt.personName}</span>
                          {debt.personPhone && (
                            <p className="text-sm text-gray-500">{debt.personPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {debt.description}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        Rp {(debt.amount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4 text-right text-green-600">
                        Rp {(debt.paidAmount || 0).toLocaleString('id-ID')}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Rp {remaining.toLocaleString('id-ID')}
                      </td>
                      <td className="px-6 py-4">
                        {debt.dueDate ? (
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(debt.dueDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                            {overdue && <span className="block text-xs">Jatuh tempo!</span>}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(debt.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {debt.status !== 'paid' && (
                            <button
                              onClick={() => handleAddPayment(debt)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                              title="Tambah Pembayaran"
                            >
                              <DollarSign size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(debt)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(debt.id)}
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

      {/* Add/Edit Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">
                {editingDebt ? 'Edit Data' : 'Tambah Hutang/Piutang'}
              </h3>
              <button 
                onClick={() => {
                  setShowModal(false)
                  setEditingDebt(null)
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div>
                <label className="block text-sm font-medium mb-1">Tipe *</label>
                <select
                  name="type"
                  defaultValue={editingDebt?.type || activeTab}
                  required
                  className="input"
                >
                  <option value="receivable">Piutang (Akan Diterima dari Customer)</option>
                  <option value="payable">Hutang (Harus Dibayar ke Supplier)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nama {activeTab === 'receivable' ? 'Customer' : 'Supplier'} *</label>
                <input
                  type="text"
                  name="personName"
                  defaultValue={editingDebt?.personName}
                  required
                  className="input"
                  placeholder="Nama orang/perusahaan"
                  list="customer-list"
                />
                <datalist id="customer-list">
                  {customers.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">No. Telepon</label>
                <input
                  type="text"
                  name="personPhone"
                  defaultValue={editingDebt?.personPhone}
                  className="input"
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi *</label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingDebt?.description}
                  required
                  className="input"
                  placeholder="Contoh: Pembelian barang tanggal 15 Des"
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
                <label className="block text-sm font-medium mb-1">Jatuh Tempo</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={editingDebt?.dueDate?.split('T')[0]}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea
                  name="note"
                  defaultValue={editingDebt?.note}
                  className="input"
                  rows="2"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn btn-primary">
                  {editingDebt ? 'Simpan Perubahan' : 'Tambah'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false)
                    setEditingDebt(null)
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

      {/* Add Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">Tambah Pembayaran</h3>
              <button 
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedDebt(null)
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-gray-50 border-b">
              <p className="font-medium">{selectedDebt.personName}</p>
              <p className="text-sm text-gray-600">{selectedDebt.description}</p>
              <div className="mt-2 flex justify-between text-sm">
                <span>Total: <strong>Rp {(selectedDebt.amount || 0).toLocaleString('id-ID')}</strong></span>
                <span>Sisa: <strong className="text-red-600">Rp {((selectedDebt.amount || 0) - (selectedDebt.paidAmount || 0)).toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jumlah Bayar *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="text"
                    value={paymentAmountDisplay}
                    onChange={handlePaymentAmountChange}
                    required
                    className="input pl-10 text-right"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal Bayar *</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <input
                  type="text"
                  name="note"
                  className="input"
                  placeholder="Contoh: Transfer BCA"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 btn btn-success">
                  Simpan Pembayaran
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedDebt(null)
                  }}
                  className="flex-1 btn btn-secondary"
                >
                  Batal
                </button>
              </div>
            </form>

            {/* Payment History */}
            {selectedDebt.payments && selectedDebt.payments.length > 0 && (
              <div className="p-4 border-t">
                <h4 className="font-medium mb-2">Riwayat Pembayaran</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedDebt.payments.map((payment, index) => (
                    <div key={payment.id || index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{new Date(payment.date).toLocaleDateString('id-ID')}</span>
                      <span className="text-green-600 font-medium">Rp {(payment.amount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
