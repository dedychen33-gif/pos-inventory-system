import { useState, useEffect, useCallback } from 'react'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { Device } from '@capacitor/device'
import { X, Flashlight, FlashlightOff, Wifi, WifiOff, CheckCircle, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProductStore } from '../store/productStore'

export default function RemoteScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [scanCount, setScanCount] = useState(0)
  const [deviceInfo, setDeviceInfo] = useState({ id: '', name: '' })
  const [sessionId, setSessionId] = useState('')
  const [error, setError] = useState(null)
  const { products } = useProductStore()

  // Generate session ID on mount
  useEffect(() => {
    const session = `scan-${Date.now()}`
    setSessionId(session)
    
    // Get device info
    Device.getInfo().then(info => {
      Device.getId().then(idInfo => {
        setDeviceInfo({
          id: idInfo.identifier || idInfo.uuid || 'unknown',
          name: `${info.manufacturer} ${info.model}`
        })
      })
    })

    // Check Supabase connection
    checkConnection()

    return () => {
      stopScan()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('barcode_scans').select('id').limit(1)
      setIsConnected(!error)
    } catch {
      setIsConnected(false)
    }
  }

  const hideAppContent = () => {
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    const appRoot = document.getElementById('root')
    if (appRoot) appRoot.style.visibility = 'hidden'
  }

  const showAppContent = () => {
    document.body.style.background = ''
    document.documentElement.style.background = ''
    const appRoot = document.getElementById('root')
    if (appRoot) appRoot.style.visibility = 'visible'
  }

  const sendScanToSupabase = async (barcode) => {
    try {
      const { error } = await supabase.from('barcode_scans').insert({
        barcode,
        device_id: deviceInfo.id,
        device_name: deviceInfo.name,
        session_id: sessionId,
        processed: false
      })
      
      if (error) throw error
      
      // Find product info
      const product = products.find(p => 
        p.barcode === barcode || p.code === barcode || p.sku === barcode
      )
      
      setLastScan({
        barcode,
        product: product ? product.name : null,
        time: new Date().toLocaleTimeString()
      })
      setScanCount(prev => prev + 1)
      
      return true
    } catch (err) {
      console.error('Error sending scan:', err)
      setError('Gagal mengirim scan ke server')
      return false
    }
  }

  const startScan = async () => {
    try {
      setError(null)
      
      const { camera } = await BarcodeScanner.requestPermissions()
      if (camera !== 'granted' && camera !== 'limited') {
        setError('Izin kamera diperlukan')
        return
      }

      hideAppContent()
      setIsScanning(true)

      await BarcodeScanner.addListener('barcodeScanned', async (result) => {
        if (result.barcode?.rawValue) {
          // Vibrate on scan
          if (navigator.vibrate) navigator.vibrate(100)
          
          // Send to Supabase
          await sendScanToSupabase(result.barcode.rawValue)
        }
      })

      await BarcodeScanner.startScan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.QrCode,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE
        ],
        lensFacing: 'back'
      })

    } catch (err) {
      console.error('Scan error:', err)
      setError('Gagal memulai scanner: ' + err.message)
      showAppContent()
      setIsScanning(false)
    }
  }

  const stopScan = async () => {
    try {
      await BarcodeScanner.stopScan()
      await BarcodeScanner.removeAllListeners()
      if (torchEnabled) await BarcodeScanner.toggleTorch()
    } catch (err) {
      console.error('Stop scan error:', err)
    } finally {
      showAppContent()
      setIsScanning(false)
      setTorchEnabled(false)
    }
  }

  const toggleTorch = async () => {
    try {
      await BarcodeScanner.toggleTorch()
      setTorchEnabled(!torchEnabled)
    } catch (err) {
      console.error('Torch error:', err)
    }
  }

  // Scanning view
  if (isScanning) {
    return (
      <div className="fixed inset-0 z-[9999]" style={{ background: 'transparent' }}>
        {/* Scanner frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-72 h-72 border-4 border-white rounded-2xl relative"
            style={{ boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)' }}
          >
            <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-xl"></div>
            <div className="absolute left-4 right-4 h-1 bg-green-500 rounded scanning-line"></div>
          </div>
        </div>

        {/* Header info */}
        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none safe-area-top">
          <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur px-4 py-2 rounded-full">
            <Wifi className="text-green-400" size={18} />
            <span className="text-white font-medium">Mode Remote Scanner</span>
          </div>
          <p className="text-gray-200 text-sm mt-2">Scan untuk kirim ke Kasir Web</p>
        </div>

        {/* Last scan info */}
        {lastScan && (
          <div className="absolute top-24 left-4 right-4 pointer-events-none">
            <div className="bg-green-500/90 backdrop-blur rounded-xl p-3 flex items-center gap-3">
              <CheckCircle className="text-white flex-shrink-0" size={24} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {lastScan.product || lastScan.barcode}
                </p>
                <p className="text-green-100 text-sm">
                  Terkirim ke Web • {lastScan.time}
                </p>
              </div>
              <div className="bg-white/20 px-3 py-1 rounded-full">
                <span className="text-white font-bold">{scanCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
          <button
            onClick={toggleTorch}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40"
          >
            {torchEnabled ? (
              <FlashlightOff size={28} className="text-yellow-400" />
            ) : (
              <Flashlight size={28} className="text-white" />
            )}
          </button>

          <button
            onClick={stopScan}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center border-2 border-white/40"
          >
            <X size={30} className="text-white" />
          </button>
        </div>

        <style>{`
          .scanning-line {
            animation: scan 2s ease-in-out infinite;
          }
          @keyframes scan {
            0%, 100% { top: 10%; }
            50% { top: 85%; }
          }
        `}</style>
      </div>
    )
  }

  // Main view
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-6 rounded-b-3xl">
        <h1 className="text-2xl font-bold mb-1">Remote Scanner</h1>
        <p className="text-green-100">Scan barcode untuk kasir di Web</p>
        
        {/* Connection status */}
        <div className="mt-4 flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi size={20} className="text-green-300" />
              <span className="text-green-200">Terhubung ke server</span>
            </>
          ) : (
            <>
              <WifiOff size={20} className="text-red-300" />
              <span className="text-red-200">Tidak terhubung</span>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-3">Cara Penggunaan:</h3>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <span>Buka halaman <strong>Kasir/POS</strong> di komputer Web</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <span>Tekan tombol <strong>"Mulai Scan"</strong> di bawah</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <span>Arahkan kamera ke barcode produk</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <span>Produk otomatis masuk ke keranjang di Web!</span>
            </li>
          </ol>
        </div>

        {/* Stats */}
        {scanCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="text-green-600" size={24} />
                <div>
                  <p className="font-bold text-green-900">{scanCount} produk di-scan</p>
                  {lastScan && (
                    <p className="text-sm text-green-700">
                      Terakhir: {lastScan.product || lastScan.barcode}
                    </p>
                  )}
                </div>
              </div>
              <button 
                onClick={() => { setScanCount(0); setLastScan(null) }}
                className="text-green-600 text-sm underline"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Session info */}
        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
          <p><strong>Device:</strong> {deviceInfo.name || 'Loading...'}</p>
          <p><strong>Session:</strong> {sessionId}</p>
        </div>

        {/* Scan button - moved inside content area */}
        <button
          onClick={startScan}
          disabled={!isConnected}
          className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transition-all mt-4 ${
            isConnected 
              ? 'bg-green-500 text-white active:scale-95' 
              : 'bg-gray-300 text-gray-500'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" 
            />
          </svg>
          {isConnected ? 'Mulai Scan' : 'Tidak Terhubung'}
        </button>
      </div>
    </div>
  )
}
