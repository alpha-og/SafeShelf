import { useState, useEffect, useCallback } from 'react'
import { motion, useAnimation, type PanInfo } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProductInfo } from '../services/detection'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { SuitabilityBadge } from '@/features/suitability/components/SuitabilityBadge'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'

interface ProductSheetProps {
  isProcessing: boolean
  result: ProductInfo | null
  error: string | null
  onDismiss: () => void
  dismissRef?: React.MutableRefObject<(() => void) | null>
}

const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight : 700

export function ProductSheet({ isProcessing, result, error, onDismiss, dismissRef }: ProductSheetProps) {
  const navigate = useNavigate()
  const { result: suitability } = useSuitability(result)
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

    if (isFull) {
      if (offset.y > 150 || (offset.y > 50 && velocity.y > 800)) {
        handleDismiss()
        return
      }
      snapTo(0)
      return
    }

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
          className="absolute inset-0 z-10 bg-background/60"
          onClick={() => {
            setIsFull(false)
            snapTo(peekY)
          }}
        />
      )}

      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col bg-background/60 backdrop-blur-2xl rounded-t-3xl"
        style={{ height: '100dvh' }}
        initial={{ y: OFFRANGE }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-foreground/30" />
        </div>

        <div className="flex items-center px-5 pb-2">
          {isFull ? (
            <Button variant="ghost" size="icon" onClick={() => { setIsFull(false); snapTo(peekY) }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <h2 className="text-sm font-semibold text-foreground/70">Product</h2>
          )}
        </div>

        <div className="flex-1 px-5 pb-8 overflow-y-auto">
          {isProcessing ? (
            <div className="space-y-3 pt-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-2xl bg-foreground/10 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-foreground/10 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-foreground/10 rounded w-1/2 animate-pulse" />
                  <div className="h-3 bg-foreground/10 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-destructive font-semibold text-lg mb-2">Oops!</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : result ? (
            <div className="space-y-5 pt-2">
              <div className="flex gap-4">
                {result.imageUrl ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border shadow-sm">
                    <img src={result.imageUrl} alt={result.productName || 'Product'} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 border shadow-sm">
                    <span className="text-muted-foreground text-[10px] font-medium">No Img</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start gap-2">
                    <h3 className="text-base font-bold leading-tight text-foreground truncate">{result.productName || 'Unknown Product'}</h3>
                  </div>
                  {result.brand && <p className="text-xs text-muted-foreground mt-0.5">{result.brand}</p>}
                  {result.barcode && <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono">{result.barcode}</p>}
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <SuitabilityBadge result={suitability} />
                </div>
              </div>

              {result.allergens.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.allergens.map((a, i) => (
                    <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                  ))}
                </div>
              )}

              {suitability?.serving?.flagged && (
                <p className="text-xs text-amber-500 font-medium">
                  Serving size ({suitability.serving.declaredQuantity}{suitability.serving.unit}) is unusually small
                </p>
              )}

              {suitability && suitability.checks.length > 0 && (
                <SuitabilityBreakdown checks={suitability.checks} />
              )}

              {result.barcode && (
                <Button
                  variant="outline"
                  className="w-full gap-2 text-sm font-medium"
                  onClick={() => navigate({ to: '/product/$barcode', params: { barcode: result.barcode! } })}
                >
                  View full details
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
              <p className="text-sm">No product information available.</p>
             </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
