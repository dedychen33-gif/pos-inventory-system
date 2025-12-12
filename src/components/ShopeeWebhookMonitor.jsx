import { useState, useEffect } from 'react';
import shopeeWebhookService from '../services/shopeeWebhookService';

export default function ShopeeWebhookMonitor() {
  const [stats, setStats] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsData, logsData, queueData] = await Promise.all([
        shopeeWebhookService.getWebhookStats(),
        shopeeWebhookService.getWebhookLogs({ limit: 20 }),
        shopeeWebhookService.getSyncQueue({ limit: 20 })
      ]);
      
      setStats(statsData);
      setWebhookLogs(logsData);
      setSyncQueue(queueData);
    } catch (error) {
      console.error('Failed to load webhook data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySync = async (queueId) => {
    try {
      await shopeeWebhookService.retryFailedSync(queueId);
      await loadData();
      alert('Sync queued for retry');
    } catch (error) {
      alert('Failed to retry: ' + error.message);
    }
  };

  const handleProcessQueue = async () => {
    try {
      setLoading(true);
      const result = await shopeeWebhookService.processSyncQueue();
      alert(`Processed: ${result.result.processed}, Failed: ${result.result.failed}`);
      await loadData();
    } catch (error) {
      alert('Failed to process queue: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      retry: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const webhookEventNames = {
    0: 'Order Status',
    1: 'Tracking No',
    2: 'Shopee Update',
    3: 'Buyer Cancel',
    5: 'Promotion',
    7: 'Reserved Stock',
    8: 'Item Promotion',
    9: 'Shop Update',
    11: 'Video Upload',
    13: 'Brand Register',
    16: 'Violation Item'
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading webhook monitor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Shopee Webhook Monitor</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Webhook Stats (24h)</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Received:</span>
                <span className="font-bold">{stats.webhooks.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success:</span>
                <span className="font-bold text-green-600">{stats.webhooks.success}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-bold text-red-600">{stats.webhooks.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-bold text-yellow-600">{stats.webhooks.pending}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Sync Queue Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Items:</span>
                <span className="font-bold">{stats.syncQueue.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending:</span>
                <span className="font-bold text-yellow-600">{stats.syncQueue.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Processing:</span>
                <span className="font-bold text-blue-600">{stats.syncQueue.processing}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-bold text-red-600">{stats.syncQueue.failed}</span>
              </div>
            </div>
            <button
              onClick={handleProcessQueue}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={loading || stats.syncQueue.pending === 0}
            >
              Process Queue Now
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'stats'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'webhooks'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Webhook Logs
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'queue'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Sync Queue
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'webhooks' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {webhookLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {webhookEventNames[log.webhook_code] || `Code ${log.webhook_code}`}
                      </td>
                      <td className="px-4 py-3 text-sm">{log.shop_id}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.is_verified ? '✅' : '❌'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'queue' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retry</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {syncQueue.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.sync_type}</td>
                      <td className="px-4 py-3 text-sm">
                        {item.products?.name || `ID: ${item.product_id}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.retry_count}/{item.max_retries}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.status === 'failed' && (
                          <button
                            onClick={() => handleRetrySync(item.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Retry
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="prose max-w-none">
              <h3>Webhook Integration Status</h3>
              <p>
                Full 2-way sync aktif antara POS dan Shopee. Sistem akan otomatis:
              </p>
              <ul>
                <li><strong>Order Sync:</strong> Order baru dari Shopee → Auto kurangi stok di POS</li>
                <li><strong>Stock Sync:</strong> Stok berubah di POS → Auto update ke Shopee (setiap 5 menit)</li>
                <li><strong>Product Sync:</strong> Perubahan produk di Shopee → Trigger sync ke POS</li>
              </ul>
              
              <h4>Status Saat Ini:</h4>
              <div className="grid grid-cols-2 gap-4 not-prose">
                <div className="bg-green-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Webhook Endpoint</div>
                  <div className="text-lg font-bold text-green-600">✅ Active</div>
                </div>
                <div className="bg-blue-50 p-4 rounded">
                  <div className="text-sm text-gray-600">Auto Sync</div>
                  <div className="text-lg font-bold text-blue-600">⚡ Running</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
