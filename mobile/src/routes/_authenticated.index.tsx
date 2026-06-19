import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BottomNavBar } from '@/components/BottomNavBar'
import { CameraViewfinder } from '@/features/camera/components/CameraViewfinder'
import type { ScanMode } from '@/features/camera/hooks/useCamera'
import { RecipesPage } from '@/features/recipes/components/RecipesPage'
import { SearchScreen } from '@/features/search/components/SearchScreen'

const CAMERA_TAB = 1

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

  // Scan mode lives here so the bottom bar (mode selector) and the viewfinder
  // share it. Entering the camera tab resets it to 'auto'.
  const [mode, setMode] = useState<ScanMode>('auto')
  useEffect(() => {
    if (tab === CAMERA_TAB) setMode('auto')
  }, [tab])

  // When a scan result sheet is open, bump the camera tab's z-index above the
  // bottom bar so the sheet sits on top.
  const [captureActive, setCaptureActive] = useState(false)

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
        className={`flex w-[300vw] h-full relative ${captureActive ? 'z-[60]' : ''}`}
      >
        <div className="w-[100vw] h-full shrink-0 bg-background">
          <RecipesPage />
        </div>
        <div className="w-[100vw] h-full relative overflow-hidden shrink-0">
          <CameraViewfinder mode={mode} onCaptureActiveChange={setCaptureActive} />
        </div>
        <div className="w-[100vw] h-full shrink-0 bg-background">
          <SearchScreen />
        </div>
      </motion.div>

      <BottomNavBar
        activeIndex={tab}
        onChange={setTab}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  )
}
