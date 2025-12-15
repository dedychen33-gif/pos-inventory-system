// Real-Time Sync Status Indicator Component
// Shows connection status between Android/Web and Supabase

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';

export function SyncStatusIndicator({ compact = false }) {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    mode: 'realtime'
  });

  useEffect(() => {
    // Get sync status from global window object (set by RealtimeSyncProvider)
    const checkStatus = () => {
      if (window.__syncStatus) {
        setSyncStatus(window.__syncStatus);
      }
    };

    // Check immediately and then every second
    checkStatus();
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatLastSync = (dateStr) => {
    if (!dateStr) return 'Belum sync';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);

    if (diffSec < 5) return 'Baru saja';
    if (diffSec < 60) return `${diffSec} detik lalu`;
    if (diffMin < 60) return `${diffMin} menit lalu`;
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {syncStatus.isSyncing ? (
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        ) : syncStatus.isOnline ? (
          <Cloud className="w-4 h-4 text-green-500" />
        ) : (
          <CloudOff className="w-4 h-4 text-gray-400" />
        )}
        <span className={`text-xs ${syncStatus.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {syncStatus.isOnline ? 'Sync' : 'Offline'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Connection Status Icon */}
      <div className="relative">
        {syncStatus.isSyncing ? (
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
        ) : syncStatus.isOnline ? (
          <Wifi className="w-5 h-5 text-green-500" />
        ) : (
          <WifiOff className="w-5 h-5 text-red-500" />
        )}
        
        {/* Pulse indicator when online */}
        {syncStatus.isOnline && !syncStatus.isSyncing && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Status Text */}
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${
          syncStatus.isSyncing ? 'text-blue-600' :
          syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
        }`}>
          {syncStatus.isSyncing ? 'Syncing...' :
           syncStatus.isOnline ? 'Real-time Connected' : 'Offline'}
        </span>
        <span className="text-[10px] text-gray-500">
          {formatLastSync(syncStatus.lastSync)}
        </span>
      </div>
    </div>
  );
}

// Floating indicator for mobile/Android
export function FloatingSyncIndicator() {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: false,
    isSyncing: false
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const checkStatus = () => {
      const prev = syncStatus.isOnline;
      const current = window.__syncStatus?.isOnline || false;
      
      if (window.__syncStatus) {
        setSyncStatus(window.__syncStatus);
      }

      // Show toast on connection change
      if (prev !== current && prev !== undefined) {
        setToastMessage(current ? '✅ Real-time sync connected!' : '❌ Connection lost');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    };

    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, [syncStatus.isOnline]);

  return (
    <>
      {/* Floating indicator */}
      <div className="fixed bottom-20 right-4 z-40">
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full shadow-lg transition-all duration-300 ${
          syncStatus.isSyncing ? 'bg-blue-500' :
          syncStatus.isOnline ? 'bg-green-500' : 'bg-gray-500'
        }`}>
          {syncStatus.isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
          ) : syncStatus.isOnline ? (
            <Cloud className="w-3.5 h-3.5 text-white" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-white" />
          )}
          <span className="text-xs text-white font-medium">
            {syncStatus.isSyncing ? 'Sync' : syncStatus.isOnline ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${
            syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}

export default SyncStatusIndicator;
