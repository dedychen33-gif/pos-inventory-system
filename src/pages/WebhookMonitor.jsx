import { useState, useEffect } from 'react'
import { RefreshCw, Bell, CheckCircle, XCircle, Clock, Package, ShoppingCart } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export default function WebhookMonitor() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const webhookNames = {
    0: { name: 'Order Status', icon: ShoppingCart, color: 'blue' },
    3: { name: 'Buyer Cancel', icon: XCircle, color: 'red' },
    7: { name: 'Reserved Stock', icon: Package, color: 'orange' },
    8: { name: 'Item Promotion', icon: Bell, color: 'purple' },
  }

  const fetchLogs = async () => {
    if (!supabase) {
      setError('Supabase not configured')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('shopee_webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setLogs(data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    
    // Auto refresh every 10 seconds
    let interval
    if (autoRefresh) {
      interval = setInterval(fetchLogs, 10000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

  const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('id-ID')
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'processed':
        return <span className="badge bg-green-100 text-green-800">Processed</span>
      case 'pending':
        return <span className="badge bg-yellow-100 text-yellow-800">Pending</span>
      case 'failed':
        return <span className="badge bg-red-100 text-red-800">Failed</span>
      default:
        return <span className="badge bg-gray-100 text-gray-800">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopee Webhook Monitor</h1>
          <p className="text-gray-600">Monitor notifikasi dari Shopee secara real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto Refresh (10s)
          </label>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Bell className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Webhook</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Processed</p>
              <p className="text-2xl font-bold">{logs.filter(l => l.status === 'processed').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold">{logs.filter(l => l.status === 'pending').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Failed</p>
              <p className="text-2xl font-bold">{logs.filter(l => l.status === 'failed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <p className="font-medium">Error loading logs:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Webhook Logs</h2>
        </div>
        
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw size={32} className="animate-spin mx-auto mb-2" />
            Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell size={48} className="mx-auto mb-2 text-gray-300" />
            <p>Belum ada webhook masuk</p>
            <p className="text-sm">Webhook akan muncul di sini ketika ada order baru atau perubahan stok dari Shopee</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => {
                  const webhookInfo = webhookNames[log.webhook_code] || { name: log.webhook_name || 'Unknown', color: 'gray' }
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-${webhookInfo.color}-100 text-${webhookInfo.color}-800`}>
                          {webhookInfo.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">
                        {log.shop_id || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(log.status)}
                      </td>
                      <td className="px-4 py-3">
                        {log.is_verified ? (
                          <CheckCircle size={18} className="text-green-500" />
                        ) : (
                          <XCircle size={18} className="text-gray-300" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {log.error_message || (log.payload ? JSON.stringify(log.payload).slice(0, 50) + '...' : '-')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
