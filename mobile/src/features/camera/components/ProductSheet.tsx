import { useState } from 'react'
import { motion, useAnimation, type PanInfo } from 'framer-motion'

interface ProductSheetProps {
  onRetake: () => void
  cameraAvailable: boolean
}

export function ProductSheet({ onRetake, cameraAvailable }: ProductSheetProps) {
  const [peekY] = useState(() => (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400))
  const controls = useAnimation()
  const [isFull, setIsFull] = useState(false)

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
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-black/30 backdrop-blur-xl rounded-t-3xl"
        style={{ height: '100dvh' }}
        initial={{ y: peekY }}
        drag="y"
        dragConstraints={{ top: 0, bottom: peekY }}
        dragElastic={0.1}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/40" />
        </div>

        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-sm font-semibold text-white/90">Product Details</h2>
          <button
            onClick={onRetake}
            className={`text-xs underline transition-colors ${
              cameraAvailable
                ? 'text-white/60 hover:text-white/90'
                : 'text-white/40'
            }`}
          >
            Retake
          </button>
        </div>

        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-1/2 animate-pulse" />
          <div className="h-20 bg-white/20 rounded animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-full animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-5/6 animate-pulse" />
          <div className="h-24 bg-white/20 rounded animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-white/20 rounded w-1/3 animate-pulse" />
        </div>
      </motion.div>
    </>
  )
}
