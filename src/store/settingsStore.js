import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      storeInfo: {
        name: 'TOKO SEJAHTERA',
        address: 'Jl. Merdeka No. 123, Jakarta',
        phone: '(021) 1234-5678',
        email: 'info@tokosejahtera.com',
        logo: null // akan berisi base64 atau path ke logo
      },

      updateStoreInfo: (info) => {
        set((state) => ({
          storeInfo: { ...state.storeInfo, ...info }
        }))
      },

      setLogo: (logoData) => {
        set((state) => ({
          storeInfo: { ...state.storeInfo, logo: logoData }
        }))
      }
    }),
    {
      name: 'settings-storage'
    }
  )
)
