import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RecipeFilterSheet } from './RecipeFilterSheet'

interface RecipeSearchBarProps {
  searchText: string
  onSearchChange: (value: string) => void
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  selectedAreas: string[]
  onAreasChange: (areas: string[]) => void
  hasFilters: boolean
  onClearAll: () => void
}

export function RecipeSearchBar({
  searchText,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
  selectedAreas,
  onAreasChange,
  hasFilters,
  onClearAll,
}: RecipeSearchBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 rounded-xl border border-input bg-background px-3 py-1.5">
        <div className="relative flex-1">
          <Input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search recipes…"
            className="border-0 bg-transparent pr-7 py-1.5 h-auto text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <RecipeFilterSheet
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          selectedAreas={selectedAreas}
          onAreasChange={onAreasChange}
          hasFilters={hasFilters}
          onClearAll={onClearAll}
        />
      </div>

      {hasFilters && (
        <div className="flex items-center gap-1.5 overflow-x-auto flex-nowrap scrollbar-none">
          {selectedCategories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1 pl-2 pr-1 py-1 text-xs whitespace-nowrap">
              {cat}
              <button onClick={() => onCategoriesChange(selectedCategories.filter((c) => c !== cat))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedAreas.map((area) => (
            <Badge key={area} variant="outline" className="gap-1 pl-2 pr-1 py-1 text-xs whitespace-nowrap">
              {area}
              <button onClick={() => onAreasChange(selectedAreas.filter((a) => a !== area))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground ml-1 shrink-0"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
