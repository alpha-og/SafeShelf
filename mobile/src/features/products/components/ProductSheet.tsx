import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { BottomCta } from '@/components/BottomCta'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
  const { items, addToCart, removeFromCart, updateQuantity } = useCart()
  const cartItem = result?.barcode
    ? items.find((i) => i.product.barcode === result.barcode)
    : undefined

  const [isFull, setIsFull] = useState(false)
  const open = !!(result || isProcessing || error)

  return (
    <BottomSheet
      open={open}
      onDismiss={onDismiss}
      snapPoints={{ peek: 50, full: 0 }}
      showDragHandle={false}
      topOffset={topOffset}
      portal={false}
      dragMomentum={false}
      dismissRef={dismissRef}
      onSnapChange={setIsFull}
    >
      {isProcessing ? (
        <>
          <div className="flex-1 px-4 space-y-4 pt-10">
            <Skeleton className="w-full h-56" />
            <Skeleton className="h-8 rounded-lg w-3/4 mx-auto" />
            <Skeleton className="h-4 rounded w-1/2 mx-auto" />
          </div>
        </>
      ) : error ? (
        <>
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
            onBack={onDismiss}
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
    </BottomSheet>
  )
}
