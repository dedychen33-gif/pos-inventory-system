import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { isAndroid } from './utils/platform'
import { RealtimeSyncProvider } from './hooks/useRealtimeSync'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Stock from './pages/Stock'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Customers from './pages/Customers'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import RemoteScanner from './pages/RemoteScanner'
import MarketplaceCallback from './pages/MarketplaceCallback'
import MarketplaceIntegration from './pages/MarketplaceIntegration'
import MarketplaceOrders from './pages/MarketplaceOrders'
import MarketplaceProducts from './pages/MarketplaceProducts'
import MarketplaceChat from './pages/MarketplaceChat'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <RealtimeSyncProvider>
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          {/* Marketplace callback - accessible without auth */}
          <Route path="/marketplace/callback" element={<MarketplaceCallback />} />
          
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
                    {/* Marketplace - redirect to integration page */}
                    <Route path="/marketplace" element={<Navigate to="/marketplace/integration" replace />} />
                    <Route path="/marketplace/integration" element={<MarketplaceIntegration />} />
                    <Route path="/marketplace/orders" element={<MarketplaceOrders />} />
                    <Route path="/marketplace/products" element={<MarketplaceProducts />} />
                    <Route path="/marketplace/chat" element={<MarketplaceChat />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/stock" element={<Stock />} />
                    <Route path="/purchases" element={<Purchases />} />
                    <Route path="/sales" element={<Sales />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </RealtimeSyncProvider>
    </Router>
  )
}

export default App
