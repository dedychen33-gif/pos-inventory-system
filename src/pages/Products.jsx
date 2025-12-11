import { useState } from 'react'
import { Plus, Edit, Trash2, Search, X, Image as ImageIcon, Package, Camera, QrCode, Store, ExternalLink, RefreshCw, Upload, ChevronDown, ChevronRight, Download, FileSpreadsheet, Cloud } from 'lucide-react'
import { useProductStore } from '../store/productStore'
import { useAuthStore } from '../store/authStore'
import { isAndroid } from '../utils/platform'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeGenerator, { BarcodeImage } from '../components/BarcodeGenerator'
import { marketplaceService } from '../services/marketplaceApi'

// Detect if we're on production or local
const isProduction = window.location.hostname !== 'localhost';
const API_BASE = isProduction ? '' : 'http://localhost:3001';

// Update product to Shopee
async function updateProductToShopee(product, updates) {
  const partnerId = localStorage.getItem('shopee_partner_id');
  const partnerKey = localStorage.getItem('shopee_partner_key');
  const shopId = localStorage.getItem('shopee_shop_id');
  const accessToken = localStorage.getItem('shopee_access_token');
  
  if (!partnerId || !partnerKey || !shopId || !accessToken) {
    return { success: false, error: 'Shopee not configured' };
  }
  
  if (!product.shopeeItemId) {
    return { success: false, error: 'Product not from Shopee' };
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/shopee/update-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partner_id: partnerId,
        partner_key: partnerKey,
        shop_id: shopId,
        access_token: accessToken,
        item_id: product.shopeeItemId,
        model_id: product.shopeeModelId || null,
        price: updates.price,
        stock: updates.stock,
        sku: updates.sku,
        action: 'update_all'
      })
    });
    
    const data = await res.json();
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate SKU: SJA + 6 random numbers
const generateSKU = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000)
  return `SJA${randomNum}`
}

// Generate Barcode: 9 random numbers
const generateBarcode = () => {
  return Math.floor(100000000 + Math.random() * 900000000).toString()
}

