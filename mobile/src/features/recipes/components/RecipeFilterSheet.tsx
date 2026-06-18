import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { DragHandle } from '@/components/DragHandle'
import { Button } from '@/components/ui/button'

const CATEGORIES = [
  'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork',
  'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat',
]

const AREAS = [
  'American', 'British', 'Canadian', 'Chinese', 'French', 'Greek', 'Indian',
  'Irish', 'Italian', 'Japanese', 'Mexican', 'Moroccan', 'Polish', 'Spanish',
  'Thai', 'Vietnamese',
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
        className="rounded-lg h-8 w-8 shrink-0 bg-primary/10 backdrop-blur-md border-primary/20 hover:bg-primary/20"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
            style={{ height: '70dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_: unknown, info: PanInfo) => {
              const { offset, velocity } = info
              if (offset.y > 100 || (offset.y > 30 && velocity.y > 500)) {
                handleDismiss()
              }
            }}
          >
            <div className="flex-1 flex flex-col min-h-0">
              <DragHandle variant="dark" />

              <div className="shrink-0 flex gap-2 px-4 pb-3">
                <button
                  onClick={() => setActiveTab('category')}
                  className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'category'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground border border-border'
                  }`}
                >
                  Category{selectedCategories.length > 0 && ` (${selectedCategories.length})`}
                </button>
                <button
                  onClick={() => setActiveTab('area')}
                  className={`flex-1 h-8 text-xs font-medium rounded-lg transition-colors ${
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
