import { useEffect, useRef, useState } from 'react'
import bwipjs from 'bwip-js'
import { Download, Copy, Check } from 'lucide-react'

export default function BarcodeGenerator({ value, format = 'code128', width = 2, height = 50, showText = true }) {
  const canvasRef = useRef(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!value || !canvasRef.current) return

    try {
      // Map format names
      const formatMap = {
        'code128': 'code128',
        'code39': 'code39',
        'ean13': 'ean13',
        'ean8': 'ean8',
        'upca': 'upca',
        'upce': 'upce',
        'qrcode': 'qrcode',
        'datamatrix': 'datamatrix'
      }

      const bcid = formatMap[format.toLowerCase()] || 'code128'

      bwipjs.toCanvas(canvasRef.current, {
        bcid: bcid,
        text: value,
        scale: 3,
        height: height / 3,
        includetext: showText,
        textxalign: 'center',
        textsize: 10,
        textfont: 'Helvetica',
        paddingwidth: 10,
        paddingheight: 10,
        backgroundcolor: 'ffffff'
      })
      
      setError(null)
    } catch (err) {
      console.error('Barcode generation error:', err)
      setError('Gagal generate barcode: ' + err.message)
    }
  }, [value, format, width, height, showText])

  const downloadBarcode = () => {
    if (!canvasRef.current) return

    const link = document.createElement('a')
    link.download = `barcode-${value}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy error:', err)
    }
  }

  if (!value) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
        Masukkan kode untuk generate barcode
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 rounded-lg p-4 text-center text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <canvas ref={canvasRef} />
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={copyToClipboard}
          className="btn btn-sm btn-outline flex items-center gap-1"
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        
        <button
          onClick={downloadBarcode}
          className="btn btn-sm btn-primary flex items-center gap-1"
        >
          <Download size={16} />
          Download
        </button>
      </div>
    </div>
  )
}

// Compact version for product list/cards
export function BarcodeImage({ value, format = 'code128', size = 'small' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!value || !canvasRef.current) return

    try {
      const scale = size === 'small' ? 1.5 : size === 'medium' ? 2 : 3
      
      bwipjs.toCanvas(canvasRef.current, {
        bcid: format.toLowerCase() === 'qrcode' ? 'qrcode' : 'code128',
        text: value,
        scale: scale,
        height: size === 'small' ? 8 : size === 'medium' ? 12 : 15,
        includetext: size !== 'small',
        textxalign: 'center',
        textsize: 8,
        paddingwidth: 5,
        paddingheight: 5,
        backgroundcolor: 'ffffff'
      })
    } catch (err) {
      console.error('Barcode error:', err)
    }
  }, [value, format, size])

  if (!value) return null

  return <canvas ref={canvasRef} className="max-w-full" />
}
