import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { RecipeItem } from '../services/recipe'

interface RecipeCardProps {
  recipe: RecipeItem
  onPress?: () => void
}

export function RecipeCard({ recipe, onPress }: RecipeCardProps) {
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <Card
      className="overflow-hidden mb-4 shadow-sm active:scale-[0.98] transition-transform"
      onClick={onPress}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-28 h-28 shrink-0 bg-background rounded-l-xl overflow-hidden border-r border-border/50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-muted-foreground/40" />
            </div>
            {recipe.thumbnail_url && !imageError && (
              <img
                src={recipe.thumbnail_url}
                alt={recipe.name}
                className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="flex-1 p-3 flex flex-col gap-1.5 min-w-0">
            <h3 className="font-semibold leading-tight line-clamp-2 text-sm">{recipe.name}</h3>

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
