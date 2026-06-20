import { useNavigate } from '@tanstack/react-router'
import { Loader2, SearchX, Utensils } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { RecipeCard } from './RecipeCard'
import { RecipeSearchBar } from './RecipeSearchBar'

export function RecipesPage() {
  const navigate = useNavigate()
  const {
    searchText,
    setSearchText,
    selectedCategories,
    setSelectedCategories,
    selectedAreas,
    setSelectedAreas,
    recipes,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    rejected,
    rejectionReason,
    hasFilters,
    clearAll,
  } = useRecipeSearch()

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !hasNextPage || isLoading) return
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) fetchNextPage()
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [hasNextPage, isLoading, fetchNextPage],
  )

  const showEmptyPrompt = !hasFilters && recipes.length === 0
  const showNoResults = hasFilters && !isLoading && recipes.length === 0 && !error && !rejected

  return (
    <div className="flex flex-col h-full pb-[var(--sab)]">
      <div className="flex-1 overflow-y-auto px-4 relative">
        <div className="sticky top-0 z-10 bg-background pt-[calc(var(--sat)_+_1rem)] pb-3 -mx-4 px-4">
          <RecipeSearchBar
            searchText={searchText}
            onSearchChange={setSearchText}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            selectedAreas={selectedAreas}
            onAreasChange={setSelectedAreas}
            hasFilters={hasFilters}
            onClearAll={clearAll}
          />
        </div>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-2xl border">
                <Skeleton className="w-28 h-28 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <EmptyState icon={SearchX} title="Search failed" description={error} />
        )}

        {rejected && !isLoading && (
          <EmptyState
            icon={SearchX}
            title="Can't search that"
            description={rejectionReason ?? 'Query was rejected.'}
          />
        )}

        {showNoResults && (
          <EmptyState
            icon={Utensils}
            title="No recipes found"
            description="Try different search terms or filters."
          />
        )}

        {showEmptyPrompt && (
          <EmptyState
            icon={Utensils}
            title="Search for recipes"
            description="Type an ingredient, cuisine, or dish name to get started."
          />
        )}

        {recipes.length > 0 && (
          <>
            {recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onPress={() => navigate({ to: '/recipe/$id', params: { id: recipe.id } })}
              />
            ))}
            <div ref={sentinelCallbackRef} className="h-4" />
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
