import type React from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ProductInfo } from '@/features/products/services/product'
import { getItem, removeItem, setItem } from '@/lib/storage'
import { useProfiles } from '@/providers/ProfilesProvider'
import { api } from '@/lib/axios'
import { useStore } from './StoreProvider'

export interface CartItem {
  product: ProductInfo
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  isLoading: boolean
  /** True when a non-empty cart was restored on a fresh page load and the user
   *  hasn't yet chosen to continue or start over. Set once per full reload (not
   *  when switching the active profile/group mid-session). Drives the banner. */
  previousSessionPending: boolean
  addToCart: (product: ProductInfo) => Promise<void>
  removeFromCart: (barcode: string) => Promise<void>
  clearCart: () => Promise<void>
  updateQuantity: (barcode: string, quantity: number) => Promise<void>
  /** Keep the restored cart and dismiss the session banner for this load. */
  continueSession: () => void
  /** Empty the active cart to begin a fresh shopping session and dismiss the banner. */
  startNewSession: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

const LEGACY_CART_KEY = 'cart_items'

/** Storage key for the cart of the currently active profile or group. Each
 *  selection keeps its own cart, so switching profiles/groups never mixes
 *  items. Null while the active selection is still resolving. */
function cartKeyFor(profileId: string | null, groupId: string | null): string | null {
  if (profileId) return `cart:profile:${profileId}`
  if (groupId) return `cart:group:${groupId}`
  return null
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { activeProfile, activeGroup, isLoading: profilesLoading } = useProfiles()
  const cartKey = cartKeyFor(activeProfile?.id ?? null, activeGroup?.id ?? null)

  const [items, setItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [previousSessionPending, setPreviousSessionPending] = useState(false)
  // The banner should only appear on a full reload, not on every selection
  // switch — so only the first successful cart load can arm it.
  const firstLoadRef = useRef(true)

  // (Re)load the cart whenever the active selection changes.
  useEffect(() => {
    if (profilesLoading) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        if (!cartKey) {
          if (!cancelled) setItems([])
          return
        }
        let stored = (await getItem<CartItem[]>(cartKey)) ?? []

        // One-time migration: adopt the pre-personalisation global cart into the
        // first active selection so an in-progress cart isn't lost.
        if (firstLoadRef.current && stored.length === 0) {
          const legacy = await getItem<CartItem[]>(LEGACY_CART_KEY)
          if (legacy && legacy.length > 0) {
            stored = legacy
            await setItem(cartKey, legacy)
            await removeItem(LEGACY_CART_KEY)
          }
        }

        if (cancelled) return
        setItems(stored)
        if (firstLoadRef.current && stored.length > 0) setPreviousSessionPending(true)
      } finally {
        if (!cancelled) {
          firstLoadRef.current = false
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [cartKey, profilesLoading])

  const saveCart = async (newItems: CartItem[]) => {
    setItems(newItems)
    if (cartKey) await setItem(cartKey, newItems)
  }

  const continueSession = () => setPreviousSessionPending(false)

  const startNewSession = async () => {
    await saveCart([])
    setPreviousSessionPending(false)
  }

  const { selectedStoreId } = useStore()

  const addToCart = async (product: ProductInfo) => {
    if (!product.barcode) return // Can't reliably manage cart items without barcode

    try {
      if (!selectedStoreId) {
        toast.error('Please select a store first')
        return
      }

      const { data: res } = await api.get(
        `/v1/stores/${selectedStoreId}/inventory/${product.barcode}`,
      )
      if (!res || !res.in_stock) {
        toast.error('Sorry, this item is currently out of stock!')
        return
      }

      const requestedQty = 1
      const newItems = [...items]
      const existingIndex = newItems.findIndex((item) => item.product.barcode === product.barcode)

      const currentQty = existingIndex >= 0 ? newItems[existingIndex].quantity : 0

      if (currentQty + requestedQty > res.quantity) {
        toast.error(`Only ${res.quantity} left in stock!`)
        return
      }

      if (existingIndex >= 0) {
        newItems[existingIndex].quantity += requestedQty
      } else {
        newItems.push({ product, quantity: requestedQty })
      }
      await saveCart(newItems)
    } catch (err) {
      console.error('Inventory check failed:', err)
      toast.error('Failed to check inventory. Please try again.')
    }
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
    <CartContext.Provider
      value={{
        items,
        isLoading,
        previousSessionPending,
        addToCart,
        removeFromCart,
        clearCart,
        updateQuantity,
        continueSession,
        startNewSession,
      }}
    >
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
