import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Image, Scan, ScanLine } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { ScanMode } from '../hooks/useCamera'

interface ModeOption {
  value: ScanMode
  label: string
  icon: typeof Scan
}

const modes: ModeOption[] = [
  { value: 'auto', label: 'Auto', icon: Scan },
  { value: 'barcode', label: 'Barcode', icon: ScanLine },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'nutrient-label', label: 'Nutrient', icon: FileText },
]

interface ModeSwitcherProps {
  mode: ScanMode
  onModeChange: (mode: ScanMode) => void
  cameraAvailable: boolean
}

const variants = {
  enter: (direction: number) => ({ x: direction * 16, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -16, opacity: 0 }),
}

export function ModeSwitcher({ mode, onModeChange, cameraAvailable }: ModeSwitcherProps) {
  const touchStartX = useRef(0)
  const [direction, setDirection] = useState(1)

  const currentIndex = modes.findIndex((m) => m.value === mode)

  const goNext = useCallback(() => {
    setDirection(1)
    const next = (currentIndex + 1) % modes.length
    onModeChange(modes[next].value)
  }, [currentIndex, onModeChange])

  const goPrev = useCallback(() => {
    setDirection(-1)
    const prev = (currentIndex - 1 + modes.length) % modes.length
    onModeChange(modes[prev].value)
  }, [currentIndex, onModeChange])

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation()
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation()
    const diff = e.changedTouches[0].clientX - touchStartX.current
    const threshold = 30
    if (diff > threshold) {
      goPrev()
    } else if (diff < -threshold) {
      goNext()
    }
  }

  const current = modes[currentIndex]
  const Icon = current.icon

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`flex items-center justify-center gap-2 w-32 backdrop-blur-md rounded-full border px-3 py-2 select-none ${
        cameraAvailable
          ? 'bg-primary/30 hover:scale-[1.02] border-primary/30'
          : 'bg-primary/20 hover:scale-[1.02] border-primary/20'
      }`}
    >
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={mode}
          className="flex items-center justify-center gap-2"
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.15, ease: 'easeInOut' }}
        >
          <Icon
            className={`h-5 w-5 shrink-0 ${cameraAvailable ? 'text-white/80' : 'text-white/50'}`}
          />
          <div className="flex flex-col items-center gap-1">
            <span
              className={`text-xs font-medium leading-tight ${cameraAvailable ? 'text-white/80' : 'text-white/50'}`}
            >
              {current.label}
            </span>
            <div className="flex items-center gap-1">
              {modes.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-200 shrink-0 bg-white ${
                    i === currentIndex
                      ? cameraAvailable
                        ? 'opacity-80 w-1 h-1'
                        : 'opacity-50 w-1 h-1'
                      : cameraAvailable
                        ? 'opacity-30 w-[5px] h-[5px]'
                        : 'opacity-15 w-[5px] h-[5px]'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
