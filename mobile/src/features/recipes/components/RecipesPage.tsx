import { useNavigate } from '@tanstack/react-router'
import { Loader2, RefreshCw, SearchX, Utensils } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecipeSearchState } from '../hooks/useRecipeSearch'
import { ClarificationSheet } from './ClarificationSheet'
import { RecipeCard } from './RecipeCard'

interface RecipesPageProps {
  search: RecipeSearchState
}

export function RecipesPage({ search }: RecipesPageProps) {
  const navigate = useNavigate()

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !search.hasNextPage || search.isLoading) return
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) search.fetchNextPage()
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [search.hasNextPage, search.isLoading, search.fetchNextPage],
  )

  const showEmptyPrompt = !search.hasFilters && search.recipes.length === 0 && search.searchStatus === 'idle'
  const showNoResults = search.hasFilters && !search.isLoading && search.searchStatus !== 'searching' && search.recipes.length === 0 && !search.error && !search.rejected && search.searchStatus !== 'dismissed'
  const showCentered = !search.isLoading && search.searchStatus !== 'searching' && (search.error || search.clarifyError || search.rejected || showNoResults || showEmptyPrompt || search.searchStatus === 'dismissed')

  return (
    <div className={`px-4 pb-4 flex flex-col ${showCentered ? 'h-full' : ''}`}>
      {(search.isLoading || search.searchStatus === 'searching') && (
        <div className="space-y-4 pt-2">
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

      {search.error && !search.isLoading && search.searchStatus !== 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState icon={SearchX} title="Search failed" description={search.error} />
        </div>
      )}

      {search.clarifyError && !search.isLoading && search.searchStatus !== 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState icon={SearchX} title="Couldn't find recipes" description={search.clarifyError} />
        </div>
      )}

      {search.rejected && !search.isLoading && search.searchStatus !== 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState icon={SearchX} title="Can't search that" description={search.rejectionReason ?? 'Query was rejected.'} />
        </div>
      )}

      {showNoResults && !search.isLoading && search.searchStatus !== 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState icon={Utensils} title="No recipes found" description="Try different search terms or filters." />
        </div>
      )}

      {showEmptyPrompt && search.searchStatus !== 'searching' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState icon={Utensils} title="Search for recipes" description="Type an ingredient, cuisine, or dish name to get started." />
        </div>
      )}

      {search.searchStatus === 'dismissed' && !search.isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-5">
            <div className="rounded-full bg-muted p-4">
              <Utensils className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-1">Search cancelled</h2>
              <p className="text-sm text-muted-foreground">You can try searching again with different criteria.</p>
            </div>
          </div>
          <button
            onClick={search.retrySearch}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}

      {search.recipes.length > 0 && !search.isLoading && search.searchStatus !== 'searching' && (
        <>
          {search.recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onPress={() => navigate({ to: '/recipe/$id', params: { id: recipe.id } })}
            />
          ))}
          <div ref={sentinelCallbackRef} className="h-4" />
          {search.isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}

      <ClarificationSheet
        open={search.searchStatus === 'clarifying'}
        clarifications={search.clarifications}
        loading={search.clarifyLoading}
        onSubmit={search.submitClarification}
        onDismiss={search.dismissClarifications}
      />
    </div>
  )
}
