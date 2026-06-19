import { AnimatePresence, motion } from 'framer-motion'
import { Camera, ChefHat, ChevronUp, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ScanMode } from '@/features/camera/hooks/useCamera'
import { SCAN_MODES } from '@/features/camera/scanModes'

interface BottomNavBarProps {
  activeIndex: number
  onChange: (index: number) => void
  /** Active camera scan mode — shown on, and selected from, the Camera tab. */
  mode: ScanMode
  onModeChange: (mode: ScanMode) => void
}

const CAMERA_TAB = 1
const tabs = [
  { icon: ChefHat, label: 'Recipes' },
  { icon: Camera, label: 'Camera' },
  { icon: Search, label: 'Inventory' },
]

export function BottomNavBar({ activeIndex, onChange, mode, onModeChange }: BottomNavBarProps) {
  const [modeMenuOpen, setModeMenuOpen] = useState(false)
  const onCamera = activeIndex === CAMERA_TAB
  const activeMode = SCAN_MODES.find((m) => m.value === mode) ?? SCAN_MODES[0]

  // The mode drop-up only makes sense while the Camera tab is active.
  useEffect(() => {
    if (!onCamera) setModeMenuOpen(false)
  }, [onCamera])

  function handleTabClick(i: number) {
    if (i === CAMERA_TAB && onCamera) {
      // Already on camera — toggle the mode selector instead of re-navigating.
      setModeMenuOpen((open) => !open)
    } else {
      onChange(i)
    }
  }

  return (
    <motion.div
      initial={{ y: 24, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 24, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      {/* Drop-up mode menu: all four modes side by side, active highlighted. */}
      <AnimatePresence>
        {modeMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setModeMenuOpen(false)} />
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-primary/30 bg-primary/30 backdrop-blur-md px-1.5 py-1.5 shadow-2xl"
            >
              {SCAN_MODES.map((m) => {
                const isActive = m.value === mode
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      onModeChange(m.value)
                      setModeMenuOpen(false)
                    }}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-primary/50 text-white'
                        : 'text-white/60 hover:text-white/90 hover:bg-primary/20'
                    }`}
                  >
                    <m.icon className="h-5 w-5 shrink-0" />
                    <span className="text-[11px] font-medium leading-none whitespace-nowrap">
                      {m.label}
                    </span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="flex items-center gap-1 bg-primary/30 backdrop-blur-md border border-primary/30 rounded-full px-2 py-1.5 shadow-2xl">
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex
          const isCameraSelector = i === CAMERA_TAB && onCamera
          const Icon = isCameraSelector ? activeMode.icon : tab.icon
          const label = isCameraSelector ? activeMode.label : tab.label
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabClick(i)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive ? 'text-white' : 'text-white/50 hover:text-white/80 hover:scale-[1.02]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/40 rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="h-4 w-4 relative z-10" />
              <span className="relative z-10">{label}</span>
              {isCameraSelector && (
                <ChevronUp
                  className={`h-3.5 w-3.5 relative z-10 transition-transform ${
                    modeMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>
          )
        })}
      </nav>
    </motion.div>
  )
}
