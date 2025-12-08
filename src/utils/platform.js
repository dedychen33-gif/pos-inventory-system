import { Capacitor } from '@capacitor/core'

// Detect if running on native Android/iOS or web browser
export const isNative = Capacitor.isNativePlatform()
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isIOS = Capacitor.getPlatform() === 'ios'
export const isWeb = Capacitor.getPlatform() === 'web'

// Use this to conditionally show/hide features
export const platform = {
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  name: Capacitor.getPlatform()
}
