import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DragHandle } from '@/components/DragHandle'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onDismiss: () => void
  children: React.ReactNode
  height?: string
  snapPoints?: { peek: number; full: number }
  showDragHandle?: boolean
  topOffset?: number
  showOverlay?: boolean
  overlayDismiss?: boolean
  portal?: boolean
  dragMomentum?: boolean
  className?: string
  dismissRef?: React.MutableRefObject<(() => void) | null>
  onSnapChange?: (isFull: boolean) => void
}

const SPRING = { type: 'spring' as const, stiffness: 300, damping: 30 }
const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight + 200 : 1000

export function BottomSheet({
  open,
  onDismiss,
  children,
  height = '70dvh',
  snapPoints,
  showDragHandle = true,
  topOffset = 0,
  showOverlay = true,
  overlayDismiss = true,
  portal = true,
  dragMomentum = true,
  className,
  dismissRef: externalDismissRef,
  onSnapChange,
}: BottomSheetProps) {
  const hasSnap = !!snapPoints

  return hasSnap ? (
    <SnapSheet
      open={open}
      onDismiss={onDismiss}
      snapPoints={snapPoints!}
      showDragHandle={showDragHandle}
      topOffset={topOffset}
      portal={portal}
      dragMomentum={dragMomentum}
      className={className}
      dismissRef={externalDismissRef}
      onSnapChange={onSnapChange}
    >
      {children}
    </SnapSheet>
  ) : (
    <SimpleSheet
      open={open}
      onDismiss={onDismiss}
      height={height}
      showDragHandle={showDragHandle}
      showOverlay={showOverlay}
      overlayDismiss={overlayDismiss}
      portal={portal}
      className={className}
      dismissRef={externalDismissRef}
    >
      {children}
    </SimpleSheet>
  )
}

function SimpleSheet({
  open,
  onDismiss,
  children,
  height,
  showDragHandle,
  showOverlay,
  overlayDismiss,
  portal,
  className,
  dismissRef: externalDismissRef,
}: Omit<BottomSheetProps, 'snapPoints'> & { height: string }) {
  const handleDismiss = useCallback(() => onDismiss(), [onDismiss])

  useEffect(() => {
    if (externalDismissRef) {
      externalDismissRef.current = handleDismiss
    }
  }, [externalDismissRef, handleDismiss])

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info
      if (offset.y > 100 || (offset.y > 30 && velocity.y > 500)) {
        onDismiss()
      }
    },
    [onDismiss],
  )

  const sheet = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bottom-sheet"
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex flex-col bg-background rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]',
            className,
          )}
          style={{ height }}
          initial={{ y: OFFRANGE }}
          animate={{ y: 0 }}
          exit={{ y: OFFRANGE }}
          transition={SPRING}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="flex-1 flex flex-col min-h-0 text-foreground">
            {showDragHandle && <DragHandle variant="dark" />}
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const overlay = showOverlay && (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bottom-sheet-overlay"
          className="fixed inset-0 z-50 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (overlayDismiss) handleDismiss()
          }}
          onTouchStart={(e) => e.stopPropagation()}
        />
      )}
    </AnimatePresence>
  )

  const container = (
    <>
      {overlay}
      {sheet}
    </>
  )

  if (portal) return createPortal(container, document.body)
  return container
}

function SnapSheet({
  open,
  onDismiss,
  children,
  snapPoints,
  showDragHandle,
  topOffset,
  portal,
  dragMomentum,
  className,
  dismissRef: externalDismissRef,
  onSnapChange,
}: Omit<BottomSheetProps, 'height' | 'showOverlay' | 'overlayDismiss'> & {
  snapPoints: NonNullable<BottomSheetProps['snapPoints']>
  topOffset: number
}) {
  const [isFull, setIsFull] = useState(false)
  const [rendered, setRendered] = useState(open)
  const [targetY, setTargetY] = useState(OFFRANGE)
  const wasFullRef = useRef(false)
  const dismissingRef = useRef(false)

  const peekY = useMemo(
    () =>
      typeof window !== 'undefined'
        ? window.innerHeight * (snapPoints.peek / 100) + topOffset
        : 400,
    [snapPoints, topOffset],
  )

  useEffect(() => {
    if (open) {
      dismissingRef.current = false
      setRendered(true)
      setTargetY(peekY)
    } else if (rendered) {
      snapDismiss()
    }
  }, [open, rendered])

  useEffect(() => {
    onSnapChange?.(isFull)
  }, [isFull, onSnapChange])

  const snapDismiss = useCallback(() => {
    if (dismissingRef.current) return
    dismissingRef.current = true
    setTargetY(OFFRANGE)
  }, [])

  useEffect(() => {
    if (externalDismissRef) {
      externalDismissRef.current = snapDismiss
    }
  }, [externalDismissRef, snapDismiss])

  const handleAnimationComplete = useCallback(() => {
    if (dismissingRef.current) {
      dismissingRef.current = false
      setRendered(false)
      onDismiss()
    }
  }, [onDismiss])

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const { offset, velocity } = info

      if (wasFullRef.current) {
        if (offset.y > 0) {
          if (offset.y > 150 || (offset.y > 50 && velocity.y > 800)) {
            snapDismiss()
            return
          }
          wasFullRef.current = false
          setIsFull(false)
          setTargetY(peekY)
          return
        }
        setTargetY(0)
        return
      }

      if (offset.y > 100 || (offset.y > 30 && velocity.y > 500)) {
        snapDismiss()
        return
      }

      const shouldSnapToFull = offset.y < -50 || velocity.y < -500
      wasFullRef.current = shouldSnapToFull
      setIsFull(shouldSnapToFull)
      setTargetY(shouldSnapToFull ? 0 : peekY)
    },
    [peekY, snapDismiss],
  )

  const sheet = rendered && (
    <motion.div
      key="bottom-sheet"
      className={cn(
        'absolute inset-x-0 bottom-0 z-[60] flex flex-col bg-background rounded-t-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)]',
        className,
      )}
      style={{ height: `calc(100dvh - ${topOffset}px)` }}
      initial={{ y: OFFRANGE }}
      animate={{ y: targetY }}
      transition={SPRING}
      drag="y"
      dragConstraints={{ top: 0 }}
      dragElastic={{ top: 0, bottom: 0.4 }}
      dragMomentum={dragMomentum}
      onDragEnd={handleDragEnd}
      onAnimationComplete={handleAnimationComplete}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="flex-1 flex flex-col min-h-0 text-foreground">
        {showDragHandle && <DragHandle variant="dark" />}
        {children}
      </div>
    </motion.div>
  )

  const overlay = (
    <AnimatePresence>
      {isFull && (
        <motion.div
          key="bottom-sheet-overlay"
          className="absolute inset-0 z-10 bg-background/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            wasFullRef.current = false
            setIsFull(false)
            setTargetY(peekY)
          }}
          onTouchStart={(e) => e.stopPropagation()}
        />
      )}
    </AnimatePresence>
  )

  const container = (
    <>
      {overlay}
      {sheet}
    </>
  )

  if (portal) return createPortal(container, document.body)
  return container
}
