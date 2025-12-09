import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn, Loader2, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Brief delay for better UX feedback
    setTimeout(() => {
      const result = login(username, password)
      
      if (result.success || result === true) {
        navigate('/')
      } else {
        setError(result.error || 'Username atau password salah')
      }
      
      setLoading(false)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingCart size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">POS System</h1>
            <p className="text-gray-600 mt-2">Sistem Manajemen Stok & Kasir</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Masukkan password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Login</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Demo Login:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>👤 Admin: admin / admin123</p>
              <p>👤 Kasir: kasir / kasir123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white mt-6 text-sm">
          © 2025 POS System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
