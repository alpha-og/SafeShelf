import React, { createContext, useContext, useEffect, useState } from 'react'
import { getItem, setItem } from '@/lib/storage'
import type { ProductInfo } from '@/features/camera/services/detection'

export interface CartItem {
  product: ProductInfo
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  isLoading: boolean
  addToCart: (product: ProductInfo) => Promise<void>
  removeFromCart: (barcode: string) => Promise<void>
  clearCart: () => Promise<void>
  updateQuantity: (barcode: string, quantity: number) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCart = async () => {
      try {
        const stored = await getItem<CartItem[]>('cart_items')
        if (stored) setItems(stored)
      } catch (err) {
        console.error('Failed to load cart:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadCart()
  }, [])

  const saveCart = async (newItems: CartItem[]) => {
    setItems(newItems)
    await setItem('cart_items', newItems)
  }

  const addToCart = async (product: ProductInfo) => {
    if (!product.barcode) return // Can't reliably manage cart items without barcode
    const newItems = [...items]
    const existingIndex = newItems.findIndex((item) => item.product.barcode === product.barcode)
    
    if (existingIndex >= 0) {
      newItems[existingIndex].quantity += 1
    } else {
      newItems.push({ product, quantity: 1 })
    }
    await saveCart(newItems)
  }

  const removeFromCart = async (barcode: string) => {
    const newItems = items.filter((item) => item.product.barcode !== barcode)
    await saveCart(newItems)
  }

  const updateQuantity = async (barcode: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(barcode)
      return
    }
    const newItems = items.map((item) => {
      if (item.product.barcode === barcode) {
        return { ...item, quantity }
      }
      return item
    })
    await saveCart(newItems)
  }

  const clearCart = async () => {
    await saveCart([])
  }

  return (
    <CartContext.Provider value={{ items, isLoading, addToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
