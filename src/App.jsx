import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isAndroid } from './utils/platform'
import { FirebaseSyncProvider } from './hooks/useFirebaseSync'
import './utils/forceReloadStores' // Load force reload utility
import './utils/seedDummyData' // Load dummy data functions for testing
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Stock from './pages/Stock'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Returns from './pages/Returns'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import RemoteScanner from './pages/RemoteScanner'
import Expenses from './pages/Expenses'
import Debts from './pages/Debts'

function App() {
  const { isAuthenticated, user, resetToDefaultAdmin } = useAuthStore()

  // One-time fix: Reset user if they have Cashier role but should be admin
  useEffect(() => {
    if (user && user.role === 'cashier' && user.name === 'Administrator') {
      console.log('🔧 Fixing corrupted admin user...')
      resetToDefaultAdmin()
      window.location.reload()
    }
  }, [user, resetToDefaultAdmin])

  return (
    <Router>
      <FirebaseSyncProvider>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    {/* POS hanya tampil di Web, tidak di Android */}
                    {!isAndroid && <Route path="/pos" element={<POS />} />}
                    {/* Remote Scanner hanya di Android */}
                    {isAndroid && <Route path="/scanner" element={<RemoteScanner />} />}
                    <Route path="/products" element={<Products />} />
                    <Route path="/stock" element={<Stock />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/returns" element={<Returns />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/debts" element={<Debts />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </FirebaseSyncProvider>
    </Router>
  )
}

export default App
