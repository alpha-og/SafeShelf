import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronDown, ExternalLink, ImageOff, Youtube } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { BANNER_COMPACT, BANNER_FULL, useCollapsibleBanner } from '@/hooks/useCollapsibleBanner'
import { useProfiles } from '@/providers/ProfilesProvider'
import { useStore } from '@/providers/StoreProvider'
import { ProductMiniCard } from '@/features/products/components/ProductMiniCard'
import { getRecipeById, getRecipeProducts, getRecipeQuantities } from '../services/recipe'
import type { AdjustedIngredient } from '../services/recipe'
import type { ProductVariant } from '../services/recipe'

function IngredientProducts({
  options,
  note,
  dietaryPreferences,
  allergens,
  onProductClick,
}: {
  options: ProductVariant[]
  note: string | null
  dietaryPreferences: string[]
  allergens: string[]
  onProductClick: (barcode: string) => void
}) {
  function hasConflict(productName: string): boolean {
    const lower = productName.toLowerCase()
    for (const pref of dietaryPreferences) {
      if (DIETARY_KEYWORDS[pref]?.some((kw) => lower.includes(kw))) return true
    }
    for (const allergen of allergens) {
      const name = allergen.toLowerCase()
      if (name.length > 1 && lower.includes(name)) return true
    }
    return false
  }

  if (options.length === 0) {
    return (
      <div className="px-8 pb-3 space-y-1">
        <span className="text-[11px] text-muted-foreground/40 italic">
          Not available at this store
        </span>
        {note && (
          <p className="text-[10px] text-muted-foreground/60 italic leading-tight">
            {note}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="pl-7 pb-3 overflow-x-auto scrollbar-none space-y-1.5">
      <div className="flex gap-2">
        {options.map((opt) => (
          <ProductMiniCard
            key={opt.barcode}
            productName={opt.product_name}
            productImage={opt.product_image}
            price={opt.price}
            badge={hasConflict(opt.product_name) ? 'conflict' : null}
            onClick={() => onProductClick(opt.barcode)}
          />
        ))}
      </div>
      {note && (
        <p className="text-[10px] text-muted-foreground/60 italic leading-tight px-2">
          {note}
        </p>
      )}
    </div>
  )
}

const DIETARY_KEYWORDS: Record<string, string[]> = {
  vegan: ['meat', 'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'fish', 'seafood',
    'milk', 'cream', 'cheese', 'butter', 'yogurt', 'egg', 'honey', 'gelatin', 'lard',
    'whey', 'casein'],
  vegetarian: ['meat', 'beef', 'chicken', 'pork', 'lamb', 'turkey', 'duck', 'fish',
    'seafood', 'gelatin', 'lard', 'tallow'],
  'dairy-free': ['milk', 'cream', 'cheese', 'butter', 'yogurt', 'whey', 'casein',
    'ghee', 'sour cream'],
  'gluten-free': ['wheat', 'flour', 'bread', 'pasta', 'noodle', 'cracker', 'biscuit',
    'couscous', 'farro', 'spelt', 'rye', 'barley'],
  'nut-free': ['almond', 'walnut', 'pecan', 'cashew', 'pistachio', 'hazelnut',
    'macadamia', 'peanut'],
  'low-sodium': ['salt', 'sodium', 'brine', 'cured', 'smoked', 'soy sauce'],
  'low-sugar': ['sugar', 'syrup', 'honey', 'candy', 'chocolate', 'caramel'],
  'low-fat': ['butter', 'oil', 'cream', 'cheese', 'lard', 'shortening', 'margarine'],
}

function InstructionsSection({ steps }: { steps: string[] }) {
  return (
    <section>
      <SectionHeader>Instructions</SectionHeader>
      <div className="rounded-2xl border border-border overflow-hidden">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex gap-3 px-4 py-3 text-sm ${
              i < steps.length - 1 ? 'border-b border-border' : ''
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
  )
}

export function RecipeDetailPage() {
  const { id } = useParams({ from: '/_authenticated/recipe/$id' })
  const router = useRouter()
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { selectedStoreId } = useStore()
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [openIngredients, setOpenIngredients] = useState<Set<number>>(new Set())
  const initializedRef = useRef(false)

  const { profiles, activeProfile } = useProfiles()
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [desiredServings, setDesiredServings] = useState(4)
  const [adjustedQuantities, setAdjustedQuantities] = useState<AdjustedIngredient[] | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)

  const toggleIngredient = (i: number) => {
    setOpenIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const {
    data: recipe,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipeById(id),
    enabled: !!id,
  })

  const { scrollRef, collapsed } = useCollapsibleBanner()

  const productsQuery = useQuery({
    queryKey: ['recipe-products', id, selectedStoreId],
    queryFn: () => getRecipeProducts(id, selectedStoreId!),
    enabled: !!recipe && !!selectedStoreId,
  })

  useEffect(() => {
    if (!recipe || recipe.ingredients.length === 0 || initializedRef.current) return
    if (!selectedStoreId) {
      setOpenIngredients(new Set(recipe.ingredients.map((_, i) => i)))
      initializedRef.current = true
    } else if (productsQuery.data) {
      const toOpen = new Set<number>()
      recipe.ingredients.forEach((ing, i) => {
        const match = productsQuery.data!.mappings.find(
          (m) => m.ingredient === ing,
        )
        if (match && match.options.length > 0) {
          toOpen.add(i)
        }
      })
      setOpenIngredients(toOpen)
      initializedRef.current = true
    }
  }, [recipe, selectedStoreId, productsQuery.data])

  const selectedProfile = selectedProfileId
    ? profiles.find((p) => p.id === selectedProfileId) ?? null
    : (activeProfile ?? null)

  const initialServingsRef = useRef(false)
  useEffect(() => {
    if (!selectedProfileId && activeProfile) {
      setSelectedProfileId(activeProfile.id)
    }
    if (recipe?.servings && !initialServingsRef.current) {
      setDesiredServings(recipe.servings)
      initialServingsRef.current = true
    }
  }, [activeProfile?.id, recipe?.id, recipe?.servings, selectedProfileId])

  useEffect(() => {
    if (!recipe) {
      setAdjustedQuantities(null)
      return
    }

    let cancelled = false
    setIsAdjusting(true)

    getRecipeQuantities(recipe.id, {
      ingredients: recipe.ingredients,
      measurements: recipe.measurements,
      original_servings: recipe.servings,
      desired_servings: desiredServings,
      dietary_preferences: selectedProfile?.dietaryPreferences ?? [],
      conditions: selectedProfile?.conditions.map((c) => c.name ?? c) ?? [],
      allergens: selectedProfile?.allergens.map((a) => a.name ?? a) ?? [],
      recipe_name: recipe.name,
    })
      .then((res) => {
        if (!cancelled) setAdjustedQuantities(res.ingredients)
      })
      .catch(() => {
        if (!cancelled) setAdjustedQuantities(null)
      })
      .finally(() => {
        if (!cancelled) setIsAdjusting(false)
      })

    return () => {
      cancelled = true
    }
  }, [recipe?.id, selectedProfileId, desiredServings])

  const optionsMap = new Map<string, ProductVariant[]>(
    productsQuery.data?.mappings.map((m) => [m.ingredient, m.options]) ?? [],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <Skeleton className="shrink-0 w-full h-56 !rounded-none" />
        <div className="flex-1 px-4 pt-6 space-y-4">
          <Skeleton className="h-8 rounded-lg w-3/4" />
          <Skeleton className="h-4 rounded w-1/3" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
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
    .map((s) => s.trim().replace(/^(step\s*\d+[\s:-]*|^\d+[.)]\s*)/i, ''))
    .filter(Boolean)

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <motion.div
        animate={{ height: collapsed ? BANNER_COMPACT : BANNER_FULL }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
        className="relative shrink-0 overflow-hidden rounded-b-2xl z-10"
      >
        <motion.div
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[5] bg-linear-to-t from-overlay/80 via-overlay/20 to-transparent pointer-events-none"
        />

        <motion.div
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-10 flex items-end pb-4 px-4 pointer-events-none"
        >
          <div className="flex items-end justify-between w-full gap-2">
            <span className="text-xl font-bold text-white capitalize drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] truncate">
              {recipe.name}
            </span>
            {selectedProfile && (
              <span className="shrink-0 text-xs text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {selectedProfile.name} · {desiredServings}
              </span>
            )}
          </div>
        </motion.div>

        <div className="relative w-full h-56">
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground/40" />
          </div>

          {recipe.thumbnail_url && !imageError && (
            <img
              src={recipe.thumbnail_url}
              alt={recipe.name}
              referrerPolicy="no-referrer"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          <div className="absolute top-0 left-0 z-20 p-3">
            <button
              onClick={() => router.history.back()}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/30 backdrop-blur-md text-white/80 hover:bg-primary/40 hover:scale-[1.02] transition-colors border border-primary/30"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/30 to-transparent pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-5 space-y-1.5">
            <h1 className="text-2xl font-bold text-overlay-foreground capitalize">{recipe.name}</h1>
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
            </div>
            {profiles.length > 1 && (
              <div className="flex gap-1.5 pt-1 overflow-x-auto scrollbar-none">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors ${
                      selectedProfileId === p.id
                        ? 'bg-primary/80 text-primary-foreground border-primary'
                        : 'bg-background/40 text-overlay-foreground/90 border-white/20 backdrop-blur-sm'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 pt-4 space-y-6 pb-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Servings
              </span>
              {isAdjusting && (
                <span className="text-[10px] text-muted-foreground/60 italic">Adjusting...</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDesiredServings(Math.max(1, desiredServings - 1))}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground text-sm"
              >
                −
              </button>
              <span className="text-sm font-semibold tabular-nums w-5 text-center">
                {desiredServings}
              </span>
              <button
                onClick={() => setDesiredServings(desiredServings + 1)}
                className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-foreground text-sm"
              >
                +
              </button>
            </div>
          </div>

          {recipe.ingredients.length > 0 && (
            <section>
              <button
                onClick={() => setIngredientsOpen(!ingredientsOpen)}
                className="flex items-center gap-2 w-full mb-3 hover:scale-[1.02] transition-transform"
              >
                <SectionHeader className="mb-0">Ingredients</SectionHeader>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 ${
                    ingredientsOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>
              {ingredientsOpen && (
                <div className="rounded-2xl border border-border overflow-hidden">
                  {recipe.ingredients.map((ingredient, i) => {
                    const isLast = i === recipe.ingredients.length - 1
                    return (
                      <div
                        key={i}
                        className={`${i % 2 === 0 ? 'bg-muted/30' : ''} ${!isLast ? 'border-b border-border' : ''}`}
                      >
                        <button
                          onClick={() => toggleIngredient(i)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left hover:scale-[1.02] transition-transform"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                          <span className="flex-1 text-foreground">{ingredient}</span>
                          {adjustedQuantities && adjustedQuantities[i] ? (
                            <span className="text-foreground text-xs tabular-nums font-medium">
                              {adjustedQuantities[i].adjusted_measurement}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {recipe.measurements[i] || ''}
                            </span>
                          )}
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 ${
                              openIngredients.has(i) ? '' : '-rotate-90'
                            }`}
                          />
                        </button>

                        {openIngredients.has(i) && selectedStoreId && productsQuery.isLoading && (
                          <div className="px-7 pb-2.5">
                            <div className="flex items-center gap-2 py-1">
                              <Skeleton className="h-3 w-3 rounded-full" />
                              <Skeleton className="h-3 w-40" />
                              <Skeleton className="h-3 w-12 ml-auto" />
                            </div>
                          </div>
                        )}

                        {openIngredients.has(i) && selectedStoreId && !productsQuery.isLoading && (
                          <IngredientProducts
                            options={optionsMap.get(ingredient) ?? []}
                            note={adjustedQuantities?.[i]?.note ?? null}
                            dietaryPreferences={activeProfile?.dietaryPreferences ?? []}
                            allergens={activeProfile?.allergens.map((a) => a.name) ?? []}
                            onProductClick={(barcode) =>
                              navigate({ to: '/product/$barcode', params: { barcode } })
                            }
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {instructionsSteps.length > 0 && (
            <InstructionsSection steps={instructionsSteps} />
          )}

          {(recipe.author_name || recipe.source) && (
            <section className="space-y-1.5">
              <SectionHeader>From</SectionHeader>
              <div className="rounded-2xl border border-border px-4 py-3 space-y-1">
                {recipe.author_name && (
                  <p className="text-sm text-foreground/80">
                    By <span className="font-medium">{recipe.author_name}</span>
                  </p>
                )}
                {recipe.source && (
                  <p className="text-xs text-muted-foreground">
                    Source: {recipe.source === 'foodcom' ? 'Food.com' : recipe.source === 'mealdb' ? 'MealDB' : recipe.source}
                  </p>
                )}
              </div>
            </section>
          )}

          {(recipe.youtube_url || recipe.source_url) && (
            <section className="space-y-2.5">
              <SectionHeader>Links</SectionHeader>
              {recipe.youtube_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-2xl gap-3 h-11 hover:scale-[1.02]"
                  onClick={() => window.open(recipe.youtube_url!, '_blank')}
                >
                  <Youtube className="h-4 w-4 text-destructive shrink-0" />
                  <span className="flex-1 text-left">Watch on YouTube</span>
                </Button>
              )}
              {recipe.source_url && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-2xl gap-3 h-11 hover:scale-[1.02]"
                  onClick={() => window.open(recipe.source_url!, '_blank')}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-left">View Source</span>
                </Button>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
