import { useState, useRef, useEffect } from 'react'
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
  CreditCard,
  Users,
  PenTool,
  UserPlus,
  Wallet,
  Eye,
  RotateCcw,
  FileText,
  Printer
} from 'lucide-react'
import { useDebtStore } from '../store/debtStore'
import { useCustomerStore } from '../store/customerStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Signature Pad Component
function SignaturePad({ onSave, onClear, initialSignature }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!initialSignature)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    
    if (initialSignature) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = initialSignature
    }
  }, [initialSignature])

  const getCoords = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    if (hasSignature) {
      const canvas = canvasRef.current
      onSave(canvas.toDataURL('image/png'))
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onClear()
  }

  return (
    <div className="space-y-2">
      <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">Tanda tangan di atas</p>
        <button
          type="button"
          onClick={clearSignature}
          className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
        >
          <RotateCcw size={12} /> Hapus
        </button>
      </div>
    </div>
  )
}

export default function Debts() {
  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [editingDebt, setEditingDebt] = useState(null)
  const [selectedDebt, setSelectedDebt] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('receivable') // receivable, payable, kasbon
  const [amountDisplay, setAmountDisplay] = useState('')
  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('')
  
  // Kasbon states
  const [showKasbonModal, setShowKasbonModal] = useState(false)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  
  // Employee form state
  const [employeeForm, setEmployeeForm] = useState({ name: '', position: '', phone: '', address: '' })
  const [showKasbonPaymentModal, setShowKasbonPaymentModal] = useState(false)
  const [editingKasbon, setEditingKasbon] = useState(null)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [selectedKasbon, setSelectedKasbon] = useState(null)
  const [kasbonAmountDisplay, setKasbonAmountDisplay] = useState('')
  const [kasbonPaymentAmountDisplay, setKasbonPaymentAmountDisplay] = useState('')
  const [signature, setSignature] = useState(null)
  const [paymentSignature, setPaymentSignature] = useState(null)
  const [previewSignature, setPreviewSignature] = useState(null)
  const [debtSignature, setDebtSignature] = useState(null)
  
  const { 
    debts, addDebt, updateDebt, deleteDebt, addPayment, getTotalPayables, getTotalReceivables,
    employees, addEmployee, updateEmployee, deleteEmployee,
    kasbons, addKasbon, updateKasbon, deleteKasbon, addKasbonPayment, getTotalKasbon
  } = useDebtStore()
  const { customers } = useCustomerStore()
  const { user } = useAuthStore()
  const { storeInfo } = useSettingsStore()

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
      signature: debtSignature,
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
    setDebtSignature(null)
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
    setDebtSignature(debt.signature || null)
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

  // ==================== KASBON HANDLERS ====================
  
  // Filter kasbons
  const filteredKasbons = (kasbons || []).filter(kasbon => {
    const matchSearch = kasbon.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       kasbon.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || kasbon.status === filterStatus
    return matchSearch && matchStatus
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const totalKasbon = getTotalKasbon ? getTotalKasbon() : 0

  const handleKasbonAmountChange = (e) => {
    setKasbonAmountDisplay(formatToIDR(e.target.value))
  }

  const handleKasbonPaymentAmountChange = (e) => {
    setKasbonPaymentAmountDisplay(formatToIDR(e.target.value))
  }

  const handleKasbonSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const kasbonData = {
      employeeId: formData.get('employeeId'),
      employeeName: employees.find(emp => emp.id === formData.get('employeeId'))?.name || formData.get('employeeName'),
      description: formData.get('description'),
      amount: parseFromIDR(kasbonAmountDisplay),
      dueDate: formData.get('dueDate'),
      note: formData.get('note'),
      signature: signature,
      createdBy: user?.name || 'Unknown'
    }

    if (editingKasbon) {
      await updateKasbon(editingKasbon.id, kasbonData)
    } else {
      await addKasbon(kasbonData)
    }

    setShowKasbonModal(false)
    setEditingKasbon(null)
    setKasbonAmountDisplay('')
    setSignature(null)
  }

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault()
    
    console.log('📝 Submitting employee form:', employeeForm)

    if (!employeeForm.name || employeeForm.name.trim() === '') {
      alert('Nama karyawan harus diisi!')
      return
    }

    try {
      if (editingEmployee) {
        const result = await updateEmployee(editingEmployee.id, employeeForm)
        console.log('📝 Update result:', result)
      } else {
        const result = await addEmployee(employeeForm)
        console.log('📝 Add result:', result)
      }
      
      setShowEmployeeModal(false)
      setEditingEmployee(null)
      setEmployeeForm({ name: '', position: '', phone: '', address: '' })
    } catch (error) {
      console.error('❌ Error saving employee:', error)
      alert('Gagal menyimpan karyawan: ' + error.message)
    }
  }

  const handleKasbonPaymentSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    
    const paymentData = {
      amount: parseFromIDR(kasbonPaymentAmountDisplay),
      date: formData.get('date'),
      note: formData.get('note'),
      signature: paymentSignature
    }

    await addKasbonPayment(selectedKasbon.id, paymentData)
    setShowKasbonPaymentModal(false)
    setSelectedKasbon(null)
    setKasbonPaymentAmountDisplay('')
    setPaymentSignature(null)
  }

  const handleEditKasbon = (kasbon) => {
    setEditingKasbon(kasbon)
    setKasbonAmountDisplay(kasbon.amount ? kasbon.amount.toLocaleString('id-ID') : '')
    setSignature(kasbon.signature)
    setShowKasbonModal(true)
  }

  const handleDeleteKasbon = async (id) => {
    if (confirm('Hapus data kasbon ini?')) {
      await deleteKasbon(id)
    }
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setShowEmployeeModal(true)
  }

  const handleDeleteEmployee = async (id) => {
    const hasKasbon = kasbons.some(k => k.employeeId === id && k.status !== 'paid')
    if (hasKasbon) {
      alert('Tidak dapat menghapus karyawan yang masih memiliki kasbon belum lunas!')
      return
    }
    if (confirm('Hapus data karyawan ini?')) {
      await deleteEmployee(id)
    }
  }

  const handleAddKasbonPayment = (kasbon) => {
    setSelectedKasbon(kasbon)
    setShowKasbonPaymentModal(true) 
  }

  const exportToCSV = () => {
    let headers, rows, filename
    
    if (activeTab === 'kasbon') {
      // Export Kasbon Karyawan
      headers = ['Nama Karyawan', 'Deskripsi', 'Jumlah', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status', 'Tanggal']
      rows = filteredKasbons.map(k => [
        k.employeeName || '',
        k.description || '',
        k.amount || 0,
        k.paidAmount || 0,
        (k.amount || 0) - (k.paidAmount || 0),
        k.dueDate ? new Date(k.dueDate).toLocaleDateString('id-ID') : '',
        k.status === 'paid' ? 'Lunas' : k.status === 'partial' ? 'Sebagian' : 'Belum Bayar',
        k.createdAt ? new Date(k.createdAt).toLocaleDateString('id-ID') : ''
      ])
      filename = `kasbon-karyawan-${new Date().toISOString().split('T')[0]}.csv`
    } else {
      // Export Hutang/Piutang
      headers = ['Tipe', 'Nama', 'Telepon', 'Deskripsi', 'Jumlah', 'Dibayar', 'Sisa', 'Jatuh Tempo', 'Status']
      rows = filteredDebts.map(d => [
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
      filename = `hutang-piutang-${new Date().toISOString().split('T')[0]}.csv`
    }
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 20
    
    // Header - skip logo untuk menghindari error
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(storeInfo?.name || 'POS & Inventory System', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    if (storeInfo?.address) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      // Split address by newlines and render each line
      const addressLines = storeInfo.address.split('\n')
      addressLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), pageWidth / 2, yPos, { align: 'center' })
          yPos += 5
        }
      })
    }
    
    if (storeInfo?.phone) {
      doc.setFontSize(9)
      doc.text(`Telp: ${storeInfo.phone}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    
    // Garis pemisah
    yPos += 3
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 8
    
    // Judul laporan
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const title = activeTab === 'kasbon' ? 'Laporan Kasbon Karyawan' : 
                  activeTab === 'receivable' ? 'Laporan Piutang' : 'Laporan Hutang'
    doc.text(title, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 10
    
    if (activeTab === 'kasbon') {
      // Export Kasbon dengan tanda tangan
      filteredKasbons.forEach((kasbon, index) => {
        // Cek apakah perlu halaman baru
        if (yPos > 250) {
          doc.addPage()
          yPos = 15
        }
        
        const remaining = (kasbon.amount || 0) - (kasbon.paidAmount || 0)
        
        // Box untuk setiap kasbon
        doc.setDrawColor(200)
        doc.setLineWidth(0.3)
        doc.roundedRect(14, yPos, pageWidth - 28, kasbon.signature ? 55 : 35, 2, 2)
        
        // Info kasbon
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(`${index + 1}. ${kasbon.employeeName || '-'}`, 18, yPos + 7)
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Keterangan: ${kasbon.description || '-'}`, 18, yPos + 13)
        doc.text(`Tanggal: ${kasbon.createdAt ? new Date(kasbon.createdAt).toLocaleDateString('id-ID') : '-'}`, 18, yPos + 19)
        
        // Kolom kanan - nominal
        doc.text(`Jumlah: Rp ${(kasbon.amount || 0).toLocaleString('id-ID')}`, pageWidth - 70, yPos + 7)
        doc.text(`Dibayar: Rp ${(kasbon.paidAmount || 0).toLocaleString('id-ID')}`, pageWidth - 70, yPos + 13)
        doc.setFont('helvetica', 'bold')
        doc.text(`Sisa: Rp ${remaining.toLocaleString('id-ID')}`, pageWidth - 70, yPos + 19)
        
        const statusText = kasbon.status === 'paid' ? 'LUNAS' : kasbon.status === 'partial' ? 'SEBAGIAN' : 'BELUM BAYAR'
        doc.setFontSize(8)
        doc.text(`Status: ${statusText}`, pageWidth - 70, yPos + 25)
        
        // Tanda tangan
        if (kasbon.signature) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.text('Tanda Tangan:', 18, yPos + 28)
          try {
            doc.addImage(kasbon.signature, 'PNG', 18, yPos + 30, 40, 20)
          } catch (e) {
            doc.text('(Tidak dapat dimuat)', 18, yPos + 38)
          }
        }
        
        yPos += kasbon.signature ? 60 : 40
      })
      
      // Total
      if (yPos > 260) {
        doc.addPage()
        yPos = 15
      }
      doc.setLineWidth(0.5)
      doc.line(14, yPos, pageWidth - 14, yPos)
      yPos += 8
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      const totalKasbonAmount = filteredKasbons.reduce((sum, k) => sum + ((k.amount || 0) - (k.paidAmount || 0)), 0)
      doc.text(`Total Kasbon Belum Lunas: Rp ${totalKasbonAmount.toLocaleString('id-ID')}`, 14, yPos)
      
    } else {
      // Export Hutang/Piutang dengan tabel
      const tableData = filteredDebts.map(d => [
        d.personName || '-',
        d.description || '-',
        `Rp ${(d.amount || 0).toLocaleString('id-ID')}`,
        `Rp ${(d.paidAmount || 0).toLocaleString('id-ID')}`,
        `Rp ${((d.amount || 0) - (d.paidAmount || 0)).toLocaleString('id-ID')}`,
        d.status === 'paid' ? 'Lunas' : d.status === 'partial' ? 'Sebagian' : 'Belum Bayar'
      ])
      
      doc.autoTable({
        startY: yPos,
        head: [['Nama', 'Deskripsi', 'Jumlah', 'Dibayar', 'Sisa', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 28, halign: 'right' },
          5: { cellWidth: 20, halign: 'center' }
        }
      })
      
      // Total
      const finalY = doc.lastAutoTable.finalY + 8
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      const total = filteredDebts.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0)
      doc.text(`Total ${activeTab === 'receivable' ? 'Piutang' : 'Hutang'}: Rp ${total.toLocaleString('id-ID')}`, 14, finalY)
    }
    
    // Save PDF
    const filename = activeTab === 'kasbon' 
      ? `kasbon-karyawan-${new Date().toISOString().split('T')[0]}.pdf`
      : `${activeTab === 'receivable' ? 'piutang' : 'hutang'}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  }

  // Helper function to get image format from base64
  const getImageFormat = (base64String) => {
    if (!base64String) return null
    if (base64String.includes('data:image/png')) return 'PNG'
    if (base64String.includes('data:image/jpeg') || base64String.includes('data:image/jpg')) return 'JPEG'
    if (base64String.includes('data:image/gif')) return 'GIF'
    if (base64String.includes('data:image/webp')) return 'WEBP'
    // Default to PNG for canvas toDataURL output
    return 'PNG'
  }

  const printKasbon = (kasbon) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 20
    
    // Header - nama toko (skip logo untuk menghindari error)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(storeInfo?.name || 'POS & Inventory System', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    if (storeInfo?.address) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      // Split address by newlines and render each line
      const addressLines = storeInfo.address.split('\n')
      addressLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), pageWidth / 2, yPos, { align: 'center' })
          yPos += 5
        }
      })
    }
    
    if (storeInfo?.phone) {
      doc.setFontSize(9)
      doc.text(`Telp: ${storeInfo.phone}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    
    // Garis pemisah
    yPos += 3
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 10
    
    // Judul
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('BUKTI KASBON KARYAWAN', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`No: KSB-${kasbon.id?.slice(-8).toUpperCase() || Date.now()}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 12
    
    // Info kasbon
    const remaining = (kasbon.amount || 0) - (kasbon.paidAmount || 0)
    const statusText = kasbon.status === 'paid' ? 'LUNAS' : kasbon.status === 'partial' ? 'SEBAGIAN DIBAYAR' : 'BELUM BAYAR'
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Nama Karyawan:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(kasbon.employeeName || '-', 60, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Tanggal:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(kasbon.createdAt ? new Date(kasbon.createdAt).toLocaleDateString('id-ID') : '-', 60, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Keterangan:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(kasbon.description || '-', 60, yPos)
    yPos += 7
    
    if (kasbon.dueDate) {
      doc.setFont('helvetica', 'bold')
      doc.text('Jatuh Tempo:', 14, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(kasbon.dueDate).toLocaleDateString('id-ID'), 60, yPos)
      yPos += 7
    }
    
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 8
    
    // Nominal
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Jumlah Kasbon:', 14, yPos)
    doc.text(`Rp ${(kasbon.amount || 0).toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.setFont('helvetica', 'normal')
    doc.text('Sudah Dibayar:', 14, yPos)
    doc.text(`Rp ${(kasbon.paidAmount || 0).toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Sisa:', 14, yPos)
    doc.text(`Rp ${remaining.toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.text('Status:', 14, yPos)
    doc.text(statusText, pageWidth - 14, yPos, { align: 'right' })
    yPos += 10
    
    doc.setLineWidth(0.3)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 15
    
    // Tanda tangan
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Kolom kiri - Peminjam
    doc.text('Peminjam,', 40, yPos, { align: 'center' })
    
    // Kolom kanan - Penyetuju
    doc.text('Disetujui oleh,', pageWidth - 40, yPos, { align: 'center' })
    yPos += 5
    
    // Draw signature boxes (skip actual image to avoid PDF errors)
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.rect(20, yPos, 40, 20)
    doc.rect(pageWidth - 60, yPos, 40, 20)
    
    // Add text if signature exists
    if (kasbon.signature) {
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text('(TTD tersedia)', 40, yPos + 12, { align: 'center' })
      doc.setTextColor(0)
    }
    
    yPos += 25
    
    // Nama di bawah tanda tangan
    doc.setFont('helvetica', 'bold')
    doc.text(`( ${kasbon.employeeName || '...................'} )`, 40, yPos, { align: 'center' })
    doc.text('( .................... )', pageWidth - 40, yPos, { align: 'center' })
    
    yPos += 15
    
    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, yPos, { align: 'center' })
    
    // Save PDF
    doc.save(`kasbon-${kasbon.employeeName?.replace(/\s+/g, '-') || 'karyawan'}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const printDebt = (debt) => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 20
    
    // Header - nama toko
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(storeInfo?.name || 'POS & Inventory System', pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    if (storeInfo?.address) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      const addressLines = storeInfo.address.split('\n')
      addressLines.forEach(line => {
        if (line.trim()) {
          doc.text(line.trim(), pageWidth / 2, yPos, { align: 'center' })
          yPos += 5
        }
      })
    }
    
    if (storeInfo?.phone) {
      doc.setFontSize(9)
      doc.text(`Telp: ${storeInfo.phone}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    
    // Garis pemisah
    yPos += 3
    doc.setLineWidth(0.5)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 10
    
    // Judul
    const debtType = debt.type === 'receivable' ? 'PIUTANG' : 'HUTANG'
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`BUKTI ${debtType}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 8
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`No: ${debt.type === 'receivable' ? 'PIU' : 'HUT'}-${debt.id?.slice(-8).toUpperCase() || Date.now()}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 12
    
    // Info debt
    const remaining = (debt.amount || 0) - (debt.paidAmount || 0)
    const statusText = debt.status === 'paid' ? 'LUNAS' : debt.status === 'partial' ? 'SEBAGIAN DIBAYAR' : 'BELUM BAYAR'
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(debt.type === 'receivable' ? 'Nama Pelanggan:' : 'Nama Supplier:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(debt.personName || '-', 65, yPos)
    yPos += 7
    
    if (debt.personPhone) {
      doc.setFont('helvetica', 'bold')
      doc.text('Telepon:', 14, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(debt.personPhone, 65, yPos)
      yPos += 7
    }
    
    doc.setFont('helvetica', 'bold')
    doc.text('Tanggal:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(debt.createdAt ? new Date(debt.createdAt).toLocaleDateString('id-ID') : '-', 65, yPos)
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Keterangan:', 14, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(debt.description || '-', 65, yPos)
    yPos += 7
    
    if (debt.dueDate) {
      doc.setFont('helvetica', 'bold')
      doc.text('Jatuh Tempo:', 14, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(debt.dueDate).toLocaleDateString('id-ID'), 65, yPos)
      yPos += 7
    }
    
    yPos += 5
    doc.setLineWidth(0.3)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 8
    
    // Nominal
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Jumlah ${debtType}:`, 14, yPos)
    doc.text(`Rp ${(debt.amount || 0).toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.setFont('helvetica', 'normal')
    doc.text('Sudah Dibayar:', 14, yPos)
    doc.text(`Rp ${(debt.paidAmount || 0).toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.setFont('helvetica', 'bold')
    doc.text('Sisa:', 14, yPos)
    doc.text(`Rp ${remaining.toLocaleString('id-ID')}`, pageWidth - 14, yPos, { align: 'right' })
    yPos += 7
    
    doc.text('Status:', 14, yPos)
    doc.text(statusText, pageWidth - 14, yPos, { align: 'right' })
    yPos += 10
    
    doc.setLineWidth(0.3)
    doc.line(14, yPos, pageWidth - 14, yPos)
    yPos += 15
    
    // Tanda tangan
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Kolom kiri
    doc.text(debt.type === 'receivable' ? 'Pelanggan,' : 'Supplier,', 40, yPos, { align: 'center' })
    
    // Kolom kanan
    doc.text('Hormat Kami,', pageWidth - 40, yPos, { align: 'center' })
    yPos += 5
    
    // Draw signature boxes
    doc.setDrawColor(200)
    doc.setLineWidth(0.2)
    doc.rect(20, yPos, 40, 20)
    doc.rect(pageWidth - 60, yPos, 40, 20)
    
    yPos += 25
    
    // Nama di bawah tanda tangan
    doc.setFont('helvetica', 'bold')
    doc.text(`( ${debt.personName || '...................'} )`, 40, yPos, { align: 'center' })
    doc.text('( .................... )', pageWidth - 40, yPos, { align: 'center' })
    
    yPos += 15
    
    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, yPos, { align: 'center' })
    
    // Save PDF
    const typePrefix = debt.type === 'receivable' ? 'piutang' : 'hutang'
    doc.save(`${typePrefix}-${debt.personName?.replace(/\s+/g, '-') || 'data'}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hutang & Piutang</h1>
          <p className="text-gray-600">Kelola hutang ke supplier dan piutang dari pelanggan</p>
        </div>
        {activeTab !== 'kasbon' && (
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
        )}
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
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveTab('receivable')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'receivable' 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ArrowDownCircle size={18} className="inline mr-2" />
          Piutang
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
          Hutang
        </button>
        <button
          onClick={() => setActiveTab('kasbon')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'kasbon' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Wallet size={18} className="inline mr-2" />
          Kasbon Karyawan
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
            CSV
          </button>
          <button onClick={exportToPDF} className="btn btn-outline">
            <FileText size={20} />
            PDF
          </button>
        </div>
      </div>

      {/* Kasbon Karyawan Section */}
      {activeTab === 'kasbon' ? (
        <>
          {/* Kasbon Summary */}
          <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Wallet size={24} />
                </div>
                <div>
                  <p className="text-sm opacity-90">Total Kasbon Belum Lunas</p>
                  <p className="text-2xl font-bold">Rp {totalKasbon.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingEmployee(null)
                    setEmployeeForm({ name: '', position: '', phone: '', address: '' })
                    setShowEmployeeModal(true)
                  }}
                  className="btn bg-white/20 hover:bg-white/30 text-white"
                >
                  <UserPlus size={18} />
                  Tambah Karyawan
                </button>
                <button
                  onClick={() => {
                    setEditingKasbon(null)
                    setKasbonAmountDisplay('')
                    setSignature(null)
                    setShowKasbonModal(true)
                  }}
                  className="btn bg-white text-purple-600 hover:bg-purple-50"
                >
                  <Plus size={18} />
                  Tambah Kasbon
                </button>
              </div>
            </div>
          </div>

          {/* Employees List */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} />
              Daftar Karyawan ({employees?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(employees || []).map(emp => {
                const empKasbons = kasbons?.filter(k => k.employeeId === emp.id) || []
                const unpaidKasbon = empKasbons.reduce((sum, k) => sum + ((k.amount || 0) - (k.paidAmount || 0)), 0)
                return (
                  <div key={emp.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.position || 'Karyawan'}</p>
                        {emp.phone && <p className="text-xs text-gray-400">{emp.phone}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditEmployee(emp)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {unpaidKasbon > 0 && (
                      <p className="text-xs text-red-600 mt-2">Kasbon: Rp {unpaidKasbon.toLocaleString('id-ID')}</p>
                    )}
                  </div>
                )
              })}
              {(!employees || employees.length === 0) && (
                <div className="col-span-full text-center py-4 text-gray-500">
                  Belum ada data karyawan
                </div>
              )}
            </div>
          </div>

          {/* Kasbon Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Karyawan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keterangan</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dibayar</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sisa</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">TTD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredKasbons.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                        <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Belum ada data kasbon</p>
                      </td>
                    </tr>
                  ) : (
                    filteredKasbons.map((kasbon) => {
                      const remaining = (kasbon.amount || 0) - (kasbon.paidAmount || 0)
                      return (
                        <tr key={kasbon.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium">{kasbon.employeeName}</span>
                            <p className="text-xs text-gray-500">{new Date(kasbon.createdAt).toLocaleDateString('id-ID')}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-sm">{kasbon.description || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold">Rp {(kasbon.amount || 0).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-3 text-right text-green-600">Rp {(kasbon.paidAmount || 0).toLocaleString('id-ID')}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Rp {remaining.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {kasbon.signature ? (
                              <button
                                onClick={() => setPreviewSignature(kasbon.signature)}
                                className="p-1 hover:bg-purple-50 rounded border border-gray-200"
                                title="Klik untuk memperbesar"
                              >
                                <img 
                                  src={kasbon.signature} 
                                  alt="TTD" 
                                  className="w-12 h-8 object-contain"
                                />
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">Tidak ada</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(kasbon.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => printKasbon(kasbon)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                                title="Print Kasbon"
                              >
                                <Printer size={14} />
                              </button>
                              {kasbon.status !== 'paid' && (
                                <button
                                  onClick={() => handleAddKasbonPayment(kasbon)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                  title="Tambah Pembayaran"
                                >
                                  <DollarSign size={14} />
                                </button>
                              )}
                              <button onClick={() => handleEditKasbon(kasbon)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDeleteKasbon(kasbon.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={14} />
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
        </>
      ) : (
        <>
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">TTD</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jatuh Tempo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDebts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
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
                      <td className="px-4 py-3 text-center">
                        {debt.signature ? (
                          <button
                            onClick={() => setPreviewSignature(debt.signature)}
                            className="p-1 hover:bg-purple-50 rounded border border-gray-200"
                            title="Klik untuk memperbesar"
                          >
                            <img 
                              src={debt.signature} 
                              alt="TTD" 
                              className="w-12 h-8 object-contain"
                            />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">Tidak ada</span>
                        )}
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
                          <button
                            onClick={() => printDebt(debt)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>
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
        </>
      )}

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
              <div>
                <label className="block text-sm font-medium mb-1">Tanda Tangan</label>
                <SignaturePad
                  onSave={(sig) => setDebtSignature(sig)}
                  onClear={() => setDebtSignature(null)}
                  initialSignature={debtSignature}
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
                    setDebtSignature(null)
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

      {/* Add/Edit Employee Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">
                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan'}
              </h3>
              <button onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEmployeeSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Karyawan *</label>
                <input 
                  type="text" 
                  value={employeeForm.name}
                  onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                  required 
                  className="input" 
                  placeholder="Nama lengkap" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jabatan</label>
                <input 
                  type="text" 
                  value={employeeForm.position}
                  onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})}
                  className="input" 
                  placeholder="Contoh: Kasir, Staff, dll" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">No. Telepon</label>
                <input 
                  type="text" 
                  value={employeeForm.phone}
                  onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                  className="input" 
                  placeholder="08xxxxxxxxxx" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alamat</label>
                <textarea 
                  value={employeeForm.address}
                  onChange={(e) => setEmployeeForm({...employeeForm, address: e.target.value})}
                  className="input" 
                  rows="2" 
                  placeholder="Alamat (opsional)" 
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn btn-primary">
                  {editingEmployee ? 'Simpan' : 'Tambah'}
                </button>
                <button type="button" onClick={() => { setShowEmployeeModal(false); setEditingEmployee(null); setEmployeeForm({ name: '', position: '', phone: '', address: '' }) }} className="flex-1 btn btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Kasbon Modal */}
      {showKasbonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Wallet size={24} className="text-purple-600" />
                {editingKasbon ? 'Edit Kasbon' : 'Tambah Kasbon Karyawan'}
              </h3>
              <button onClick={() => { setShowKasbonModal(false); setEditingKasbon(null); setSignature(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleKasbonSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div>
                <label className="block text-sm font-medium mb-1">Karyawan *</label>
                <select name="employeeId" defaultValue={editingKasbon?.employeeId} required className="input">
                  <option value="">-- Pilih Karyawan --</option>
                  {(employees || []).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.position || 'Karyawan'}</option>
                  ))}
                </select>
                {(!employees || employees.length === 0) && (
                  <p className="text-xs text-red-500 mt-1">Belum ada karyawan. Tambah karyawan terlebih dahulu.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keterangan *</label>
                <input type="text" name="description" defaultValue={editingKasbon?.description} required className="input" placeholder="Contoh: Pinjaman untuk keperluan keluarga" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jumlah Kasbon *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input type="text" value={kasbonAmountDisplay} onChange={handleKasbonAmountChange} required className="input pl-10 text-right" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jatuh Tempo (Opsional)</label>
                <input type="date" name="dueDate" defaultValue={editingKasbon?.dueDate?.split('T')[0]} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <textarea name="note" defaultValue={editingKasbon?.note} className="input" rows="2" placeholder="Catatan tambahan (opsional)" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <PenTool size={16} className="text-purple-600" />
                  Tanda Tangan Karyawan
                </label>
                <SignaturePad 
                  onSave={(sig) => setSignature(sig)} 
                  onClear={() => setSignature(null)}
                  initialSignature={editingKasbon?.signature}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn btn-primary bg-purple-600 hover:bg-purple-700">{editingKasbon ? 'Simpan' : 'Tambah Kasbon'}</button>
                <button type="button" onClick={() => { setShowKasbonModal(false); setEditingKasbon(null); setSignature(null) }} className="flex-1 btn btn-secondary">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kasbon Payment Modal */}
      {showKasbonPaymentModal && selectedKasbon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-bold">Pembayaran Kasbon</h3>
              <button onClick={() => { setShowKasbonPaymentModal(false); setSelectedKasbon(null); setPaymentSignature(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 bg-purple-50 border-b">
              <p className="font-medium">{selectedKasbon.employeeName}</p>
              <p className="text-sm text-gray-600">{selectedKasbon.description}</p>
              <div className="mt-2 flex justify-between text-sm">
                <span>Total: <strong>Rp {(selectedKasbon.amount || 0).toLocaleString('id-ID')}</strong></span>
                <span>Sisa: <strong className="text-red-600">Rp {((selectedKasbon.amount || 0) - (selectedKasbon.paidAmount || 0)).toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
            <form onSubmit={handleKasbonPaymentSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div>
                <label className="block text-sm font-medium mb-1">Jumlah Bayar *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input type="text" value={kasbonPaymentAmountDisplay} onChange={handleKasbonPaymentAmountChange} required className="input pl-10 text-right" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tanggal Bayar *</label>
                <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Catatan</label>
                <input type="text" name="note" className="input" placeholder="Contoh: Potong gaji" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                  <PenTool size={16} className="text-purple-600" />
                  Tanda Tangan Penerima
                </label>
                <SignaturePad 
                  onSave={(sig) => setPaymentSignature(sig)} 
                  onClear={() => setPaymentSignature(null)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 btn btn-success">Simpan Pembayaran</button>
                <button type="button" onClick={() => { setShowKasbonPaymentModal(false); setSelectedKasbon(null); setPaymentSignature(null) }} className="flex-1 btn btn-secondary">Batal</button>
              </div>
            </form>
            {/* Payment History */}
            {selectedKasbon.payments && selectedKasbon.payments.length > 0 && (
              <div className="p-4 border-t">
                <h4 className="font-medium mb-2">Riwayat Pembayaran</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedKasbon.payments.map((payment, index) => (
                    <div key={payment.id || index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                      <span>{new Date(payment.date).toLocaleDateString('id-ID')}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 font-medium">Rp {(payment.amount || 0).toLocaleString('id-ID')}</span>
                        {payment.signature && (
                          <button onClick={() => setPreviewSignature(payment.signature)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Lihat TTD">
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature Preview Modal */}
      {previewSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-4" onClick={() => setPreviewSignature(null)}>
          <div className="bg-white rounded-xl p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2">
                <PenTool size={20} className="text-purple-600" />
                Tanda Tangan
              </h3>
              <button onClick={() => setPreviewSignature(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white">
              <img src={previewSignature} alt="Tanda Tangan" className="w-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
