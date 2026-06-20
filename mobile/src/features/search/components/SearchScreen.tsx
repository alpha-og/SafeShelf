import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { lookupByBarcode } from '@/features/products/services/product'
import { ProductSheet } from '@/features/products/components/ProductSheet'
import {
  getAllStoreInventory,
  searchStoreInventory,
} from '@/features/stores/services/storeInventoryApi'
import { useDebounce } from '@/hooks/useDebounce'
import { useStore } from '@/providers/StoreProvider'
import { SearchBar } from './SearchBar'
import { SearchResultCard } from './SearchResultCard'

const ITEMS_PER_PAGE = 20

interface SearchScreenProps {
  onSheetOpenChange?: (open: boolean) => void
}

export function SearchScreen({ onSheetOpenChange }: SearchScreenProps = {}) {
  const { selectedStoreId } = useStore()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    onSheetOpenChange?.(!!selectedBarcode)
  }, [selectedBarcode, onSheetOpenChange])

  const { data: productDetails, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['productDetails', selectedBarcode],
    queryFn: () => lookupByBarcode(selectedBarcode!),
    enabled: !!selectedBarcode,
  })

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['storeInventory', selectedStoreId, debouncedQuery],
    queryFn: () => {
      if (!selectedStoreId) return []
      if (debouncedQuery.trim()) {
        return searchStoreInventory(selectedStoreId, debouncedQuery.trim())
      }
      return getAllStoreInventory(selectedStoreId)
    },
    enabled: !!selectedStoreId,
  })

  useEffect(() => {
    setPage(1)
  }, [debouncedQuery])

  const paginatedItems = useMemo(() => {
    return allItems.slice(0, page * ITEMS_PER_PAGE)
  }, [allItems, page])

  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && paginatedItems.length < allItems.length) {
          setPage((p) => p + 1)
        }
      },
      { threshold: 0.1 },
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [paginatedItems.length, allItems.length])

  return (
    <div className="flex flex-col h-full w-full bg-background pb-[var(--sab)]">
      <div className="flex-1 overflow-y-auto min-h-0 relative px-4">
        <div className="sticky top-0 z-10 pt-[calc(var(--sat)_+_1rem)] pb-3 -mx-4 px-4">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground animate-pulse">Loading inventory...</span>
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex justify-center py-8">
            <span className="text-muted-foreground">No products found.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-8">
            {paginatedItems.map((item) => (
              <SearchResultCard
                key={item.barcode}
                item={item}
                onClick={(barcode) => {
                  setSelectedBarcode(barcode)
                }}
              />
            ))}

            {paginatedItems.length < allItems.length && (
              <div ref={observerTarget} className="h-10 w-full flex items-center justify-center">
                <span className="text-muted-foreground text-sm animate-pulse">Loading more...</span>
              </div>
            )}
          </div>
        )}
      </div>

      <ProductSheet
        isProcessing={!!selectedBarcode && isLoadingDetails}
        result={productDetails ?? null}
        error={detailsError ? "Failed to load product details" : null}
        onDismiss={() => setSelectedBarcode(null)}
        portal={true}
      />
    </div>
  )
}
