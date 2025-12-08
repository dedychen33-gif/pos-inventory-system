export default function Purchase() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pembelian</h1>
        <p className="text-gray-600 mt-1">Kelola purchase order dan penerimaan barang</p>
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Modul Pembelian</h3>
        <p className="text-gray-600 mb-4">
          Fitur manajemen pembelian mencakup:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Purchase Order (PO) ke supplier</li>
          <li>Penerimaan barang</li>
          <li>Retur ke supplier</li>
          <li>Riwayat pembelian</li>
        </ul>
        <p className="text-sm text-gray-500 mt-4">
          Fitur ini akan segera hadir dalam update mendatang.
        </p>
      </div>
    </div>
  )
}
