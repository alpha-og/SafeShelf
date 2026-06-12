import { useState, useEffect, useCallback } from 'react'
import { motion, useAnimation, type PanInfo } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

interface ProductSheetProps {
  onDismiss: () => void
  dismissRef?: React.MutableRefObject<(() => void) | null>
}

const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight : 700

export function ProductSheet({ onDismiss, dismissRef }: ProductSheetProps) {
  const [peekY] = useState(() => (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400))
  const controls = useAnimation()
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    controls.start({
      y: peekY,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
  }, [peekY, controls])

  const snapTo = useCallback((y: number) => {
    controls.start({
      y,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
  }, [controls])

  const handleDismiss = useCallback(async () => {
    await controls.start({
      y: OFFRANGE,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    })
    onDismiss()
  }, [controls, onDismiss])

  useEffect(() => {
    if (dismissRef) {
      dismissRef.current = handleDismiss
    }
  }, [dismissRef, handleDismiss])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info

    if (offset.y > 100 || (offset.y > 30 && velocity.y > 500)) {
      handleDismiss()
      return
    }

    const shouldSnapToFull = offset.y < -50 || velocity.y < -500
    setIsFull(shouldSnapToFull)
    snapTo(shouldSnapToFull ? 0 : peekY)
  }

  return (
    <>
      {isFull && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 bg-background/50"
          onClick={() => {
            setIsFull(false)
            snapTo(peekY)
          }}
        />
      )}

      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-background/50 backdrop-blur-2xl rounded-t-3xl"
        style={{ height: '100dvh' }}
        initial={{ y: OFFRANGE }}
        drag="y"
        dragElastic={{ top: 0, bottom: 0.4 }}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-foreground/40" />
        </div>

        <div className="flex items-center px-4 pb-3">
          {isFull ? (
            <button
              onClick={() => {
                setIsFull(false)
                snapTo(peekY)
              }}
              className="text-foreground/80 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <h2 className="text-sm font-semibold text-foreground">Product Details</h2>
          )}
        </div>

        <div className="flex-1 px-4 space-y-3 overflow-y-auto">
          <div className="h-4 bg-foreground/20 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-1/2 animate-pulse" />
          <div className="h-20 bg-foreground/20 rounded animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-full animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-5/6 animate-pulse" />
          <div className="h-24 bg-foreground/20 rounded animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-foreground/20 rounded w-1/3 animate-pulse" />
        </div>
      </motion.div>
    </>
  )
}
