import { useState, useEffect } from 'react'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { X, Flashlight, FlashlightOff } from 'lucide-react'
import { isAndroid } from '../utils/platform'

export default function BarcodeScannerComponent({ onScan, onClose }) {
  const [isScanning, setIsScanning] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [error, setError] = useState(null)

  // Start scanning automatically when component mounts
  useEffect(() => {
    startScan()
    
    // Cleanup on unmount
    return () => {
      stopScan()
    }
  }, [])

  const requestPermissions = async () => {
    const { camera } = await BarcodeScanner.requestPermissions()
    return camera === 'granted' || camera === 'limited'
  }

  const hideAppContent = () => {
    // ML Kit scanner shows camera behind the WebView
    // We need to make backgrounds transparent
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'
    
    // Hide the app content
    const appRoot = document.getElementById('root')
    if (appRoot) {
      appRoot.style.visibility = 'hidden'
    }
  }

  const showAppContent = () => {
    document.body.style.background = ''
    document.documentElement.style.background = ''
    
    const appRoot = document.getElementById('root')
    if (appRoot) {
      appRoot.style.visibility = 'visible'
    }
  }

  const startScan = async () => {
    try {
      setError(null)
      
      // Check if running on Android
      if (!isAndroid) {
        setError('Barcode scanner hanya tersedia di aplikasi Android')
        return
      }

      // Request camera permission
      const hasPermission = await requestPermissions()
      if (!hasPermission) {
        setError('Izin kamera diperlukan untuk scan barcode')
        return
      }

      // Hide app content to show camera
      hideAppContent()
      
      setIsScanning(true)

      // Add listener for scanned barcodes
      await BarcodeScanner.addListener('barcodeScanned', async (result) => {
        if (result.barcode && result.barcode.rawValue) {
          await stopScan()
          onScan(result.barcode.rawValue)
        }
      })

      // Start scanning
      await BarcodeScanner.startScan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Code93,
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
      if (torchEnabled) {
        await BarcodeScanner.toggleTorch()
      }
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

  const handleClose = async () => {
    await stopScan()
    onClose()
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="bg-white rounded-xl p-6 mx-4 max-w-sm text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={handleClose} className="btn btn-primary">
            Tutup
          </button>
        </div>
      </div>
    )
  }

  // Scanning view - overlay visible on top of camera
  return (
    <div 
      className="fixed inset-0 z-[9999]" 
      style={{ 
        background: 'transparent',
        pointerEvents: 'auto'
      }}
    >
      {/* Scanner frame overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Scanning frame */}
        <div 
          className="w-72 h-72 border-4 border-white rounded-2xl relative"
          style={{
            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Corner accents */}
          <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          
          {/* Scanning line animation */}
          <div className="absolute left-4 right-4 h-1 bg-blue-500 rounded scanning-line"></div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-16 left-0 right-0 text-center pointer-events-none">
        <p className="text-white text-xl font-semibold drop-shadow-lg">
          Arahkan kamera ke barcode
        </p>
        <p className="text-gray-200 text-sm mt-2 drop-shadow">
          Scan akan otomatis berjalan
        </p>
      </div>

      {/* Controls */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
        {/* Torch button */}
        <button
          onClick={toggleTorch}
          className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/40 active:scale-95 transition-transform"
        >
          {torchEnabled ? (
            <FlashlightOff size={28} className="text-yellow-400" />
          ) : (
            <Flashlight size={28} className="text-white" />
          )}
        </button>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center border-2 border-white/40 active:scale-95 transition-transform"
        >
          <X size={30} className="text-white" />
        </button>
      </div>

      {/* Loading overlay */}
      {!isScanning && (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Memulai kamera...</p>
          </div>
        </div>
      )}

      {/* CSS for scanning animation */}
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
