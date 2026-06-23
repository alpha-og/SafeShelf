import { useCallback, useEffect, useState } from 'react'
import { Compass, Search as SearchIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { getItem, setItem } from '@/lib/storage'
import { useRecipeSearch } from '../hooks/useRecipeSearch'
import { DiscoverPage } from './DiscoverPage'
import { RecipeSearchBar } from './RecipeSearchBar'
import { RecipesPage } from './RecipesPage'

type Tab = 'discover' | 'search'

const TAB_STORAGE_KEY = 'recipe_active_tab'

const spring = { type: 'spring', stiffness: 500, damping: 30, mass: 1 } as const
const fade = { duration: 0.15 }

export function RecipeHub() {
  const [activeTab, setActiveTab] = useState<Tab>('discover')
  const search = useRecipeSearch()

  useEffect(() => {
    getItem<Tab>(TAB_STORAGE_KEY).then((saved) => {
      if (saved === 'search' || saved === 'discover') {
        setActiveTab(saved)
      }
    })
  }, [])

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setItem(TAB_STORAGE_KEY, tab)
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-start gap-2 shrink-0">
          {activeTab === 'search' && (
            <div className="flex-1 min-w-0">
              <RecipeSearchBar
                searchText={search.searchText}
                onSearchChange={search.setSearchText}
                selectedCategories={search.selectedCategories}
                onCategoriesChange={search.setSelectedCategories}
                selectedAreas={search.selectedAreas}
                onAreasChange={search.setSelectedAreas}
                hasFilters={search.hasFilters}
                onClearAll={search.clearAll}
                generateAiRecipe={search.generateAiRecipe}
                onGenerateAiRecipeChange={search.setGenerateAiRecipe}
              />
            </div>
          )}
          <motion.div
            layout
            transition={spring}
            className={activeTab === 'discover' ? 'flex-1 flex justify-center' : 'shrink-0'}
          >
            <div className="inline-flex gap-0.5 bg-primary/30 backdrop-blur-md border border-primary/30 rounded-full p-0.5 shadow-2xl">
              <AnimatePresence mode="popLayout">
                {activeTab === 'search' ? (
                  <motion.div
                    key="icons"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={spring}
                    className="flex gap-0.5"
                  >
                    <button onClick={() => handleTabChange('discover')} className="flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 transition-all duration-200 hover:bg-primary/40 hover:text-foreground hover:scale-105 active:scale-90">
                      <Compass className="h-4 w-4" />
                    </button>
                    <button className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/40 text-foreground transition-all duration-200 hover:scale-105 active:scale-90">
                      <SearchIcon className="h-4 w-4" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="text"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={spring}
                    className="flex gap-0.5"
                  >
                    <button className="flex items-center h-9 px-5 text-sm font-medium rounded-full bg-primary/40 text-foreground transition-all duration-200 hover:scale-105 active:scale-90">
                      Discover
                    </button>
                    <button onClick={() => handleTabChange('search')} className="flex items-center h-9 px-5 text-sm font-medium rounded-full text-foreground/60 transition-all duration-200 hover:bg-primary/40 hover:text-foreground hover:scale-105 active:scale-90">
                      Search
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="popLayout">
          {activeTab === 'discover' ? (
            <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="flex-1">
              <DiscoverPage />
            </motion.div>
          ) : (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={fade} className="flex-1">
              <RecipesPage search={search} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
