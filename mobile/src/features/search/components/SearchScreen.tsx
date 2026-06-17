import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/providers/StoreProvider'
import { searchStoreInventory, getAllStoreInventory } from '@/features/stores/services/storeInventoryApi'
import { SearchBar } from './SearchBar'
import { SearchResultCard } from './SearchResultCard'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigate } from '@tanstack/react-router'

const ITEMS_PER_PAGE = 20

export function SearchScreen() {
  const { selectedStoreId } = useStore()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

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
      entries => {
        if (entries[0].isIntersecting && paginatedItems.length < allItems.length) {
          setPage(p => p + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [paginatedItems.length, allItems.length])

  return (
    <div className="flex flex-col h-full w-full bg-background pt-[calc(var(--sat)_+_1rem)] pb-[var(--sab)] px-4">
      <div className="mb-4">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 relative">
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
            {paginatedItems.map(item => (
              <SearchResultCard
                key={item.barcode}
                item={item}
                onClick={(barcode) => {
                  navigate({ to: '/product/$barcode', params: { barcode } })
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
    </div>
  )
}
