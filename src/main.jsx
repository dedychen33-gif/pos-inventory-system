import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Capacitor imports for native functionality
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

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

// Handle Android back button
CapApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back()
  } else {
    CapApp.exitApp()
  }
})

initCapacitor()

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
