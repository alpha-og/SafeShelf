import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { getItem, setItem } from '@/lib/storage'

interface StoreContextType {
  selectedStoreId: string | null
  setSelectedStoreId: (id: string | null) => Promise<void>
  isInitialized: boolean
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    async function loadStore() {
      try {
        const stored = await getItem<string>('selected_store_id')
        if (stored) {
          setSelectedStoreIdState(stored)
        }
      } catch (error) {
        console.error('Failed to load selected store:', error)
      } finally {
        setIsInitialized(true)
      }
    }
    loadStore()
  }, [])

  const setSelectedStoreId = async (id: string | null) => {
    setSelectedStoreIdState(id)
    if (id) {
      await setItem('selected_store_id', id)
    } else {
      await setItem('selected_store_id', '')
    }
  }

  return (
    <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId, isInitialized }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
