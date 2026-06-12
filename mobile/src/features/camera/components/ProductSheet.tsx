import { useState, useEffect } from 'react'
import { motion, useAnimation, type PanInfo } from 'framer-motion'

interface ProductSheetProps {
  onRetake: () => void
  cameraAvailable: boolean
}

export function ProductSheet({ onRetake, cameraAvailable }: ProductSheetProps) {
  const [peekY, setPeekY] = useState(400)
  const controls = useAnimation()
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    const py = window.innerHeight * 0.5
    setPeekY(py)
    controls.set({ y: py })
  }, [controls])

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const shouldSnapToFull = info.offset.y < -50 || info.velocity.y < -500
    setIsFull(shouldSnapToFull)
    await controls.start({
      y: shouldSnapToFull ? 0 : peekY,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
  }

  return (
    <>
      {isFull && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 bg-black/50"
          onClick={() => {
            setIsFull(false)
            controls.start({
              y: peekY,
              transition: { type: 'spring', stiffness: 300, damping: 30 },
            })
          }}
        />
      )}

      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-background rounded-t-2xl"
        style={{ height: '100dvh' }}
        drag="y"
        dragConstraints={{ top: 0, bottom: peekY }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-sm font-semibold">Product Details</h2>
          <button
            onClick={onRetake}
            className={`text-xs underline transition-colors ${
              cameraAvailable
                ? 'text-muted-foreground hover:text-foreground'
                : 'text-muted-foreground/60'
            }`}
          >
            Retake
          </button>
        </div>

        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
          <div className="h-20 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-full animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
          <div className="h-24 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        </div>
      </motion.div>
    </>
  )
}
