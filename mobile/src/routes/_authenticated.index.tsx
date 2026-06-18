import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { CameraViewfinder } from '@/features/camera/components/CameraViewfinder'
import { SearchScreen } from '@/features/search/components/SearchScreen'

export const Route = createFileRoute('/_authenticated/')({
  component: SwipeableContainer,
})

function SwipeableContainer() {
  const [index, setIndex] = useState(0) // 0: Camera, 1: Search
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const deltaX = touchEndX - touchStartX.current
    const deltaY = touchEndY - touchStartY.current

    // Check if swipe is mostly horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX < 0 && index === 0) {
        // Swiped left
        setIndex(1)
      } else if (deltaX > 0 && index === 1) {
        // Swiped right
        setIndex(0)
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
        animate={{ x: `${-index * 50}%` }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="flex w-[200vw] h-full"
      >
        <div className="w-[100vw] h-full relative overflow-hidden shrink-0">
          <CameraViewfinder />
        </div>
        <div className="w-[100vw] h-full overflow-hidden shrink-0">
          <SearchScreen />
        </div>
      </motion.div>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-50 pointer-events-none">
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            index === 0 ? 'bg-white' : 'bg-white/40'
          }`}
        />
        <div
          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
            index === 1 ? 'bg-white' : 'bg-white/40'
          }`}
        />
      </div>
    </div>
  )
}

