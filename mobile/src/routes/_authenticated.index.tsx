import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useRef } from 'react'
import { BottomNavBar } from '@/components/BottomNavBar'
import { CameraViewfinder } from '@/features/camera/components/CameraViewfinder'
import { RecipesPage } from '@/features/recipes/components/RecipesPage'
import { SearchScreen } from '@/features/search/components/SearchScreen'

function validateSearch(search: Record<string, unknown>): { tab?: number } {
  const raw = search.tab
  if (raw !== undefined) {
    const tab = Number(raw)
    if (!Number.isNaN(tab)) {
      return { tab }
    }
  }
  return {}
}

export const Route = createFileRoute('/_authenticated/')({
  component: SwipeableContainer,
  validateSearch,
})

function SwipeableContainer() {
  const navigate = Route.useNavigate()
  const { tab = 1 } = Route.useSearch()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const setTab = useCallback(
    (newTab: number) => {
      navigate({ search: { tab: newTab }, replace: true })
    },
    [navigate],
  )

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && tab < 2) {
        setTab(tab + 1)
      } else if (deltaX > 0 && tab > 0) {
        setTab(tab - 1)
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      className="w-full h-full overflow-hidden relative bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        initial={false}
        animate={{ x: `${-tab * (100 / 3)}%` }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="flex w-[300vw] h-full"
      >
        <div className="w-[100vw] h-full shrink-0 bg-background">
          <RecipesPage />
        </div>
        <div className="w-[100vw] h-full relative overflow-hidden shrink-0">
          <CameraViewfinder />
        </div>
        <div className="w-[100vw] h-full shrink-0 bg-background">
          <SearchScreen />
        </div>
      </motion.div>

      <AnimatePresence>
        {tab !== 1 && <BottomNavBar key="navbar" activeIndex={tab} onChange={setTab} />}
      </AnimatePresence>
    </div>
  )
}
