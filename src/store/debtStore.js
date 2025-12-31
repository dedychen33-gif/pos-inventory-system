import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { firebaseDB } from '../lib/firebase'

export const useDebtStore = create(
  persist(
    (set, get) => ({
      debts: [],
      employees: [],
      kasbons: [],

      // Direct setter for Firebase realtime sync
      setDebts: (debts) => set({ debts }),
      setEmployees: (employees) => set({ employees }),
      setKasbons: (kasbons) => set({ kasbons }),

      // ==================== EMPLOYEE MANAGEMENT ====================
      
      // Add employee
      addEmployee: async (employee) => {
        const newEmployee = {
          ...employee,
          id: employee.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          totalKasbon: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('👤 Adding employee to Firebase:', newEmployee.name)
        const result = await firebaseDB.set(`employees/${newEmployee.id}`, newEmployee)
        
        if (result.success) {
          console.log('✅ Employee added to Firebase')
          // Firebase sync will update local state automatically
          return { success: true, employee: newEmployee }
        } else {
          console.error('❌ Failed to add employee:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update employee
      updateEmployee: async (id, updatedEmployee) => {
        const updateData = {
          ...updatedEmployee,
          updatedAt: new Date().toISOString()
        }

        console.log('👤 Updating employee in Firebase:', id)
        const result = await firebaseDB.update(`employees/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Employee updated in Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to update employee:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete employee
      deleteEmployee: async (id) => {
        console.log('👤 Deleting employee from Firebase:', id)
        const result = await firebaseDB.remove(`employees/${id}`)
        
        if (result.success) {
          console.log('✅ Employee deleted from Firebase')
          set(state => ({
            employees: state.employees.filter(e => e.id !== id)
          }))
          return { success: true }
        } else {
          console.error('❌ Failed to delete employee:', result.error)
          return { success: false, error: result.error }
        }
      },

      // ==================== KASBON MANAGEMENT ====================
      
      // Add kasbon
      addKasbon: async (kasbon) => {
        const newKasbon = {
          ...kasbon,
          id: kasbon.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          paidAmount: kasbon.paidAmount || 0,
          status: kasbon.status || 'unpaid', // unpaid, partial, paid
          payments: kasbon.payments || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('💵 Adding kasbon to Firebase:', newKasbon.employeeName)
        const result = await firebaseDB.set(`kasbons/${newKasbon.id}`, newKasbon)
        
        if (result.success) {
          console.log('✅ Kasbon added to Firebase')
          // Firebase sync will update local state automatically
          
          // Update employee's total kasbon
          const employee = get().employees.find(e => e.id === kasbon.employeeId)
          if (employee) {
            const newTotal = (employee.totalKasbon || 0) + kasbon.amount
            await firebaseDB.update(`employees/${employee.id}`, { 
              totalKasbon: newTotal,
              updatedAt: new Date().toISOString()
            })
          }
          
          return { success: true, kasbon: newKasbon }
        } else {
          console.error('❌ Failed to add kasbon:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update kasbon
      updateKasbon: async (id, updatedKasbon) => {
        const updateData = {
          ...updatedKasbon,
          updatedAt: new Date().toISOString()
        }

        console.log('💵 Updating kasbon in Firebase:', id)
        const result = await firebaseDB.update(`kasbons/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Kasbon updated in Firebase')
          return { success: true }
        } else {
          console.error('❌ Failed to update kasbon:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete kasbon
      deleteKasbon: async (id) => {
        const kasbon = get().kasbons.find(k => k.id === id)
        
        console.log('💵 Deleting kasbon from Firebase:', id)
        const result = await firebaseDB.remove(`kasbons/${id}`)
        
        if (result.success) {
          console.log('✅ Kasbon deleted from Firebase')
          
          // Update employee's total kasbon
          if (kasbon) {
            const employee = get().employees.find(e => e.id === kasbon.employeeId)
            if (employee) {
              const remaining = (kasbon.amount || 0) - (kasbon.paidAmount || 0)
              const newTotal = Math.max(0, (employee.totalKasbon || 0) - remaining)
              await firebaseDB.update(`employees/${employee.id}`, { 
                totalKasbon: newTotal,
                updatedAt: new Date().toISOString()
              })
            }
          }
          
          set(state => ({
            kasbons: state.kasbons.filter(k => k.id !== id)
          }))
          return { success: true }
        } else {
          console.error('❌ Failed to delete kasbon:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Add payment to kasbon
      addKasbonPayment: async (kasbonId, payment) => {
        const kasbon = get().kasbons.find(k => k.id === kasbonId)
        if (!kasbon) return { success: false, error: 'Kasbon not found' }

        const newPayment = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          amount: payment.amount,
          date: payment.date || new Date().toISOString(),
          note: payment.note || '',
          signature: payment.signature || null,
          createdAt: new Date().toISOString()
        }

        const payments = [...(kasbon.payments || []), newPayment]
        const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const remaining = kasbon.amount - paidAmount
        
        let status = 'unpaid'
        if (paidAmount >= kasbon.amount) {
          status = 'paid'
        } else if (paidAmount > 0) {
          status = 'partial'
        }

        const updateData = {
          payments,
          paidAmount,
          status,
          updatedAt: new Date().toISOString()
        }

        console.log('💰 Adding payment to kasbon:', kasbonId)
        const result = await firebaseDB.update(`kasbons/${kasbonId}`, updateData)
        
        if (result.success) {
          console.log('✅ Payment added to kasbon')
          
          // Update employee's total kasbon
          const employee = get().employees.find(e => e.id === kasbon.employeeId)
          if (employee) {
            const newTotal = Math.max(0, (employee.totalKasbon || 0) - payment.amount)
            await firebaseDB.update(`employees/${employee.id}`, { 
              totalKasbon: newTotal,
              updatedAt: new Date().toISOString()
            })
          }
          
          return { success: true, remaining }
        } else {
          console.error('❌ Failed to add payment:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Get kasbons by employee
      getKasbonsByEmployee: (employeeId) => {
        return get().kasbons.filter(k => k.employeeId === employeeId)
      },

      // Get total kasbon (unpaid)
      getTotalKasbon: () => {
        return get().kasbons.reduce((sum, k) => sum + ((k.amount || 0) - (k.paidAmount || 0)), 0)
      },

      // Get unpaid kasbons
      getUnpaidKasbons: () => {
        return get().kasbons.filter(k => k.status !== 'paid')
      },

      // Add debt - save to Firebase first
      // type: 'payable' (hutang ke supplier) or 'receivable' (piutang dari customer)
      addDebt: async (debt) => {
        const newDebt = {
          ...debt,
          id: debt.id || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
          paidAmount: debt.paidAmount || 0,
          status: debt.status || 'unpaid', // unpaid, partial, paid
          payments: debt.payments || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        console.log('📋 Adding debt to Firebase:', newDebt.description)
        const result = await firebaseDB.set(`debts/${newDebt.id}`, newDebt)
        
        if (result.success) {
          console.log('✅ Debt added to Firebase')
          // Firebase sync will update local state automatically
          return { success: true, debt: newDebt }
        } else {
          console.error('❌ Failed to add debt:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Update debt - save to Firebase first
      updateDebt: async (id, updatedDebt) => {
        const updateData = {
          ...updatedDebt,
          updatedAt: new Date().toISOString()
        }

        console.log('📋 Updating debt in Firebase:', id)
        const result = await firebaseDB.update(`debts/${id}`, updateData)
        
        if (result.success) {
          console.log('✅ Debt updated in Firebase')
          // Firebase sync will update local state automatically
          return { success: true }
        } else {
          console.error('❌ Failed to update debt:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Delete debt - remove from Firebase
      deleteDebt: async (id) => {
        console.log('📋 Deleting debt from Firebase:', id)
        const result = await firebaseDB.remove(`debts/${id}`)
        
        if (result.success) {
          console.log('✅ Debt deleted from Firebase')
          // Update local state immediately for better UX
          set(state => ({
            debts: state.debts.filter(d => d.id !== id)
          }))
          return { success: true }
        } else {
          console.error('❌ Failed to delete debt:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Add payment to debt
      addPayment: async (debtId, payment) => {
        const debt = get().debts.find(d => d.id === debtId)
        if (!debt) return { success: false, error: 'Debt not found' }

        const newPayment = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          amount: payment.amount,
          date: payment.date || new Date().toISOString(),
          note: payment.note || '',
          createdAt: new Date().toISOString()
        }

        const payments = [...(debt.payments || []), newPayment]
        const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        const remaining = debt.amount - paidAmount
        
        let status = 'unpaid'
        if (paidAmount >= debt.amount) {
          status = 'paid'
        } else if (paidAmount > 0) {
          status = 'partial'
        }

        const updateData = {
          payments,
          paidAmount,
          status,
          updatedAt: new Date().toISOString()
        }

        console.log('💰 Adding payment to debt:', debtId)
        const result = await firebaseDB.update(`debts/${debtId}`, updateData)
        
        if (result.success) {
          console.log('✅ Payment added to debt')
          // Firebase sync will update local state automatically
          return { success: true, remaining }
        } else {
          console.error('❌ Failed to add payment:', result.error)
          return { success: false, error: result.error }
        }
      },

      // Get debts by type
      getDebtsByType: (type) => {
        return get().debts.filter(d => d.type === type)
      },

      // Get payables (hutang ke supplier)
      getPayables: () => {
        return get().debts.filter(d => d.type === 'payable')
      },

      // Get receivables (piutang dari customer)
      getReceivables: () => {
        return get().debts.filter(d => d.type === 'receivable')
      },

      // Get unpaid debts
      getUnpaidDebts: () => {
        return get().debts.filter(d => d.status !== 'paid')
      },

      // Get total payables
      getTotalPayables: () => {
        const payables = get().getPayables()
        return payables.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0)
      },

      // Get total receivables
      getTotalReceivables: () => {
        const receivables = get().getReceivables()
        return receivables.reduce((sum, d) => sum + ((d.amount || 0) - (d.paidAmount || 0)), 0)
      },

      // Get debt by ID
      getDebtById: (id) => {
        return get().debts.find(d => d.id === id)
      },

      // Get debts by date range
      getDebtsByDateRange: (startDate, endDate) => {
        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()
        return get().debts.filter(d => {
          const date = new Date(d.dueDate || d.createdAt).getTime()
          return date >= start && date <= end
        })
      },

      // Get overdue debts
      getOverdueDebts: () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return get().debts.filter(d => {
          if (d.status === 'paid') return false
          if (!d.dueDate) return false
          return new Date(d.dueDate) < today
        })
      }
    }),
    {
      name: 'debt-storage'
    }
  )
)
