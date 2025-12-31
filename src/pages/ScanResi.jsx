import { useState, useEffect } from 'react'
import { 
  ScanLine, 
  Truck, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  RefreshCw,
  FileText,
  Search,
  Filter
} from 'lucide-react'
import { firebaseDB } from '../lib/firebase'

export default function ScanResi() {
  const [resiList, setResiList] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]) // Default hari ini
  const [filterPreset, setFilterPreset] = useState('today') // today, yesterday, week, all

  useEffect(() => {
    let unsubscribe = null
    
    // Timeout fallback - stop loading after 5 seconds
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)
    
    try {
      // Subscribe to resi data from Firebase
      unsubscribe = firebaseDB.onValue('scan-resi', (data) => {
        clearTimeout(timeout)
        setLoading(false)
        if (!data) {
          setResiList([])
          return
        }
        
        const list = Object.values(data).sort((a, b) => 
          new Date(b.scannedAt) - new Date(a.scannedAt)
        )
        setResiList(list)
      })
    } catch (err) {
      console.error('Firebase subscription error:', err)
      clearTimeout(timeout)
      setLoading(false)
    }
    
    return () => {
      clearTimeout(timeout)
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const formatDate = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (isoString) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const toggleStatus = async (resiId, currentStatus) => {
    const newStatus = currentStatus === 'scanned' ? 'processed' : 'scanned'
    await firebaseDB.set(`scan-resi/${resiId}/status`, newStatus)
  }

  const deleteResi = async (resiId) => {
    const pin = prompt('Masukkan PIN untuk menghapus:')
    if (pin !== '51077') {
      if (pin !== null) alert('PIN salah!')
      return
    }
    
    await firebaseDB.remove(`scan-resi/${resiId}`)
  }

  const clearAllResi = async () => {
    const pin = prompt('Masukkan PIN untuk menghapus SEMUA data:')
    if (pin !== '51077') {
      if (pin !== null) alert('PIN salah!')
      return
    }
    
    await firebaseDB.remove('scan-resi')
  }

  // Helper functions for date presets
  const getDateRange = (preset) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    switch (preset) {
      case 'today':
        return { start: today, end: new Date() }
      case 'yesterday':
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return { start: yesterday, end: today }
      case 'week':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return { start: weekAgo, end: new Date() }
      case 'all':
      default:
        return { start: null, end: null }
    }
  }

  const handlePresetChange = (preset) => {
    setFilterPreset(preset)
    if (preset === 'all') {
      setFilterDate('')
    } else if (preset === 'today') {
      setFilterDate(new Date().toISOString().split('T')[0])
    } else if (preset === 'yesterday') {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      setFilterDate(yesterday.toISOString().split('T')[0])
    } else if (preset === 'week') {
      setFilterDate('') // Will use date range
    }
  }

  // Filter and search
  const filteredResi = resiList.filter(resi => {
    // Search filter
    const matchSearch = searchTerm === '' || 
      resi.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (resi.pengantar && resi.pengantar.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (resi.kurir && resi.kurir.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Status filter
    const matchStatus = filterStatus === 'all' || resi.status === filterStatus
    
    // Date filter based on preset or manual date
    let matchDate = true
    if (filterPreset === 'week') {
      const { start } = getDateRange('week')
      const resiDate = new Date(resi.scannedAt)
      matchDate = resiDate >= start
    } else if (filterDate !== '') {
      matchDate = resi.scannedAt.startsWith(filterDate)
    }
    
    return matchSearch && matchStatus && matchDate
  })

  // Group by date
  const groupedResi = filteredResi.reduce((groups, resi) => {
    const date = resi.scannedAt.split('T')[0]
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(resi)
    return groups
  }, {})

  // Stats - filtered results
  const totalFiltered = filteredResi.length
  const processedFiltered = filteredResi.filter(r => r.status === 'processed').length
  const pendingFiltered = filteredResi.filter(r => r.status === 'scanned').length
  
  // Stats - today only
  const todayStr = new Date().toISOString().split('T')[0]
  const todayResi = resiList.filter(r => r.scannedAt.startsWith(todayStr))
  const todayTotal = todayResi.length
  const todayProcessed = todayResi.filter(r => r.status === 'processed').length

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 rounded-xl">
            <ScanLine className="text-orange-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Scan Resi</h1>
            <p className="text-gray-500 text-sm">Data dari aplikasi scan Android</p>
          </div>
        </div>
        {resiList.length > 0 && (
          <button
            onClick={clearAllResi}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-2"
          >
            <Trash2 size={18} />
            Hapus Semua
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="text-orange-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{todayTotal}</p>
              <p className="text-xs text-gray-500">Hari Ini</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalFiltered}</p>
              <p className="text-xs text-gray-500">Total Filter</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{processedFiltered}</p>
              <p className="text-xs text-gray-500">Diproses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{pendingFiltered}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Preset Buttons */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handlePresetChange('today')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterPreset === 'today' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📅 Hari Ini
          </button>
          <button
            onClick={() => handlePresetChange('yesterday')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterPreset === 'yesterday' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⏪ Kemarin
          </button>
          <button
            onClick={() => handlePresetChange('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterPreset === 'week' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📆 7 Hari Terakhir
          </button>
          <button
            onClick={() => handlePresetChange('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterPreset === 'all' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📋 Semua
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Cari resi, pengantar, kurir..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">Semua Status</option>
            <option value="scanned">Pending</option>
            <option value="processed">Diproses</option>
          </select>
          
          {/* Date Filter */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value)
              setFilterPreset('custom')
            }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Resi List */}
      {filteredResi.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border text-center">
          <ScanLine className="mx-auto text-gray-300 mb-4" size={64} />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            {resiList.length === 0 ? 'Belum ada data resi' : 'Tidak ada hasil'}
          </h3>
          <p className="text-gray-400">
            {resiList.length === 0 
              ? 'Data resi akan muncul setelah scan dari aplikasi Android'
              : 'Coba ubah filter pencarian'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResi).map(([date, resiItems]) => (
            <div key={date}>
              {/* Date Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm font-medium text-gray-500 px-3 py-1 bg-gray-100 rounded-full">
                  {formatDateOnly(date + 'T00:00:00')}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              
              {/* Resi Items */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nomor Resi</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pengantar</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kurir</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {resiItems.map((resi, index) => (
                      <tr key={resi.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold text-gray-800">{resi.code}</span>
                          {resi.note && (
                            <p className="text-xs text-gray-400 mt-1">{resi.note}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{resi.pengantar || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{resi.kurir || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(resi.scannedAt)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleStatus(resi.id, resi.status)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              resi.status === 'processed'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {resi.status === 'processed' ? '✓ Diproses' : '⏳ Pending'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => deleteResi(resi.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
