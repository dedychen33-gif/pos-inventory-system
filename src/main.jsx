import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Capacitor imports for native functionality
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

// Supabase realtime stores
import { useProductStore } from './store/productStore'
import { useCustomerStore } from './store/customerStore'
import { useTransactionStore } from './store/transactionStore'

// Dummy data for testing
import { seedDummyData, clearDummyData } from './utils/seedDummyData'

// Initialize Capacitor plugins
const initCapacitor = async () => {
  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide()
    
    // Set status bar style for Android
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1f2937' })
  } catch (error) {
    // Running in browser, not native app
    console.log('Running in web mode')
  }
}

// Initialize Supabase realtime sync
const initRealtimeSync = async () => {
  console.log('Initializing realtime sync...')
  try {
    await useProductStore.getState().initRealtime()
    await useCustomerStore.getState().initRealtime()
    await useTransactionStore.getState().initRealtime()
    console.log('Realtime sync initialized!')
  } catch (error) {
    console.log('Realtime sync error (offline mode):', error)
  }
}

// Handle Android back button
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back()
  } else {
    CapApp.exitApp()
  }
})

initCapacitor()
initRealtimeSync()

if (import.meta.env.DEV) {
  window.seedDummyData = seedDummyData
  window.clearDummyData = clearDummyData
  console.log(' Test functions available in console:')
  console.log('   - seedDummyData() - Add dummy products, customers & transactions')
  console.log('   - clearDummyData() - Clear all dummy data')
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
