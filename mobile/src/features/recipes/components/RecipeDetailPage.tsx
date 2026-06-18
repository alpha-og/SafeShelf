import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Youtube } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getRecipeById } from '../services/recipe'

export function RecipeDetailPage() {
  const { id } = useParams({ from: '/_authenticated/recipe/$id' })
  const navigate = useNavigate()

  const {
    data: recipe,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipeById(id),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <Skeleton className="shrink-0 w-full h-56 !rounded-none" />
        <div className="flex-1 px-4 pt-6 space-y-4">
          <Skeleton className="h-8 rounded-lg w-3/4" />
          <Skeleton className="h-4 rounded w-1/3" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-muted-foreground">Could not load recipe.</p>
        </div>
      </div>
    )
  }

  const instructionsSteps = recipe.instructions
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <div className="relative w-full h-56">
        {recipe.thumbnail_url ? (
          <img
            src={`${recipe.thumbnail_url}/preview`}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground text-sm font-medium">No Image</span>
          </div>
        )}

        <div className="absolute top-0 left-0 z-20 p-3">
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/30 backdrop-blur-md text-white/80 hover:bg-primary/40 transition-colors border border-primary/30"
            onClick={() => navigate({ to: '/recipes' })}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/30 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-1.5">
          <h1 className="text-2xl font-bold text-overlay-foreground">{recipe.name}</h1>
          <div className="flex flex-wrap gap-1.5">
            {recipe.category && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                {recipe.category}
              </Badge>
            )}
            {recipe.area && (
              <Badge
                variant="outline"
                className="text-[11px] px-2 py-0.5 border-white/30 text-overlay-foreground/80"
              >
                {recipe.area}
              </Badge>
            )}
            {recipe.tags.map((tag) => (
              <Badge
                key={tag}
                className="text-[11px] px-2 py-0.5 bg-white/20 text-overlay-foreground/70"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 space-y-6 pb-20">
        {recipe.ingredients.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Ingredients
            </h3>
            <div className="rounded-xl border border-border overflow-hidden">
              {recipe.ingredients.map((ingredient, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    i < recipe.ingredients.length - 1 ? 'border-b border-border' : ''
                  } ${i % 2 === 0 ? 'bg-muted/30' : ''}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                  <span className="flex-1 text-foreground">{ingredient}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {recipe.measurements[i] || ''}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {instructionsSteps.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Instructions
            </h3>
            <div className="rounded-xl border border-border overflow-hidden">
              {instructionsSteps.map((step, i) => (
                <div
                  key={i}
                  className={`flex gap-3 px-4 py-3 text-sm ${
                    i < instructionsSteps.length - 1 ? 'border-b border-border' : ''
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(recipe.youtube_url || recipe.source_url) && (
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Links
            </h3>
            {recipe.youtube_url && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl gap-3 h-11"
                onClick={() => window.open(recipe.youtube_url!, '_blank')}
              >
                <Youtube className="h-4 w-4 text-destructive shrink-0" />
                <span className="flex-1 text-left">Watch on YouTube</span>
              </Button>
            )}
            {recipe.source_url && (
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl gap-3 h-11"
                onClick={() => window.open(recipe.source_url!, '_blank')}
              >
                <span className="flex-1 text-left">View Source</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </Button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
