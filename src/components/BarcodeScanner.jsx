import { useState, useRef } from 'react'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { X, Flashlight, FlashlightOff, Camera } from 'lucide-react'
import { isAndroid } from '../utils/platform'

export default function BarcodeScannerComponent({ onScan, onClose }) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [error, setError] = useState(null)
  const [lastResult, setLastResult] = useState(null)
  const isProcessingRef = useRef(false)

  const requestPermissions = async () => {
    const { camera } = await BarcodeScanner.requestPermissions()
    return camera === 'granted' || camera === 'limited'
  }

  // Single capture scan - takes one photo and reads barcode
  const handleCaptureScan = async () => {
    if (isProcessingRef.current || isCapturing) return
    
    try {
      setError(null)
      setLastResult(null)
      isProcessingRef.current = true
      setIsCapturing(true)

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

      // Use scan() method - captures single image and reads barcodes
      const result = await BarcodeScanner.scan({
        formats: [
          BarcodeFormat.Ean13,
          BarcodeFormat.Ean8,
          BarcodeFormat.Code128,
          BarcodeFormat.Code39,
          BarcodeFormat.Code93,
          BarcodeFormat.QrCode,
          BarcodeFormat.UpcA,
          BarcodeFormat.UpcE,
          BarcodeFormat.Itf,
          BarcodeFormat.Codabar,
          BarcodeFormat.DataMatrix,
          BarcodeFormat.Pdf417
        ]
      })

      if (result.barcodes && result.barcodes.length > 0) {
        const barcode = result.barcodes[0].rawValue
        setLastResult({ success: true, barcode })
        
        // Small delay to show result before closing
        setTimeout(() => {
          onScan(barcode)
        }, 300)
      } else {
        setLastResult({ success: false, message: 'Tidak ada barcode terdeteksi' })
      }

    } catch (err) {
      console.error('Scan error:', err)
      if (err.message?.includes('canceled') || err.message?.includes('cancelled')) {
        // User cancelled - do nothing
      } else {
        setError('Gagal scan: ' + (err.message || 'Unknown error'))
      }
    } finally {
      setIsCapturing(false)
      isProcessingRef.current = false
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

  const handleClose = () => {
    if (torchEnabled) {
      BarcodeScanner.toggleTorch().catch(() => {})
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-primary text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Scan Barcode</h3>
            <p className="text-sm opacity-80">Tekan tombol untuk capture</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Last result */}
          {lastResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              lastResult.success 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {lastResult.success 
                ? `✓ Barcode: ${lastResult.barcode}` 
                : lastResult.message
              }
            </div>
          )}

          {/* Scan illustration */}
          <div className="bg-gray-100 rounded-xl p-8 mb-6">
            <div className="w-32 h-20 mx-auto border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Camera size={32} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-500">Posisikan barcode</p>
              </div>
            </div>
          </div>

          {/* Capture button */}
          <button
            onClick={handleCaptureScan}
            disabled={isCapturing}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 ${
              isCapturing 
                ? 'bg-gray-300 text-gray-500' 
                : 'bg-primary text-white active:scale-98'
            }`}
          >
            {isCapturing ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                Scanning...
              </>
            ) : (
              <>
                <Camera size={24} />
                CAPTURE & SCAN
              </>
            )}
          </button>

          {/* Flash toggle */}
          <button
            onClick={toggleTorch}
            className={`w-full mt-3 py-3 rounded-xl flex items-center justify-center gap-2 ${
              torchEnabled 
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {torchEnabled ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
            {torchEnabled ? 'Matikan Flash' : 'Nyalakan Flash'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
