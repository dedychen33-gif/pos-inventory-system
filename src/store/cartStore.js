import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      cartItems: [],
      selectedCustomer: null,
      discount: 0,
      discountType: 'percent', // 'percent' or 'fixed'
      paymentMethod: 'cash',
      
      addToCart: (product, quantity = 1) => {
        const existingItem = get().cartItems.find((item) => item.id === product.id)
        
        if (existingItem) {
          if (existingItem.quantity + quantity > existingItem.stock) {
            alert('Stok tidak mencukupi!')
            return
          }
          set((state) => ({
            cartItems: state.cartItems.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          }))
        } else {
          if (quantity > product.stock) {
            alert('Stok tidak mencukupi!')
            return
          }
          set((state) => ({
            cartItems: [...state.cartItems, { ...product, quantity }]
          }))
        }
      },
      
      removeFromCart: (productId) => {
        set((state) => ({
          cartItems: state.cartItems.filter((item) => item.id !== productId)
        }))
      },
      
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId)
          return
        }
        
        const item = get().cartItems.find(i => i.id === productId)
        if (item && quantity > item.stock) {
          alert('Stok tidak mencukupi!')
          return
        }

        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          )
        }))
      },
      
      updateItemDiscount: (productId, discount) => {
        set((state) => ({
          cartItems: state.cartItems.map((item) =>
            item.id === productId ? { ...item, itemDiscount: discount } : item
          )
        }))
      },
      
      setDiscount: (discount, type = 'percent') => {
        set({ discount, discountType: type })
      },
      
      setCustomer: (customer) => {
        set({ selectedCustomer: customer })
      },
      
      setPaymentMethod: (method) => {
        set({ paymentMethod: method })
      },
      
      getSubtotal: () => {
        return get().cartItems.reduce((total, item) => {
          const itemPrice = item.price * item.quantity
          const itemDiscount = item.itemDiscount || 0
          return total + (itemPrice - itemDiscount)
        }, 0)
      },
      
      getDiscount: () => {
        const subtotal = get().getSubtotal()
        const { discount, discountType } = get()
        
        if (discountType === 'percent') {
          return (subtotal * discount) / 100
        }
        return discount
      },
      
      getTax: () => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscount()
        return (subtotal - discount) * 0.11 // PPN 11%
      },
      
      getTotal: () => {
        const subtotal = get().getSubtotal()
        const discount = get().getDiscount()
        const tax = get().getTax()
        return subtotal - discount + tax
      },
      
      clearCart: () => {
        set({
          cartItems: [],
          selectedCustomer: null,
          discount: 0,
          discountType: 'percent',
          paymentMethod: 'cash'
        })
      },
      
      holdTransaction: () => {
        const state = get()
        const heldTransaction = {
          id: Date.now(),
          cartItems: state.cartItems,
          selectedCustomer: state.selectedCustomer,
          discount: state.discount,
          discountType: state.discountType,
          timestamp: new Date().toISOString()
        }
        
        // Save to held transactions (implement in separate store if needed)
        localStorage.setItem(`held_${heldTransaction.id}`, JSON.stringify(heldTransaction))
        
        get().clearCart()
        return heldTransaction.id
      }
    }),
    {
      name: 'cart-storage'
    }
  )
)
