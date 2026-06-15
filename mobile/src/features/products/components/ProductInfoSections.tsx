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
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((c, i) => (
              <Badge key={i} variant="outline" className="bg-muted/30 text-muted-foreground border-border hover:scale-105">{c}</Badge>
            ))}
          </div>
        </section>
      )}

      {allergens.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Allergens</h3>
          <div className="flex flex-wrap gap-2">
            {allergens.map((a, i) => (
              <Badge key={i} variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 hover:scale-105">{a}</Badge>
            ))}
          </div>
        </section>
      )}

      {allergenTraces.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">May Contain Traces</h3>
          <div className="flex flex-wrap gap-2">
            {allergenTraces.map((t, i) => (
              <Badge key={i} variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20 hover:scale-105">{t}</Badge>
            ))}
          </div>
        </section>
      )}

      {ingredients.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Ingredients ({ingredients.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {ingredients.map((ingredient, i) => (
              <Badge key={i} variant="outline" className="bg-muted/30 text-muted-foreground border-border hover:scale-105">
                {ingredient}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
