import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      storeInfo: {
        name: 'TOKO SEJAHTERA',
        address: 'Jl. Merdeka No. 123, Jakarta',
        phone: '(021) 1234-5678',
        email: 'info@tokosejahtera.com',
        logo: null // akan berisi base64 atau path ke logo
      },

      // Stock settings for marketplace sync
      stockSettings: {
        bufferPercent: 10,    // Buffer 10% dari stok
        minBuffer: 3,         // Minimum buffer 3 pcs
        enableAutoSync: true, // Auto sync ke marketplace
        syncInterval: 30,     // Interval sync dalam menit
      },

      // WhatsApp Customer Service
      whatsappNumber: '',
      whatsappMessage: 'Halo, saya ingin bertanya tentang produk di toko Anda.',

      updateStoreInfo: (info) => {
        set((state) => ({
          storeInfo: { ...state.storeInfo, ...info }
        }))
      },

      setLogo: (logoData) => {
        set((state) => ({
          storeInfo: { ...state.storeInfo, logo: logoData }
        }))
      },

      // Update stock settings
      updateStockSettings: (settings) => {
        set((state) => ({
          stockSettings: { ...state.stockSettings, ...settings }
        }))
      },

      // Update WhatsApp settings
      updateWhatsApp: (number, message) => {
        set({
          whatsappNumber: number,
          whatsappMessage: message || get().whatsappMessage
        })
      },

      // Calculate marketplace stock with buffer
      getMarketplaceStock: (actualStock) => {
        const { bufferPercent, minBuffer } = get().stockSettings
        const bufferAmount = Math.max(
          Math.ceil(actualStock * (bufferPercent / 100)),
          minBuffer
        )
        return Math.max(0, actualStock - bufferAmount)
      },

      // Get WhatsApp link
      getWhatsAppLink: (customMessage) => {
        const number = get().whatsappNumber.replace(/\D/g, '')
        const message = encodeURIComponent(customMessage || get().whatsappMessage)
        if (!number) return null
        return `https://wa.me/${number}?text=${message}`
      }
    }),
    {
      name: 'settings-storage'
    }
  )
)
