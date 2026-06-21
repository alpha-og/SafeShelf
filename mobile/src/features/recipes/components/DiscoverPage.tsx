import { useCallback, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Loader2, Utensils } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { getRecipeFeed } from '../services/recipe'
import { RecipeCard } from './RecipeCard'

export function DiscoverPage() {
  const navigate = useNavigate()

  const query = useInfiniteQuery({
    queryKey: ['recipe-feed'],
    queryFn: ({ pageParam }) => getRecipeFeed(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success || lastPage.recipes.length === 0) return undefined
      const loaded = lastPage.page * lastPage.page_size
      return loaded < lastPage.total ? lastPage.page + 1 : undefined
    },
    staleTime: 120_000,
  })

  const recipes = query.data?.pages.flatMap((p) => p.recipes) ?? []

  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelCallbackRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !query.hasNextPage || query.isLoading) return
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) query.fetchNextPage()
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [query.hasNextPage, query.isLoading, query.fetchNextPage],
  )

  const showEmpty = !query.isLoading && recipes.length === 0

  return (
    <div className={`px-4 pb-4 pt-2 flex flex-col ${showEmpty ? 'h-full' : ''}`}>
      {query.isLoading && (
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

      {query.error && !query.isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState
            icon={Utensils}
            title="Couldn't load recipes"
            description="Something went wrong. Pull to refresh or try again later."
          />
        </div>
      )}

      {showEmpty && !query.error && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState
            icon={Utensils}
            title="No recipes yet"
            description="Check back later for new recipes."
          />
        </div>
      )}

      {recipes.length > 0 && (
        <>
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onPress={() => navigate({ to: '/recipe/$id', params: { id: recipe.id } })} />
          ))}
          <div ref={sentinelCallbackRef} className="h-4" />
          {query.isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
