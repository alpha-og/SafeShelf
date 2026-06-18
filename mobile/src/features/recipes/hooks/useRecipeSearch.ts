import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { searchRecipes } from '../services/recipe'

const DEBOUNCE_MS = 300

export function useRecipeSearch() {
  const [searchText, setSearchText] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedAreas, setSelectedAreas] = useState<string[]>([])

  const debouncedSearchText = useDebounce(searchText, DEBOUNCE_MS)
  const debouncedCategories = useDebounce(selectedCategories, DEBOUNCE_MS)
  const debouncedAreas = useDebounce(selectedAreas, DEBOUNCE_MS)

  const hasFilters =
    debouncedSearchText.trim().length > 0 ||
    debouncedCategories.length > 0 ||
    debouncedAreas.length > 0

  const query = useInfiniteQuery({
    queryKey: ['recipes', debouncedSearchText, debouncedCategories, debouncedAreas],
    queryFn: ({ pageParam }) =>
      searchRecipes(debouncedSearchText, debouncedCategories, debouncedAreas, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || lastPage.recipes.length === 0) return undefined
      const loaded = lastPage.page * lastPage.page_size
      return loaded < lastPage.total ? lastPage.page + 1 : undefined
    },
    enabled: hasFilters,
    staleTime: 30_000,
  })

  const recipes = query.data?.pages.flatMap((p) => p.recipes) ?? []

  const clearAll = () => {
    setSearchText('')
    setSelectedCategories([])
    setSelectedAreas([])
  }

  return {
    searchText,
    setSearchText,
    selectedCategories,
    setSelectedCategories,
    selectedAreas,
    setSelectedAreas,
    recipes,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.data?.pages[0]?.error ?? (query.error ? (query.error as Error).message : null),
    rejected: query.data?.pages[0]?.rejected ?? false,
    rejectionReason: query.data?.pages[0]?.rejection_reason ?? null,
    hasFilters,
    clearAll,
  }
}