export default function Products() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)
  const [selectedProductBarcode, setSelectedProductBarcode] = useState(null)
  const [expandedProducts, setExpandedProducts] = useState({}) // Track expanded variant groups
  const [showImportModal, setShowImportModal] = useState(false)
  const [importData, setImportData] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  
  const { products, categories, addProduct, updateProduct, deleteProduct, syncLocalToCloud, isSyncing } = useProductStore()
  const { user } = useAuthStore()

  // Handle sync to cloud
  const handleSyncToCloud = async () => {
    if (confirm('Upload semua data produk lokal ke Cloud (Supabase)? Data di cloud dengan ID sama akan di-update.')) {
      const result = await syncLocalToCloud()
      if (result.success) {
        alert(result.message)
      } else {
        alert('Gagal sync: ' + result.error)
      }
    }
  }

  // Download CSV template for bulk import
  const handleDownloadTemplate = () => {
    const csvContent = 'nama,sku,barcode,kategori,satuan,harga_jual,harga_beli,stok,stok_minimum,deskripsi\nContoh Produk,SKU001,123456789,Makanan,pcs,15000,10000,100,10,Deskripsi produk\n'
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'template-import-produk.csv'
    link.click()
  }

  // Handle CSV file import
  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target.result
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        const data = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          if (values.length >= 2) {
            const product = {
              name: values[headers.indexOf('nama')] || values[0],
              sku: values[headers.indexOf('sku')] || generateSKU(),
              barcode: values[headers.indexOf('barcode')] || generateBarcode(),
              category: values[headers.indexOf('kategori')] || 'Lainnya',
              unit: values[headers.indexOf('satuan')] || 'pcs',
              price: parseFloat(values[headers.indexOf('harga_jual')]) || 0,
              cost: parseFloat(values[headers.indexOf('harga_beli')]) || 0,
              stock: parseInt(values[headers.indexOf('stok')]) || 0,
              minStock: parseInt(values[headers.indexOf('stok_minimum')]) || 5,
              description: values[headers.indexOf('deskripsi')] || ''
            }
            data.push(product)
          }
        }
        
        setImportData(data)
        setShowImportModal(true)
      } catch (error) {
        alert('Format file tidak valid: ' + error.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Process bulk import
  const handleBulkImport = async () => {
    setIsImporting(true)
    let imported = 0
    
    try {
      for (const product of importData) {
        await addProduct({
          ...product,
          code: `PRD${String(products.length + imported + 1).padStart(3, '0')}`,
          source: 'local'
        }, user?.id, user?.name)
        imported++
      }
      
      alert(`Berhasil import ${imported} produk!`)
      setShowImportModal(false)
      setImportData([])
    } catch (error) {
      alert('Gagal import: ' + error.message)
    } finally {
      setIsImporting(false)
    }
  }

  // Export all products to CSV
  const handleExportProducts = () => {
    let csvContent = 'kode,nama,sku,barcode,kategori,satuan,harga_jual,harga_beli,stok,stok_minimum,deskripsi\n'
    products.forEach(p => {
      csvContent += `${p.code || ''},${p.name || ''},${p.sku || ''},${p.barcode || ''},${p.category || ''},${p.unit || ''},${p.price || 0},${p.cost || 0},${p.stock || 0},${p.minStock || 0},"${(p.description || '').replace(/"/g, '""')}"\n`
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `produk-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Handle barcode scan result
  const handleBarcodeScan = (barcode) => {
    setShowScanner(false)
    setSearchTerm(barcode)
    
    // Check if product exists with this barcode
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      // Product found - could open edit modal or just filter
      alert(`Produk ditemukan: ${product.name}`)
    } else {
      // Product not found - offer to create new
      if (confirm(`Barcode ${barcode} tidak ditemukan. Buat produk baru?`)) {
        setEditingProduct(null)
        setShowModal(true)
        // The barcode will be pre-filled in the form
      }
    }
  }

  // Show barcode for product
  const handleShowBarcode = (product) => {
    setSelectedProductBarcode(product)
    setShowBarcodeModal(true)
  }

  const filteredProducts = products.filter((p) => {
    // Show all products including marketplace products (synced to local storage)
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory
    
    // Filter by source
    let matchSource = selectedSource === 'all'
    if (selectedSource === 'local') {
      matchSource = !['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(p.source)
    } else if (selectedSource === 'marketplace') {
      matchSource = ['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(p.source)
    } else if (selectedSource === 'shopee') {
      matchSource = p.source === 'shopee'
    } else if (selectedSource === 'lazada') {
      matchSource = p.source === 'lazada'
    } else if (selectedSource === 'tokopedia') {
      matchSource = p.source === 'tokopedia'
    } else if (selectedSource === 'tiktok') {
      matchSource = p.source === 'tiktok'
    }
    
    return matchSearch && matchCategory && matchSource
  })

  // Group products by parent (for variants - both local and Shopee)
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    // 1. Handle Marketplace Product (already has variants array)
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      acc[product.id] = {
        parent: product,
        variants: product.variants.map(v => ({
          ...v,
          id: v.id || v.modelId || `${product.id}-${v.sku || Math.random()}`, // Ensure variant has ID
          variantName: v.name || v.variantName, // Normalize name
          source: product.source,
          category: product.category,
          sku: v.sku || v.modelSku,
          price: v.price,
          stock: v.stock,
          image: v.image || product.image
        }))
      }
      return acc
    }

    // 2. Handle Local Product (flat structure, grouped by parent)
    // Use parentId (preferred) or parentName
    const parentKey = product.parentId || product.parentName || product.id
    
    if (!acc[parentKey]) {
      acc[parentKey] = {
        parent: null,
        variants: []
      }
    }
    
    // If this is a variant (has parentId or parentName)
    if (product.isVariant && (product.parentId || product.parentName)) {
      acc[parentKey].variants.push(product)
      // Set parent info from first variant if not set
      if (!acc[parentKey].parent) {
        acc[parentKey].parent = {
          id: parentKey,
          name: product.parentName || product.name.split(' - ')[0],
          image: product.image,
          category: product.category,
          source: product.source,
          sku: product.sku ? product.sku.split('-')[0] : '', // Try to guess parent SKU
          shopeeItemId: product.shopeeItemId
        }
      }
    } else {
      // This is a standalone product or parent
      acc[parentKey].parent = product
    }
    
    return acc
  }, {})

  // Convert to array and calculate totals for grouped products
  const allDisplayProducts = Object.entries(groupedProducts).map(([key, group]) => {
    const hasVariants = group.variants.length > 0
    
    if (hasVariants) {
      // Calculate totals from variants
      const totalStock = group.variants.reduce((sum, v) => sum + (v.stock || 0), 0)
      const minPrice = Math.min(...group.variants.map(v => v.price || 0))
      const maxPrice = Math.max(...group.variants.map(v => v.price || 0))
      
      return {
        ...group.parent,
        isGrouped: true,
        variantCount: group.variants.length,
        variants: group.variants,
        totalStock,
        priceRange: minPrice === maxPrice ? minPrice : { min: minPrice, max: maxPrice }
      }
    }
    
    return {
      ...group.parent,
      isGrouped: false,
      variants: []
    }
  })

  // Pagination logic
  const totalProducts = allDisplayProducts.length
  const totalPages = Math.ceil(totalProducts / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const displayProducts = allDisplayProducts.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value)
    setCurrentPage(1)
  }

  // Toggle expand/collapse for variant group
  const toggleExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }))
  }

  // Count products by source
  const shopeeCount = products.filter(p => p.source === 'shopee').length
  const lazadaCount = products.filter(p => p.source === 'lazada').length
  const tokopediaCount = products.filter(p => p.source === 'tokopedia').length
  const tiktokCount = products.filter(p => p.source === 'tiktok').length
  const marketplaceCount = shopeeCount + lazadaCount + tokopediaCount + tiktokCount
  const localCount = products.filter(p => !['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(p.source)).length

  const handleSubmit = (formData) => {
    if (editingProduct) {
      updateProduct(editingProduct.id, formData)
      setShowModal(false)
      setEditingProduct(null)
    } else {
      addProduct(formData)
      // Tidak menutup modal, biarkan tetap terbuka untuk input produk baru
    }
  }

  const handleEdit = (product) => {
    setEditingProduct(product)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Hapus produk ini?')) {
      deleteProduct(id)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Barcode Scanner Modal (Android only) */}
      {showScanner && isAndroid && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setShowScanner(false)} 
        />
      )}

      {/* Barcode Display Modal */}
      {showBarcodeModal && selectedProductBarcode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Barcode Produk</h3>
              <button onClick={() => setShowBarcodeModal(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            <div className="text-center mb-4">
              <p className="font-medium">{selectedProductBarcode.name}</p>
              <p className="text-sm text-gray-500">SKU: {selectedProductBarcode.sku}</p>
            </div>
            <BarcodeGenerator 
              value={selectedProductBarcode.barcode || selectedProductBarcode.sku} 
              format="code128"
            />
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-xl font-bold">Preview Import</h3>
                <p className="text-gray-600 text-sm">{importData.length} produk akan diimport</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Kategori</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Harga</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importData.map((p, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.sku}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{p.category}</td>
                      <td className="px-3 py-2 text-sm text-right">Rp {p.price?.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-sm text-right">{p.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                onClick={handleBulkImport}
                disabled={isImporting}
                className="btn btn-success flex-1 disabled:opacity-50"
              >
                {isImporting ? 'Memproses...' : `Import ${importData.length} Produk`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Master Produk</h1>
          <p className="text-gray-600 mt-1">Database produk lokal & Marketplace (tersimpan di perangkat)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Sync Cloud Button */}
          <button
            onClick={handleSyncToCloud}
            disabled={isSyncing}
            className="btn btn-outline flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            title="Upload data lokal ke Cloud"
          >
            <Cloud size={18} className={isSyncing ? 'animate-bounce' : ''} />
            <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          {/* Import/Export Buttons */}
          <div className="flex gap-1">
            <button
              onClick={handleExportProducts}
              className="btn btn-outline flex items-center gap-1"
              title="Export ke CSV"
            >
              <Download size={18} />
              <span className="hidden md:inline">Export</span>
            </button>
            <div className="relative">
              <input
                type="file"
                id="csv-import"
                accept=".csv"
                onChange={handleFileImport}
                className="hidden"
              />
              <label
                htmlFor="csv-import"
                className="btn btn-outline flex items-center gap-1 cursor-pointer"
                title="Import dari CSV"
              >
                <Upload size={18} />
                <span className="hidden md:inline">Import</span>
              </label>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-outline flex items-center gap-1"
              title="Download Template CSV"
            >
              <FileSpreadsheet size={18} />
            </button>
          </div>
          {/* Scan Button - Android Only */}
          {isAndroid && (
            <button
              onClick={() => setShowScanner(true)}
              className="btn btn-outline flex items-center gap-2"
            >
              <Camera size={20} />
              Scan
            </button>
          )}
          <button
            onClick={() => {
              setEditingProduct(null)
              setShowModal(true)
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Tambah</span> Produk
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari produk (SKU, nama, barcode)..."
              className="w-full pl-10 input"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => handleFilterChange(setSelectedCategory)(e.target.value)}
            className="input w-full md:w-48"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={selectedSource}
            onChange={(e) => handleFilterChange(setSelectedSource)(e.target.value)}
            className="input w-full md:w-52"
          >
            <option value="all">Semua ({products.length})</option>
            <option value="local">Lokal ({localCount})</option>
            <option value="marketplace">Marketplace ({marketplaceCount})</option>
            {shopeeCount > 0 && <option value="shopee">↳ Shopee ({shopeeCount})</option>}
            {lazadaCount > 0 && <option value="lazada">↳ Lazada ({lazadaCount})</option>}
            {tokopediaCount > 0 && <option value="tokopedia">↳ Tokopedia ({tokopediaCount})</option>}
            {tiktokCount > 0 && <option value="tiktok">↳ TikTok ({tiktokCount})</option>}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-14">Foto</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">SKU</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Produk</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Kategori</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">Tipe</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Modal</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Harga</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Margin</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Stok</th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayProducts.map((product) => (
                <>
                  {/* Main Product Row */}
                  <tr key={product.id} className={`hover:bg-gray-50 ${product.isGrouped ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        {/* Expand/Collapse button for grouped products */}
                        {product.isGrouped ? (
                          <button
                            onClick={() => toggleExpand(product.id)}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                            title={expandedProducts[product.id] ? 'Tutup varian' : 'Lihat varian'}
                          >
                            {expandedProducts[product.id] ? (
                              <ChevronDown size={18} className="text-blue-600" />
                            ) : (
                              <ChevronRight size={18} className="text-blue-600" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6"></div>
                        )}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full items-center justify-center text-gray-400 ${product.image ? 'hidden' : 'flex'}`}>
                            <ImageIcon size={16} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap font-mono text-xs text-gray-600 truncate max-w-[96px]" title={product.sku || product.code}>
                      {product.isGrouped ? (
                        <span className="text-gray-400 italic text-xs">{product.variantCount} varian</span>
                      ) : (
                        <span className="truncate block">{product.sku || (product.source === 'shopee' ? '-' : product.code)}</span>
                      )}
                    </td>
                    <td className="px-2 py-2" onClick={() => product.isGrouped && toggleExpand(product.id)}>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 line-clamp-2">{product.name}</p>
                          {product.source === 'shopee' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                              <Store size={10} />
                              Shopee
                            </span>
                          )}
                          {product.isGrouped && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                              {product.variantCount} Varian
                            </span>
                          )}
                          {/* Edit button - inline with product name */}
                          {!product.isGrouped && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded"
                              title="Edit Produk"
                            >
                              <Edit size={12} />
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="badge badge-info text-xs">{product.category}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`badge text-xs ${product.isPackage ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.isPackage ? 'Paket' : 'Satuan'}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right text-gray-600">
                      {product.isGrouped ? '-' : `Rp ${(product.costPrice || product.cost || 0).toLocaleString('id-ID')}`}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right font-semibold">
                      {product.isGrouped ? (
                        typeof product.priceRange === 'object' ? (
                          <span className="text-sm">
                            Rp {product.priceRange.min.toLocaleString('id-ID')} - {product.priceRange.max.toLocaleString('id-ID')}
                          </span>
                        ) : (
                          `Rp ${(product.priceRange || 0).toLocaleString('id-ID')}`
                        )
                      ) : (
                        `Rp ${(product.price || 0).toLocaleString('id-ID')}`
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {product.isGrouped ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <div>
                          <span className="font-semibold text-green-600">
                            Rp {((product.price || 0) - (product.costPrice || product.cost || 0)).toLocaleString('id-ID')}
                          </span>
                          {(product.costPrice || product.cost) > 0 && (
                            <p className="text-xs text-gray-500">
                              {((((product.price || 0) - (product.costPrice || product.cost)) / (product.costPrice || product.cost)) * 100).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      <span className={`font-semibold text-xs ${
                        (product.isGrouped ? product.totalStock : product.stock) <= (product.minStock || 5) ? 'text-red-600' :
                        (product.isGrouped ? product.totalStock : product.stock) <= (product.minStock || 5) * 2 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {product.isGrouped ? product.totalStock : (product.stock || 0)}
                      </span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-center">
                      {(product.isGrouped ? product.totalStock : product.stock) <= (product.minStock || 5) ? (
                        <span className="badge badge-danger text-xs">Rendah</span>
                      ) : (
                        <span className="badge badge-success text-xs">OK</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right">
                      <div className="flex gap-1 justify-end">
                        {/* Barcode button - tampil di Web dan Android */}
                        {product.barcode && !product.isGrouped && (
                          <button
                            onClick={() => handleShowBarcode(product)}
                            className="text-purple-600 hover:text-purple-700 p-1"
                            title="Lihat Barcode"
                          >
                            <QrCode size={14} />
                          </button>
                        )}
                        {/* Edit button for all products (local and Shopee) */}
                        {!product.isGrouped && (
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-700 p-1"
                            title="Edit Produk"
                          >
                            <Edit size={14} />
                          </button>
                        )}
                        {/* Delete button only for non-Shopee products */}
                        {product.source !== 'shopee' && !product.isGrouped && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Hapus Produk"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {/* Link to Shopee for Shopee products */}
                        {product.source === 'shopee' && (
                          <a
                            href={`https://shopee.co.id/product/${product.shopeeItemId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 p-1"
                            title="Lihat di Shopee"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Variant Rows (shown when expanded) */}
                  {product.isGrouped && expandedProducts[product.id] && product.variants.map((variant, idx) => (
                    <tr key={variant.id} className="bg-blue-50/50 hover:bg-blue-100/70 border-l-4 border-blue-300">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 pl-7">
                          <div className="w-8 h-8 rounded overflow-hidden bg-white border-2 border-blue-200 flex items-center justify-center">
                            {variant.image ? (
                              <img 
                                src={variant.image} 
                                alt={variant.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div className={`w-full h-full items-center justify-center text-gray-400 ${variant.image ? 'hidden' : 'flex'}`}>
                              <ImageIcon size={12} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap font-mono text-xs text-gray-600 truncate max-w-[96px]" title={variant.sku}>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-blue-200">{variant.sku || '-'}</span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400 text-sm font-bold">↳</span>
                          <p className="text-sm font-medium text-gray-800">{variant.variantName || variant.name}</p>
                          <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded border border-blue-200">Varian {idx + 1}</span>
                          {/* Edit button - inline with variant name */}
                          <button
                            onClick={() => handleEdit(variant)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 rounded border border-blue-200"
                            title="Edit Varian"
                          >
                            <Edit size={10} />
                            Edit
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="badge badge-info text-xs">{variant.category}</span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className="badge bg-gray-100 text-gray-600 text-xs">Varian</span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right text-gray-600 text-xs">
                        Rp {(variant.costPrice || variant.cost || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right font-semibold text-xs">
                        Rp {(variant.price || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <span className="font-semibold text-green-600 text-xs">
                          Rp {((variant.price || 0) - (variant.costPrice || variant.cost || 0)).toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        <span className={`font-semibold text-xs ${
                          variant.stock <= (variant.minStock || 5) ? 'text-red-600' :
                          variant.stock <= (variant.minStock || 5) * 2 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {variant.stock || 0}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-center">
                        {variant.stock <= (variant.minStock || 5) ? (
                          <span className="badge badge-danger text-xs">Rendah</span>
                        ) : (
                          <span className="badge badge-success text-xs">OK</span>
                        )}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-right">
                        <div className="flex gap-1 justify-end">
                          {/* Edit button for variants */}
                          <button
                            onClick={() => handleEdit(variant)}
                            className="text-blue-500 hover:text-blue-600 p-1"
                            title="Edit Varian"
                          >
                            <Edit size={14} />
                          </button>
                          {variant.source === 'shopee' && (
                            <a
                              href={`https://shopee.co.id/product/${variant.shopeeItemId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-500 hover:text-orange-600 p-1"
                              title="Lihat di Shopee"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                Menampilkan <span className="font-medium">{startIndex + 1}</span> - <span className="font-medium">{Math.min(endIndex, totalProducts)}</span> dari <span className="font-medium">{totalProducts}</span> produk
              </div>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="input py-1 px-2 text-sm"
              >
                <option value={10}>10 per halaman</option>
                <option value={20}>20 per halaman</option>
                <option value={50}>50 per halaman</option>
                <option value={100}>100 per halaman</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Pertama
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm border rounded ${
                        currentPage === pageNum
                          ? 'bg-primary text-white border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowModal(false)
            setEditingProduct(null)
          }}
          onSubmit={handleSubmit}
          onManageCategories={() => setShowCategoryModal(true)}
          onManageUnits={() => setShowUnitModal(true)}
        />
      )}

      {showCategoryModal && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {showUnitModal && (
        <ManageUnitsModal
          onClose={() => setShowUnitModal(false)}
        />
      )}
    </div>
  )
}

function ProductModal({ product, categories, onClose, onSubmit, onManageCategories, onManageUnits }) {
  const { products, units } = useProductStore()
  const [syncToMarketplace, setSyncToMarketplace] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)
  const [formData, setFormData] = useState(product || {
    sku: generateSKU(),
    name: '',
    category: categories[0],
    costPrice: '',
    price: '',
    stock: '',
    minStock: '',
    unit: 'pcs',
    barcode: generateBarcode(),
    isPackage: false,
    hasVariants: false,
    variants: [],
    photos: [],
    packageItems: []
  })
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [productSearchTerm, setProductSearchTerm] = useState('')
  const [showVariantModal, setShowVariantModal] = useState(false)

  // Fungsi untuk capitalize setiap kata
  const capitalizeWords = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  // Fungsi format Rupiah
  const formatRupiah = (value) => {
    const number = value.toString().replace(/\D/g, '')
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const parseRupiah = (value) => {
    return parseInt(value.toString().replace(/\D/g, '')) || 0
  }

  const handlePhotoUpload = (e, index) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newPhotos = [...(formData.photos || [])]
        newPhotos[index] = reader.result
        setFormData({ ...formData, photos: newPhotos })
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = (index) => {
    const newPhotos = [...(formData.photos || [])]
    newPhotos[index] = null
    setFormData({ ...formData, photos: newPhotos })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Hitung total dari varian (jika ada)
    const variantTotalStock = formData.hasVariants && formData.variants ? 
      formData.variants.reduce((sum, v) => sum + parseInt(v.stock || 0), 0) : 0
    
    const variantTotalCost = formData.hasVariants && formData.variants && formData.variants.length > 0 ?
      formData.variants.reduce((sum, v) => {
        const stock = parseInt(v.stock || 0)
        const cost = parseFloat(v.costPrice || 0)
        return sum + (stock * cost)
      }, 0) / (variantTotalStock || 1) : 0

    const variantAvgPrice = formData.hasVariants && formData.variants && formData.variants.length > 0 ?
      formData.variants.reduce((sum, v) => {
        const stock = parseInt(v.stock || 0)
        const price = parseFloat(v.price || 0)
        return sum + (stock * price)
      }, 0) / (variantTotalStock || 1) : 0
    
    // Hitung modal paket otomatis jika paket
    let calculatedCostPrice = parseFloat(formData.costPrice) || 0
    let calculatedPrice = parseFloat(formData.price) || 0
    let calculatedStock = parseInt(formData.stock) || 0
    let calculatedMinStock = parseInt(formData.minStock) || 0
    
    if (formData.isPackage && formData.packageItems && formData.packageItems.length > 0) {
      calculatedCostPrice = formData.packageItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.id)
        return sum + ((product?.costPrice || 0) * item.qty)
      }, 0)
    }
    
    // Gunakan nilai varian jika ada varian
    if (formData.hasVariants && formData.variants && formData.variants.length > 0) {
      calculatedStock = variantTotalStock
      calculatedCostPrice = variantTotalCost
      calculatedPrice = variantAvgPrice
      calculatedMinStock = variantTotalMinStock
    }
    
    const finalData = {
      ...formData,
      costPrice: calculatedCostPrice,
      price: calculatedPrice,
      stock: calculatedStock,
      minStock: calculatedMinStock
    }
    
    // Sync to Marketplace if enabled and product is from marketplace
    if (syncToMarketplace && product && ['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(product.source)) {
      setSyncing(true)
      const platformName = product.source.charAt(0).toUpperCase() + product.source.slice(1)
      setSyncMessage({ type: 'info', text: `Menyinkronkan ke ${platformName}...` })
      
      console.log('🔄 Starting marketplace sync...', {
        platform: product.source,
        productId: product.shopeeItemId || product.lazadaItemId || product.tokopediaProductId || product.tiktokProductId,
        updates: {
          name: formData.name,
          price: calculatedPrice,
          stock: calculatedStock,
          sku: formData.sku
        }
      })
      
      try {
        // Get marketplace store credentials from localStorage
        const storeData = JSON.parse(localStorage.getItem('marketplace_stores') || '[]')
        const store = storeData.find(s => s.platform === product.source && s.isActive)
        
        console.log('📦 Store data:', store ? 'Found' : 'Not found', store)
        
        if (!store) {
          const errorMsg = `Toko ${platformName} tidak ditemukan atau tidak aktif`
          setSyncing(false)
          setSyncMessage({ type: 'error', text: `❌ ${errorMsg}` })
          alert(`❌ Gagal Update ke ${platformName}\n\n${errorMsg}\n\nSilakan cek koneksi marketplace di Pengaturan.`)
          setTimeout(() => setSyncMessage(null), 5000)
          onSubmit(finalData)
          return
        }
        
        // Prepare update data
        const updates = {
          name: formData.name,
          price: calculatedPrice,
          stock: calculatedStock,
          sku: formData.sku
        }
        
        // Get product ID and variant ID based on platform
        let productId, variantId
        if (product.source === 'shopee') {
          productId = product.shopeeItemId
          variantId = product.shopeeModelId
        } else if (product.source === 'lazada') {
          productId = product.lazadaItemId
          variantId = product.lazadaSkuId
        } else if (product.source === 'tokopedia') {
          productId = product.tokopediaProductId
          variantId = null
        } else if (product.source === 'tiktok') {
          productId = product.tiktokProductId
          variantId = null
        }
        
        console.log('🚀 Calling marketplace API...', { productId, variantId, updates })
        
        // Call marketplace API to update product
        const result = await marketplaceService.updateProduct(store, productId, variantId, updates)
        
        console.log('📥 API Response:', result)
        
        setSyncing(false)
        
        if (result.success) {
          const successMsg = `✅ Berhasil update ke ${platformName}!`
          setSyncMessage({ type: 'success', text: successMsg })
          alert(`${successMsg}\n\n✅ Nama: ${formData.name}\n✅ Harga: Rp ${calculatedPrice.toLocaleString('id-ID')}\n✅ Stok: ${calculatedStock}\n✅ SKU: ${formData.sku}`)
        } else {
          const errorMsg = result.error || 'Unknown error'
          setSyncMessage({ type: 'error', text: `❌ Gagal update: ${errorMsg}` })
          alert(`❌ Gagal Update ke ${platformName}\n\n${errorMsg}\n\nData lokal tetap tersimpan.`)
        }
      } catch (error) {
        console.error('❌ Marketplace sync error:', error)
        setSyncing(false)
        const errorMsg = error.message || 'Unknown error'
        setSyncMessage({ type: 'error', text: `❌ Gagal update: ${errorMsg}` })
        alert(`❌ Gagal Update ke ${platformName}\n\n${errorMsg}\n\nData lokal tetap tersimpan.`)
      }
      
      // Clear message after 10 seconds
      setTimeout(() => setSyncMessage(null), 10000)
    }
    
    onSubmit(finalData)

    // Reset form untuk produk baru jika bukan edit
    if (!product) {
      setFormData({
        sku: generateSKU(),
        name: '',
        category: categories[0] || '',
        costPrice: '',
        price: '',
        stock: '',
        minStock: '',
        unit: units[0] || 'pcs',
        barcode: generateBarcode(),
        isPackage: false,
        hasVariants: false,
        variants: [],
        photos: [],
        packageItems: []
      })
      setProductSearchTerm('')
    }
  }

  // Hitung total modal paket
  const packageTotalCost = formData.isPackage && formData.packageItems ? 
    formData.packageItems.reduce((sum, item) => {
      const product = products.find(p => p.id === item.id)
      return sum + ((product?.costPrice || 0) * item.qty)
    }, 0) : 0

  // Hitung total dari varian (jika ada)
  const variantTotalStock = formData.hasVariants && formData.variants ? 
    formData.variants.reduce((sum, v) => sum + parseInt(v.stock || 0), 0) : 0
  
  const variantTotalCost = formData.hasVariants && formData.variants && formData.variants.length > 0 ? 
    formData.variants.reduce((sum, v) => sum + (parseFloat(v.costPrice || 0) * parseInt(v.stock || 0)), 0) / variantTotalStock : 0
  
  const variantAvgPrice = formData.hasVariants && formData.variants && formData.variants.length > 0 ? 
    formData.variants.reduce((sum, v) => sum + (parseFloat(v.price || 0) * parseInt(v.stock || 0)), 0) / variantTotalStock : 0
  
  const variantTotalMinStock = formData.hasVariants && formData.variants && formData.variants.length > 0 ? 
    formData.variants.reduce((sum, v) => sum + parseInt(v.minStock || 0), 0) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full h-[95vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold">
              {product ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h3>
            {product?.source === 'shopee' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded">
                <Store size={12} />
                Shopee
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        {/* Sync Message */}
        {syncMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-sm ${
            syncMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            syncMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {syncMessage.text}
          </div>
        )}
        
        {/* Marketplace Sync Option - for all marketplace products */}
        {product && ['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(product.source) && (
          <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToMarketplace}
                onChange={(e) => setSyncToMarketplace(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-blue-600" />
                <span className="font-medium text-blue-800">Update juga ke {product.source.charAt(0).toUpperCase() + product.source.slice(1)}</span>
              </div>
            </label>
            <p className="text-xs text-blue-600 mt-2 ml-8">
              Nama, harga, stok, dan SKU akan diperbarui di marketplace saat menyimpan
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* SKU dan Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">SKU Produk *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="input flex-1"
                  placeholder="SJA123456"
                  required
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sku: generateSKU() })}
                  className="btn btn-secondary"
                  title="Generate SKU"
                >
                  🔄
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Format: SJA + 6 angka</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Barcode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="input flex-1"
                  placeholder="123456789"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, barcode: generateBarcode() })}
                  className="btn btn-secondary"
                  title="Generate Barcode"
                >
                  🔄
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">9 digit angka</p>
            </div>
          </div>

          {/* Nama Produk */}
          <div>
            <label className="block text-sm font-medium mb-2">Nama Produk *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: capitalizeWords(e.target.value) })}
              className="input"
              placeholder="Nama Lengkap Produk"
              required
            />
          </div>

          {/* Tipe Produk */}
          <div>
            <label className="block text-sm font-medium mb-2">Tipe Produk *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.isPackage}
                  onChange={() => setFormData({ ...formData, isPackage: false, packageItems: [] })}
                  className="w-4 h-4"
                />
                <span>Produk Satuan</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.isPackage}
                  onChange={() => setFormData({ ...formData, isPackage: true })}
                  className="w-4 h-4"
                />
                <span>Produk Paket</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.isPackage ? 'Paket berisi beberapa produk bundling' : 'Produk dijual satuan'}
            </p>
          </div>

          {/* Isi Paket - Tampil hanya jika Paket */}
          {formData.isPackage && (
            <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-purple-900">Isi Paket Bundling</h4>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={16} />
                  Tambah Produk
                </button>
              </div>

              {showProductSearch && (
                <div className="mb-4 bg-white rounded-lg p-3 border">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="Cari produk untuk ditambahkan ke paket..."
                      className="input w-full pl-10 text-sm"
                    />
                  </div>

                  <div className="overflow-x-auto max-h-64 overflow-y-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Nama Produk</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Kategori</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Modal</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Harga Jual</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">Qty</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-700">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y">
                        {products
                          .filter(p => !p.isPackage && p.id !== product?.id)
                          .filter(p => 
                            !productSearchTerm || 
                            p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                            (p.sku && p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
                            (p.code && p.code.toLowerCase().includes(productSearchTerm.toLowerCase()))
                          )
                          .map(p => {
                            const inPackage = formData.packageItems?.find(item => item.id === p.id)
                            return (
                              <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-mono text-xs">{p.sku || p.code}</td>
                                <td className="px-3 py-2">
                                  <div>
                                    <p className="font-medium">{p.name}</p>
                                    <p className="text-xs text-gray-500">Stok: {p.stock} {p.unit}</p>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-xs badge badge-info">{p.category}</span>
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  Rp {(p.costPrice || 0).toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold">
                                  Rp {p.price.toLocaleString('id-ID')}
                                </td>
                                <td className="px-3 py-2">
                                  {inPackage ? (
                                    <input
                                      type="number"
                                      min="1"
                                      value={inPackage.qty}
                                      onChange={(e) => {
                                        const newItems = formData.packageItems.map(item =>
                                          item.id === p.id ? { ...item, qty: parseInt(e.target.value) || 1 } : item
                                        )
                                        setFormData({ ...formData, packageItems: newItems })
                                      }}
                                      className="input input-sm w-16 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {inPackage ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          packageItems: formData.packageItems.filter(item => item.id !== p.id)
                                        })
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                      title="Hapus dari paket"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFormData({
                                          ...formData,
                                          packageItems: [...(formData.packageItems || []), { 
                                            id: p.id, 
                                            name: p.name, 
                                            sku: p.sku || p.code, 
                                            costPrice: p.costPrice || 0,
                                            price: p.price, 
                                            qty: 1 
                                          }]
                                        })
                                      }}
                                      className="text-green-600 hover:text-green-700"
                                      title="Tambah ke paket"
                                    >
                                      <Plus size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* List Produk dalam Paket */}
              {formData.packageItems && formData.packageItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-900">Produk dalam Paket ({formData.packageItems.length}):</p>
                  {formData.packageItems.map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.sku} • {item.qty}x</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-gray-600">Modal: Rp {((item.costPrice || 0) * item.qty).toLocaleString('id-ID')}</p>
                          <p className="font-semibold">Harga: Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              packageItems: formData.packageItems.filter((_, i) => i !== index)
                            })
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="bg-purple-100 p-4 rounded border border-purple-300 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-purple-900">Total Modal Paket:</span>
                      <span className="text-lg font-bold text-orange-600">
                        Rp {packageTotalCost.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-purple-900">Total Nilai Jual:</span>
                      <span className="text-lg font-bold text-blue-600">
                        Rp {formData.packageItems.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-purple-300">
                      <span className="font-bold text-purple-900">Margin Paket:</span>
                      <span className="text-xl font-bold text-green-600">
                        Rp {(formData.packageItems.reduce((sum, item) => sum + (item.price * item.qty), 0) - packageTotalCost).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-purple-700 mt-2">
                      💡 Anda bisa set harga jual paket berbeda dari total nilai produk
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Package size={48} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">Belum ada produk dalam paket</p>
                  <p className="text-xs">Klik "Tambah Produk" untuk memulai</p>
                </div>
              )}
            </div>
          )}

          {/* Varian Produk */}
          <div className="border-2 border-dashed border-indigo-300 rounded-lg p-4 bg-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={formData.hasVariants}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      hasVariants: e.target.checked,
                      variants: e.target.checked ? formData.variants : []
                    })
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="hasVariants" className="font-semibold text-indigo-900">
                  Produk Memiliki Varian
                </label>
              </div>
            </div>

            {formData.hasVariants && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={16} />
                  Tambah Varian
                </button>

                {/* List Varian */}
                {formData.variants && formData.variants.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-indigo-900">Varian Tersedia ({formData.variants.length}):</p>
                    <div className="grid grid-cols-1 gap-2">
                      {formData.variants.map((variant, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{variant.name}</p>
                            <p className="text-xs text-gray-500">SKU: {variant.sku} • Barcode: {variant.barcode}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                              <p className="text-gray-600">Modal: Rp {variant.costPrice.toLocaleString('id-ID')}</p>
                              <p className="font-semibold">Harga: Rp {variant.price.toLocaleString('id-ID')}</p>
                              <p className="text-xs text-blue-600">Stok: {variant.stock}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  variants: formData.variants.filter((_, i) => i !== index)
                                })
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-indigo-100 p-4 rounded border border-indigo-300">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-indigo-900">Total Stok Semua Varian:</span>
                        <span className="text-lg font-bold text-indigo-600">
                          {formData.variants.reduce((sum, v) => sum + parseInt(v.stock || 0), 0)} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 bg-white rounded border border-dashed">
                    <Package size={48} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">Belum ada varian</p>
                    <p className="text-xs">Klik "Tambah Varian" untuk memulai</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Foto Produk */}
          <div>
            <label className="block text-sm font-medium mb-2">Foto Produk (Maksimal 3)</label>
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div key={index} className="relative">
                  {formData.photos?.[index] ? (
                    <div className="relative group">
                      <img
                        src={formData.photos[index]}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <ImageIcon size={32} className="text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Upload Foto {index + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, index)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Kategori dan Satuan */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Kategori *</label>
                <button
                  type="button"
                  onClick={onManageCategories}
                  className="text-xs text-primary hover:underline"
                >
                  Kelola Kategori
                </button>
              </div>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Satuan *</label>
                <button
                  type="button"
                  onClick={onManageUnits}
                  className="text-xs text-primary hover:underline"
                >
                  Kelola Satuan
                </button>
              </div>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input"
                required
              >
                <option value="pcs">Pcs</option>
                <option value="kg">Kg</option>
                <option value="liter">Liter</option>
                <option value="box">Box</option>
                <option value="pack">Pack</option>
                <option value="lusin">Lusin</option>
                <option value="gross">Gross</option>
                <option value="roll">Roll</option>
                <option value="porsi">Porsi</option>
                <option value="gelas">Gelas</option>
                <option value="paket">Paket</option>
              </select>
            </div>
          </div>

          {/* Harga Modal dan Harga Jual */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Harga Modal *
                {formData.isPackage && (
                  <span className="text-purple-600 text-xs ml-2">(Otomatis dari isi paket)</span>
                )}
                {formData.hasVariants && formData.variants && formData.variants.length > 0 && (
                  <span className="text-indigo-600 text-xs ml-2">(Rata-rata dari varian)</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="text"
                  value={
                    formData.isPackage ? formatRupiah(packageTotalCost) : 
                    formData.hasVariants && formData.variants && formData.variants.length > 0 ? formatRupiah(Math.round(variantTotalCost)) : 
                    formatRupiah(formData.costPrice || '')
                  }
                  onChange={(e) => setFormData({ ...formData, costPrice: parseRupiah(e.target.value) })}
                  className="input pl-10"
                  placeholder="0"
                  disabled={formData.isPackage || (formData.hasVariants && formData.variants && formData.variants.length > 0)}
                  required
                />
              </div>
              {!formData.isPackage && !formData.hasVariants && (
                <p className="text-xs text-gray-500 mt-1">Harga beli/modal produk</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Harga Jual *
                {formData.isPackage && formData.costPrice && (
                  <span className="text-green-600 text-xs ml-2">
                    (Margin: Rp {(parseFloat(formData.price || 0) - packageTotalCost).toLocaleString('id-ID')})
                  </span>
                )}
                {formData.hasVariants && formData.variants && formData.variants.length > 0 && (
                  <span className="text-indigo-600 text-xs ml-2">(Rata-rata dari varian)</span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="text"
                  value={
                    formData.hasVariants && formData.variants && formData.variants.length > 0 ? formatRupiah(Math.round(variantAvgPrice)) : 
                    formatRupiah(formData.price || '')
                  }
                  onChange={(e) => setFormData({ ...formData, price: parseRupiah(e.target.value) })}
                  className="input pl-10"
                  placeholder="0"
                  disabled={formData.hasVariants && formData.variants && formData.variants.length > 0}
                  required
                />
              </div>
              {!formData.isPackage && !formData.hasVariants && formData.costPrice && formData.price && (
                <p className="text-xs text-gray-500 mt-1">
                  Margin: Rp {(parseFloat(formData.price) - parseFloat(formData.costPrice)).toLocaleString('id-ID')}
                  {' '}({(((parseFloat(formData.price) - parseFloat(formData.costPrice)) / parseFloat(formData.costPrice)) * 100).toFixed(1)}%)
                </p>
              )}
            </div>
          </div>

          {/* Stok */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Stok *
                {formData.hasVariants && formData.variants && formData.variants.length > 0 && (
                  <span className="text-indigo-600 text-xs ml-2">(Total dari semua varian)</span>
                )}
              </label>
              <input
                type="number"
                value={
                  formData.hasVariants && formData.variants && formData.variants.length > 0 ? 
                  variantTotalStock : 
                  formData.stock
                }
                onChange={(e) => {
                  if (!(formData.hasVariants && formData.variants && formData.variants.length > 0)) {
                    setFormData({ ...formData, stock: e.target.value })
                  }
                }}
                className={`input ${formData.hasVariants && formData.variants && formData.variants.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="0"
                disabled={formData.hasVariants && formData.variants && formData.variants.length > 0}
                required={!(formData.hasVariants && formData.variants && formData.variants.length > 0)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Stok Minimum *
                {formData.hasVariants && formData.variants && formData.variants.length > 0 && (
                  <span className="text-indigo-600 text-xs ml-2">(Total dari semua varian)</span>
                )}
              </label>
              <input
                type="number"
                value={
                  formData.hasVariants && formData.variants && formData.variants.length > 0 ? 
                  variantTotalMinStock : 
                  formData.minStock
                }
                onChange={(e) => {
                  if (!(formData.hasVariants && formData.variants && formData.variants.length > 0)) {
                    setFormData({ ...formData, minStock: e.target.value })
                  }
                }}
                className={`input ${formData.hasVariants && formData.variants && formData.variants.length > 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="0"
                disabled={formData.hasVariants && formData.variants && formData.variants.length > 0}
                required={!(formData.hasVariants && formData.variants && formData.variants.length > 0)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button 
              type="submit" 
              className="flex-1 btn btn-primary flex items-center justify-center gap-2"
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Menyinkronkan...
                </>
              ) : (
                <>
                  {syncToMarketplace && product && ['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(product.source) && <Upload size={18} />}
                  {product ? 'Update Produk' : 'Simpan Produk'}
                  {syncToMarketplace && product && ['shopee', 'lazada', 'tokopedia', 'tiktok'].includes(product.source) && ' + Sync'}
                </>
              )}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn btn-secondary">
              Batal
            </button>
          </div>
        </form>

        {/* Variant Modal */}
        {showVariantModal && (
          <AddVariantModal
            productName={formData.name || 'Produk Baru'}
            onClose={() => setShowVariantModal(false)}
            onAdd={(variant) => {
              setFormData({
                ...formData,
                variants: [...(formData.variants || []), variant]
              })
              alert('Varian berhasil ditambahkan!')
            }}
          />
        )}
      </div>
    </div>
  )
}

function ManageCategoriesModal({ categories, onClose }) {
  const [categoryList, setCategoryList] = useState(categories)
  const [newCategory, setNewCategory] = useState('')
  const { addCategory, removeCategory } = useProductStore()

  const handleAdd = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim())
      setCategoryList([...categoryList, newCategory.trim()])
      setNewCategory('')
    }
  }

  const handleDelete = (cat) => {
    if (confirm(`Hapus kategori "${cat}"?`)) {
      removeCategory(cat)
      setCategoryList(categoryList.filter(c => c !== cat))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">Kelola Kategori</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Add New */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nama kategori baru..."
              className="input flex-1"
            />
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus size={20} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {categoryList.map((cat) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{cat}</span>
                <button
                  onClick={() => handleDelete(cat)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={onClose} className="w-full btn btn-secondary">
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

function ManageUnitsModal({ onClose }) {
  const { units, addUnit, removeUnit } = useProductStore()
  const [newUnit, setNewUnit] = useState('')

  const handleAdd = () => {
    if (newUnit.trim() && !units.includes(newUnit.trim())) {
      addUnit(newUnit.trim())
      setNewUnit('')
    }
  }

  const handleDelete = (unit) => {
    if (confirm(`Hapus satuan "${unit}"?`)) {
      removeUnit(unit)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-bold">Kelola Satuan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Add New */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nama satuan baru..."
              className="input flex-1"
            />
            <button onClick={handleAdd} className="btn btn-primary">
              <Plus size={20} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {units.map((unit) => (
                <div key={unit} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{unit}</span>
                  <button
                    onClick={() => handleDelete(unit)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={onClose} className="w-full btn btn-secondary">
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

function AddVariantModal({ onClose, onAdd, productName }) {
  const [variantData, setVariantData] = useState({
    name: '',
    sku: generateSKU(),
    barcode: generateBarcode(),
    costPrice: '',
    price: '',
    stock: '',
    minStock: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onAdd({
      ...variantData,
      costPrice: parseFloat(variantData.costPrice) || 0,
      price: parseFloat(variantData.price) || 0,
      stock: parseInt(variantData.stock) || 0,
      minStock: parseInt(variantData.minStock) || 0
    })
    
    // Reset for next variant
    setVariantData({
      name: '',
      sku: generateSKU(),
      barcode: generateBarcode(),
      costPrice: '',
      price: '',
      stock: '',
      minStock: ''
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
          <div>
            <h3 className="text-xl font-bold">Tambah Varian Produk</h3>
            <p className="text-sm text-gray-600">{productName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Nama Varian <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={variantData.name}
                onChange={(e) => setVariantData({ ...variantData, name: capitalizeWords(e.target.value) })}
                placeholder="Contoh: Hitam - XL, Rasa Coklat, 500ml"
                className="input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Tips: Gabungkan warna/ukuran/rasa dalam satu nama varian
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">SKU Varian</label>
              <input
                type="text"
                value={variantData.sku}
                onChange={(e) => setVariantData({ ...variantData, sku: e.target.value })}
                className="input"
                placeholder="Auto-generate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Barcode</label>
              <input
                type="text"
                value={variantData.barcode}
                onChange={(e) => setVariantData({ ...variantData, barcode: e.target.value })}
                className="input"
                placeholder="Auto-generate"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Harga Modal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="text"
                  value={formatRupiah(variantData.costPrice || '')}
                  onChange={(e) => setVariantData({ ...variantData, costPrice: parseRupiah(e.target.value) })}
                  className="input pl-10"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Harga Jual <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="text"
                  value={formatRupiah(variantData.price || '')}
                  onChange={(e) => setVariantData({ ...variantData, price: parseRupiah(e.target.value) })}
                  className="input pl-10"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stok Awal <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={variantData.stock}
                onChange={(e) => setVariantData({ ...variantData, stock: e.target.value })}
                className="input"
                placeholder="0"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Stok Minimum</label>
              <input
                type="number"
                value={variantData.minStock}
                onChange={(e) => setVariantData({ ...variantData, minStock: e.target.value })}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Preview Margin */}
          {variantData.costPrice && variantData.price && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-medium text-blue-900">Margin Varian:</span>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    Rp {(parseFloat(variantData.price) - parseFloat(variantData.costPrice)).toLocaleString('id-ID')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {((parseFloat(variantData.price) - parseFloat(variantData.costPrice)) / parseFloat(variantData.costPrice) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              <Plus size={20} />
              Tambah Varian
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
