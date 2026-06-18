import { createFileRoute } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { BottomNavBar } from '@/components/BottomNavBar'
import { CameraViewfinder } from '@/features/camera/components/CameraViewfinder'
import { RecipesPage } from '@/features/recipes/components/RecipesPage'
import { SearchScreen } from '@/features/search/components/SearchScreen'

export const Route = createFileRoute('/_authenticated/')({
  component: SwipeableContainer,
})

function SwipeableContainer() {
  const [index, setIndex] = useState(1)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && index < 2) {
        setIndex(index + 1)
      } else if (deltaX > 0 && index > 0) {
        setIndex(index - 1)
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
        animate={{ x: `${-index * (100 / 3)}%` }}
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
        {index !== 1 && <BottomNavBar key="navbar" activeIndex={index} onChange={setIndex} />}
      </AnimatePresence>
    </div>
  )
}
