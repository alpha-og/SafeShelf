import { useNavigate } from '@tanstack/react-router'
import { motion, type PanInfo, useAnimation } from 'framer-motion'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { BottomCta } from '@/components/BottomCta'
import { DragHandle } from '@/components/DragHandle'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CartCta } from '@/features/cart/components/CartCta'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { useCart } from '@/providers/CartProvider'
import type { ProductInfo } from '../services/product'
import { ProductHero } from './ProductHero'
import { ProductServingNote } from './ProductServingNote'

interface ProductSheetProps {
  isProcessing: boolean
  result: ProductInfo | null
  error: string | null
  onDismiss: () => void
  dismissRef?: React.MutableRefObject<(() => void) | null>
  topOffset?: number
}

const OFFRANGE = typeof window !== 'undefined' ? window.innerHeight : 700

export function ProductSheet({
  isProcessing,
  result,
  error,
  onDismiss,
  dismissRef,
  topOffset = 0,
}: ProductSheetProps) {
  const navigate = useNavigate()
  const { result: suitability } = useSuitability(result)
  const [peekY] = useState(() => (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400))
  const controls = useAnimation()
  const [isFull, setIsFull] = useState(false)
  const { items, addToCart, removeFromCart, updateQuantity } = useCart()
  const cartItem = result?.barcode
    ? items.find((i) => i.product.barcode === result.barcode)
    : undefined

  useEffect(() => {
    if (result || isProcessing || error) {
      controls.start({
        y: peekY,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      })
    }
  }, [result, isProcessing, error, controls, peekY])

  const snapTo = useCallback(
    (y: number) => {
      controls.start({
        y,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      })
    },
    [controls],
  )

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
      if (offset.y > 0) {
        if (offset.y > 150 || (offset.y > 50 && velocity.y > 800)) {
          handleDismiss()
          return
        }
        setIsFull(false)
        snapTo(peekY)
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
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
        style={{ height: `calc(100dvh - ${topOffset}px)` }}
        initial={{ y: OFFRANGE }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        animate={controls}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 rounded-t-3xl flex flex-col min-h-0 bg-background text-foreground">
          {isProcessing ? (
            <>
              <DragHandle variant="dark" className="relative z-20" />
              <div className="flex-1 px-4 space-y-4 pt-10">
                <Skeleton className="w-full h-56" />
                <Skeleton className="h-8 rounded-lg w-3/4 mx-auto" />
                <Skeleton className="h-4 rounded w-1/2 mx-auto" />
              </div>
            </>
          ) : error ? (
            <>
              <DragHandle variant="dark" className="relative z-20" />
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4 opacity-80" />
                <p className="text-destructive font-bold text-xl mb-2">Oops!</p>
                <p className="text-muted-foreground text-sm max-w-62.5">{error}</p>
              </div>
            </>
          ) : result ? (
            <div className="flex flex-col flex-1 min-h-0 pb-(--sab)">
              <ProductHero
                product={result}
                suitability={suitability}
                cartItem={cartItem}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                updateQuantity={updateQuantity}
                onBack={handleDismiss}
                dragIndicator
                peekGradient={!isFull}
                hideCartIcon={isFull}
              />

              <div className="flex flex-col flex-1 min-h-0 overflow-y-auto px-4 pt-6 space-y-6 relative z-20 no-scrollbar">
                <ProductServingNote serving={suitability?.serving} />

                {suitability && suitability.checks.length > 0 && (
                  <SuitabilityBreakdown checks={suitability.checks} />
                )}

                {result.barcode && (
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-sm font-medium hover:scale-[1.02]"
                    onClick={() =>
                      navigate({ to: '/product/$barcode', params: { barcode: result.barcode! } })
                    }
                  >
                    View full details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}

                {result.barcode && (
                  <div className="flex justify-center">
                    <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase">
                      Barcode: {result.barcode}
                    </p>
                  </div>
                )}
              </div>

              <BottomCta variant="static">
                <CartCta
                  product={result}
                  cartItem={cartItem}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  suitability={suitability}
                />
              </BottomCta>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <p className="text-sm">No product information available.</p>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}
