import { useProductStore } from '../store/productStore'
import { useCustomerStore } from '../store/customerStore'
import { useTransactionStore } from '../store/transactionStore'

/**
 * Seed dummy data untuk testing aplikasi POS
 * Menambahkan produk, customer, dan transaksi dummy
 */
export async function seedDummyData() {
  console.log('🌱 Starting to seed dummy data...')
  
  const productStore = useProductStore.getState()
  const customerStore = useCustomerStore.getState()
  const transactionStore = useTransactionStore.getState()

  // 1. Tambah Produk Dummy
  console.log('📦 Adding dummy products...')
  const dummyProducts = [
    {
      code: 'PRD001',
      sku: 'SNACK-001',
      barcode: '8991234567890',
      name: 'Chitato Rasa Sapi Panggang',
      description: 'Keripik kentang rasa sapi panggang 68g',
      category: 'Snack',
      unit: 'pcs',
      price: 12000,
      cost: 9000,
      stock: 50,
      minStock: 10,
      maxStock: 100,
      image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
      source: 'manual'
    },
    {
      code: 'PRD002',
      sku: 'DRINK-001',
      barcode: '8992234567891',
      name: 'Coca Cola 330ml',
      description: 'Minuman berkarbonasi kaleng 330ml',
      category: 'Minuman',
      unit: 'pcs',
      price: 8000,
      cost: 6000,
      stock: 100,
      minStock: 20,
      maxStock: 200,
      image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
      source: 'manual'
    },
    {
      code: 'PRD003',
      sku: 'FOOD-001',
      barcode: '8993234567892',
      name: 'Indomie Goreng',
      description: 'Mi instan goreng original 85g',
      category: 'Makanan',
      unit: 'pcs',
      price: 3500,
      cost: 2800,
      stock: 200,
      minStock: 50,
      maxStock: 500,
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
      source: 'manual'
    },
    {
      code: 'PRD004',
      sku: 'SNACK-002',
      barcode: '8994234567893',
      name: 'Oreo Original',
      description: 'Biskuit sandwich cokelat 137g',
      category: 'Snack',
      unit: 'pcs',
      price: 10000,
      cost: 7500,
      stock: 75,
      minStock: 15,
      maxStock: 150,
      image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400',
      source: 'manual'
    },
    {
      code: 'PRD005',
      sku: 'DRINK-002',
      barcode: '8995234567894',
      name: 'Aqua Botol 600ml',
      description: 'Air mineral dalam kemasan 600ml',
      category: 'Minuman',
      unit: 'pcs',
      price: 4000,
      cost: 3000,
      stock: 150,
      minStock: 30,
      maxStock: 300,
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
      source: 'manual'
    },
    {
      code: 'PRD006',
      sku: 'FOOD-002',
      barcode: '8996234567895',
      name: 'Beras Premium 5kg',
      description: 'Beras putih premium kualitas terbaik',
      category: 'Sembako',
      unit: 'kg',
      price: 75000,
      cost: 65000,
      stock: 30,
      minStock: 5,
      maxStock: 50,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
      source: 'manual'
    },
    {
      code: 'PRD007',
      sku: 'SNACK-003',
      barcode: '8997234567896',
      name: 'Taro Net 160g',
      description: 'Keripik kentang berbagai rasa 160g',
      category: 'Snack',
      unit: 'pcs',
      price: 15000,
      cost: 11000,
      stock: 40,
      minStock: 10,
      maxStock: 80,
      image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=400',
      source: 'manual'
    },
    {
      code: 'PRD008',
      sku: 'DRINK-003',
      barcode: '8998234567897',
      name: 'Teh Botol Sosro 450ml',
      description: 'Minuman teh dalam botol 450ml',
      category: 'Minuman',
      unit: 'pcs',
      price: 5000,
      cost: 3500,
      stock: 120,
      minStock: 25,
      maxStock: 250,
      image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
      source: 'manual'
    },
    {
      code: 'PRD009',
      sku: 'ELEC-001',
      barcode: '8999234567898',
      name: 'Baterai AA Alkaline',
      description: 'Baterai alkaline AA isi 4pcs',
      category: 'Elektronik',
      unit: 'pack',
      price: 18000,
      cost: 14000,
      stock: 25,
      minStock: 5,
      maxStock: 50,
      image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=400',
      source: 'manual'
    },
    {
      code: 'PRD010',
      sku: 'STAT-001',
      barcode: '8990234567899',
      name: 'Pulpen Standard Hitam',
      description: 'Pulpen tinta hitam standard isi 12pcs',
      category: 'Alat Tulis',
      unit: 'pack',
      price: 25000,
      cost: 20000,
      stock: 15,
      minStock: 3,
      maxStock: 30,
      image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400',
      source: 'manual'
    }
  ]

  const addedProducts = []
  for (const product of dummyProducts) {
    try {
      const result = await productStore.addProduct(product)
      if (result.success) {
        addedProducts.push(result.product)
        console.log(`✅ Added product: ${product.name}`)
      }
    } catch (error) {
      console.error(`❌ Failed to add product ${product.name}:`, error)
    }
  }

  // 2. Tambah Customer Dummy
  console.log('👥 Adding dummy customers...')
  const dummyCustomers = [
    {
      name: 'Budi Santoso',
      phone: '081234567890',
      email: 'budi.santoso@email.com',
      address: 'Jl. Merdeka No. 123, Jakarta Pusat',
      type: 'regular',
      points: 150,
      totalSpent: 500000
    },
    {
      name: 'Siti Nurhaliza',
      phone: '081234567891',
      email: 'siti.nur@email.com',
      address: 'Jl. Sudirman No. 45, Jakarta Selatan',
      type: 'member',
      points: 350,
      totalSpent: 1200000
    },
    {
      name: 'Ahmad Wijaya',
      phone: '081234567892',
      email: 'ahmad.w@email.com',
      address: 'Jl. Gatot Subroto No. 78, Jakarta Barat',
      type: 'regular',
      points: 80,
      totalSpent: 300000
    },
    {
      name: 'Dewi Lestari',
      phone: '081234567893',
      email: 'dewi.lestari@email.com',
      address: 'Jl. Thamrin No. 90, Jakarta Pusat',
      type: 'vip',
      points: 500,
      totalSpent: 2500000
    },
    {
      name: 'Rudi Hermawan',
      phone: '081234567894',
      email: 'rudi.h@email.com',
      address: 'Jl. Kuningan No. 12, Jakarta Selatan',
      type: 'regular',
      points: 120,
      totalSpent: 450000
    }
  ]

  const addedCustomers = []
  for (const customer of dummyCustomers) {
    try {
      const result = await customerStore.addCustomer(customer)
      if (result.success) {
        addedCustomers.push(result.customer)
        console.log(`✅ Added customer: ${customer.name}`)
      }
    } catch (error) {
      console.error(`❌ Failed to add customer ${customer.name}:`, error)
    }
  }

  // 3. Tambah Transaksi Dummy
  console.log('💰 Adding dummy transactions...')
  
  // Pastikan ada produk dan customer
  if (addedProducts.length === 0 || addedCustomers.length === 0) {
    console.error('❌ Cannot create transactions: No products or customers available')
    return {
      success: false,
      message: 'Failed to seed data: No products or customers'
    }
  }

  const dummyTransactions = [
    // Transaksi 1 - Hari ini
    {
      items: [
        { 
          productId: addedProducts[0].id, 
          name: addedProducts[0].name,
          price: addedProducts[0].price,
          quantity: 3,
          subtotal: addedProducts[0].price * 3
        },
        { 
          productId: addedProducts[1].id, 
          name: addedProducts[1].name,
          price: addedProducts[1].price,
          quantity: 5,
          subtotal: addedProducts[1].price * 5
        }
      ],
      customerId: addedCustomers[0].id,
      customerName: addedCustomers[0].name,
      subtotal: (addedProducts[0].price * 3) + (addedProducts[1].price * 5),
      discount: 5000,
      tax: 0,
      paymentMethod: 'cash',
      cashReceived: 100000,
      createdAt: new Date().toISOString()
    },
    // Transaksi 2 - Hari ini
    {
      items: [
        { 
          productId: addedProducts[2].id, 
          name: addedProducts[2].name,
          price: addedProducts[2].price,
          quantity: 10,
          subtotal: addedProducts[2].price * 10
        },
        { 
          productId: addedProducts[4].id, 
          name: addedProducts[4].name,
          price: addedProducts[4].price,
          quantity: 6,
          subtotal: addedProducts[4].price * 6
        }
      ],
      customerId: addedCustomers[1].id,
      customerName: addedCustomers[1].name,
      subtotal: (addedProducts[2].price * 10) + (addedProducts[4].price * 6),
      discount: 0,
      tax: 0,
      paymentMethod: 'qris',
      cashReceived: 0,
      createdAt: new Date().toISOString()
    },
    // Transaksi 3 - Kemarin
    {
      items: [
        { 
          productId: addedProducts[5].id, 
          name: addedProducts[5].name,
          price: addedProducts[5].price,
          quantity: 1,
          subtotal: addedProducts[5].price * 1
        },
        { 
          productId: addedProducts[3].id, 
          name: addedProducts[3].name,
          price: addedProducts[3].price,
          quantity: 4,
          subtotal: addedProducts[3].price * 4
        }
      ],
      customerId: addedCustomers[2].id,
      customerName: addedCustomers[2].name,
      subtotal: (addedProducts[5].price * 1) + (addedProducts[3].price * 4),
      discount: 10000,
      tax: 0,
      paymentMethod: 'debit',
      cashReceived: 0,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    // Transaksi 4 - 2 hari lalu
    {
      items: [
        { 
          productId: addedProducts[6].id, 
          name: addedProducts[6].name,
          price: addedProducts[6].price,
          quantity: 2,
          subtotal: addedProducts[6].price * 2
        },
        { 
          productId: addedProducts[7].id, 
          name: addedProducts[7].name,
          price: addedProducts[7].price,
          quantity: 8,
          subtotal: addedProducts[7].price * 8
        },
        { 
          productId: addedProducts[1].id, 
          name: addedProducts[1].name,
          price: addedProducts[1].price,
          quantity: 3,
          subtotal: addedProducts[1].price * 3
        }
      ],
      customerId: addedCustomers[3].id,
      customerName: addedCustomers[3].name,
      subtotal: (addedProducts[6].price * 2) + (addedProducts[7].price * 8) + (addedProducts[1].price * 3),
      discount: 0,
      tax: 0,
      paymentMethod: 'cash',
      cashReceived: 100000,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    // Transaksi 5 - 3 hari lalu
    {
      items: [
        { 
          productId: addedProducts[8].id, 
          name: addedProducts[8].name,
          price: addedProducts[8].price,
          quantity: 2,
          subtotal: addedProducts[8].price * 2
        },
        { 
          productId: addedProducts[9].id, 
          name: addedProducts[9].name,
          price: addedProducts[9].price,
          quantity: 1,
          subtotal: addedProducts[9].price * 1
        }
      ],
      customerId: addedCustomers[4].id,
      customerName: addedCustomers[4].name,
      subtotal: (addedProducts[8].price * 2) + (addedProducts[9].price * 1),
      discount: 3000,
      tax: 0,
      paymentMethod: 'transfer',
      cashReceived: 0,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const addedTransactions = []
  for (const transaction of dummyTransactions) {
    try {
      // Hitung total
      const total = transaction.subtotal - transaction.discount + transaction.tax
      const change = transaction.paymentMethod === 'cash' ? transaction.cashReceived - total : 0

      const txData = {
        ...transaction,
        total,
        change,
        invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      }

      const result = await transactionStore.addTransaction(txData)
      if (result.success) {
        addedTransactions.push(result.transaction)
        console.log(`✅ Added transaction: ${txData.invoiceNumber}`)
        
        // Update stock untuk setiap item
        for (const item of transaction.items) {
          const product = addedProducts.find(p => p.id === item.productId)
          if (product) {
            await productStore.updateProduct(product.id, {
              stock: product.stock - item.quantity
            })
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to add transaction:`, error)
    }
  }

  console.log('✅ Dummy data seeding completed!')
  console.log(`📦 Products added: ${addedProducts.length}`)
  console.log(`👥 Customers added: ${addedCustomers.length}`)
  console.log(`💰 Transactions added: ${addedTransactions.length}`)

  return {
    success: true,
    data: {
      products: addedProducts,
      customers: addedCustomers,
      transactions: addedTransactions
    },
    message: `Successfully seeded ${addedProducts.length} products, ${addedCustomers.length} customers, and ${addedTransactions.length} transactions`
  }
}

// Fungsi untuk clear semua dummy data
export async function clearDummyData() {
  console.log('🗑️ Clearing dummy data...')
  
  const productStore = useProductStore.getState()
  const customerStore = useCustomerStore.getState()
  const transactionStore = useTransactionStore.getState()

  // Clear transactions
  const transactions = transactionStore.transactions || []
  for (const tx of transactions) {
    await transactionStore.deleteTransaction(tx.id)
  }

  // Clear customers (except walk-in)
  const customers = customerStore.customers || []
  for (const customer of customers) {
    if (customer.type !== 'walk-in') {
      await customerStore.deleteCustomer(customer.id)
    }
  }

  // Clear products
  const products = productStore.products || []
  for (const product of products) {
    await productStore.deleteProduct(product.id)
  }

  console.log('✅ Dummy data cleared!')
  
  return {
    success: true,
    message: 'All dummy data has been cleared'
  }
}

// Export untuk digunakan di console browser
if (typeof window !== 'undefined') {
  window.seedDummyData = seedDummyData
  window.clearDummyData = clearDummyData
  console.log('💡 Dummy data functions available:')
  console.log('   - window.seedDummyData() - Add dummy data')
  console.log('   - window.clearDummyData() - Clear all dummy data')
}
