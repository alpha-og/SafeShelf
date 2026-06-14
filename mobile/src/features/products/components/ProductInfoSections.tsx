import { Badge } from '@/components/ui/badge'

interface ProductInfoSectionsProps {
  categories: string[]
  allergens: string[]
  allergenTraces: string[]
  ingredients: string[]
}

export function ProductInfoSections({
  categories,
  allergens,
  allergenTraces,
  ingredients,
}: ProductInfoSectionsProps) {
  return (
    <>
      {categories.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((c, i) => (
              <Badge key={i} variant="outline">{c}</Badge>
            ))}
          </div>
        </section>
      )}

      {allergens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Allergens</h3>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a, i) => (
              <Badge key={i} variant="destructive">{a}</Badge>
            ))}
          </div>
        </section>
      )}

      {allergenTraces.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">May Contain Traces</h3>
          <div className="flex flex-wrap gap-2">
            {allergenTraces.map((t, i) => (
              <Badge key={i} variant="secondary" className="bg-amber-500 text-white border-amber-500 hover:bg-amber-500">{t}</Badge>
            ))}
          </div>
        </section>
      )}

      {ingredients.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Ingredients ({ingredients.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-white/10 text-sm text-slate-300 border border-white/10">
                {ingredient}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
