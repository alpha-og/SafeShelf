import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { RecipeItem } from '../services/recipe'

interface RecipeCardProps {
  recipe: RecipeItem
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Card className="overflow-hidden mb-4 shadow-sm">
      <CardContent className="p-0">
        <div className="flex">
          {recipe.thumbnail_url ? (
            <div className="w-28 h-28 shrink-0 bg-muted">
              <img
                src={recipe.thumbnail_url}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-28 h-28 shrink-0 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-xs font-medium">No Image</span>
            </div>
          )}

          <div className="flex-1 p-3 flex flex-col gap-1.5 min-w-0">
            <h3 className="font-semibold leading-tight line-clamp-2 text-sm">
              {recipe.name}
            </h3>

            <div className="flex flex-wrap gap-1">
              {recipe.category && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {recipe.category}
                </Badge>
              )}
              {recipe.area && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {recipe.area}
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mt-auto">
              {recipe.ingredients.slice(0, 4).join(', ')}
              {recipe.ingredients.length > 4 && ' …'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
