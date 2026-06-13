import { useState, useEffect, useCallback } from 'react'
import { motion, useAnimation, type PanInfo } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProductInfo } from '../services/detection'

interface ProductSheetProps {
  isProcessing: boolean
  result: ProductInfo | null
  error: string | null
  onDismiss: () => void
  dismissRef?: React.MutableRefObject<(() => void) | null>
}

const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight : 700

export function ProductSheet({ isProcessing, result, error, onDismiss, dismissRef }: ProductSheetProps) {
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsFull(false)
                snapTo(peekY)
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <h2 className="text-sm font-semibold text-foreground">Product Details</h2>
          )}
        </div>

        <div className="flex-1 px-4 pb-8 overflow-y-auto">
          {isProcessing ? (
            <div className="space-y-3">
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
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-destructive font-semibold text-lg mb-2">Oops!</p>
              <p className="text-muted-foreground text-sm">{error}</p>
            </div>
          ) : result ? (
            <div className="space-y-6 pb-6">
              <div className="flex gap-4">
                {result.imageUrl ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border shadow-sm">
                    <img src={result.imageUrl} alt={result.productName || 'Product'} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 border shadow-sm">
                    <span className="text-muted-foreground text-xs font-medium">No Image</span>
                  </div>
                )}
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold leading-tight">{result.productName || 'Unknown Product'}</h3>
                  {result.brand && <p className="text-muted-foreground text-sm mt-1">{result.brand}</p>}
                  {result.barcode && <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted/50 px-2 py-1 rounded inline-block">{result.barcode}</p>}
                </div>
              </div>

              {result.categories && result.categories.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Categories</h4>
                  <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {result.categories.map((c, i) => (
                      <span key={i} className="whitespace-nowrap px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.allergens && result.allergens.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3 text-destructive">Allergens Warning</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.allergens.map((a, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold border border-destructive/20">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.ingredients && result.ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Ingredients</h4>
                  <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-4 rounded-2xl border">
                    {result.ingredients.join(', ')}
                  </p>
                </div>
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
