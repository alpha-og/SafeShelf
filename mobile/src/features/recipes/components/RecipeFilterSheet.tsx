import { Check, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  'Beef',
  'Chicken',
  'Dessert',
  'Lamb',
  'Miscellaneous',
  'Pasta',
  'Pork',
  'Seafood',
  'Side',
  'Starter',
  'Vegan',
  'Vegetarian',
  'Breakfast',
  'Goat',
]

const AREAS = [
  'American',
  'British',
  'Canadian',
  'Chinese',
  'French',
  'Greek',
  'Indian',
  'Irish',
  'Italian',
  'Japanese',
  'Mexican',
  'Moroccan',
  'Polish',
  'Spanish',
  'Thai',
  'Vietnamese',
]

interface RecipeFilterSheetProps {
  selectedCategories: string[]
  onCategoriesChange: (categories: string[]) => void
  selectedAreas: string[]
  onAreasChange: (areas: string[]) => void
  hasFilters: boolean
  onClearAll: () => void
}

export function RecipeFilterSheet({
  selectedCategories,
  onCategoriesChange,
  selectedAreas,
  onAreasChange,
  hasFilters,
  onClearAll,
}: RecipeFilterSheetProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'category' | 'area'>('category')

  const handleDismiss = () => setOpen(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-full h-8 w-8 shrink-0 bg-primary/30 backdrop-blur-md border border-primary/30 hover:bg-primary/40"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>

      <BottomSheet open={open} onDismiss={handleDismiss} height="70dvh">
        <div className="shrink-0 flex gap-2 px-4 pb-3">
          <button
            onClick={() => setActiveTab('category')}
            className={`flex-1 h-8 text-xs font-medium rounded-full transition-colors hover:scale-[1.02] ${
              activeTab === 'category'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground border border-border'
            }`}
          >
            Category{selectedCategories.length > 0 && ` (${selectedCategories.length})`}
          </button>
          <button
            onClick={() => setActiveTab('area')}
            className={`flex-1 h-8 text-xs font-medium rounded-full transition-colors hover:scale-[1.02] ${
              activeTab === 'area'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground border border-border'
            }`}
          >
            Cuisine{selectedAreas.length > 0 && ` (${selectedAreas.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {activeTab === 'category' ? (
            <div className="rounded-xl border border-border overflow-hidden">
              {CATEGORIES.map((cat, i) => {
                const active = selectedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() =>
                      onCategoriesChange(
                        active
                          ? selectedCategories.filter((c) => c !== cat)
                          : [...selectedCategories, cat],
                      )
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-primary/[0.07] ${
                      i < CATEGORIES.length - 1 ? 'border-b border-border' : ''
                    } ${active ? 'bg-primary/[0.05]' : ''}`}
                  >
                    <span className="flex-1">{cat}</span>
                    {active && <Check className="h-4 w-4 text-foreground shrink-0" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {AREAS.map((area, i) => {
                const active = selectedAreas.includes(area)
                return (
                  <button
                    key={area}
                    onClick={() =>
                      onAreasChange(
                        active
                          ? selectedAreas.filter((a) => a !== area)
                          : [...selectedAreas, area],
                      )
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors hover:bg-primary/[0.07] ${
                      i < AREAS.length - 1 ? 'border-b border-border' : ''
                    } ${active ? 'bg-primary/[0.05]' : ''}`}
                  >
                    <span className="flex-1">{area}</span>
                    {active && <Check className="h-4 w-4 text-foreground shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {hasFilters && (
          <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                onClearAll()
                handleDismiss()
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear all filters
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  )
}
