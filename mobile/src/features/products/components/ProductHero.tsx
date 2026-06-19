import { ArrowLeft, ImageOff, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { DragHandle } from '@/components/DragHandle'
import { SuitabilityBadge } from '@/features/suitability/components/SuitabilityBadge'
import type { SuitabilityResult } from '@/features/suitability/types'
import type { CartItem } from '@/providers/CartProvider'
import type { ProductInfo } from '../services/product'

interface ProductHeroProps {
  product: ProductInfo
  suitability: SuitabilityResult | null
  cartItem: CartItem | undefined
  addToCart: (product: ProductInfo) => void
  removeFromCart: (barcode: string) => void
  updateQuantity: (barcode: string, quantity: number) => void
  onBack: () => void
  dragIndicator?: boolean
  peekGradient?: boolean
  hideCartIcon?: boolean
}

export function ProductHero({
  product,
  suitability,
  cartItem,
  addToCart,
  removeFromCart,
  updateQuantity,
  onBack,
  dragIndicator = false,
  peekGradient = false,
  hideCartIcon = false,
}: ProductHeroProps) {
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full h-56">
      <div className="absolute inset-0 bg-overlay-foreground/5 flex items-center justify-center">
        <ImageOff className="w-8 h-8 text-overlay-muted/40" />
      </div>
      {product.imageUrl && !imageError && (
        <img
          src={product.imageUrl}
          alt={product.productName || 'Product'}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {peekGradient && (
        <div className="absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-overlay/60 to-transparent pointer-events-none z-10" />
      )}

      {dragIndicator && (
        <DragHandle variant="light" className="absolute top-0 left-0 right-0 z-10" />
      )}

      <div className="absolute top-0 left-0 z-20 p-3">
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/30 backdrop-blur-md text-white/80 hover:bg-primary/40 hover:scale-[1.02] transition-colors border border-primary/30"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {!hideCartIcon && product.barcode && (
        <div className="absolute top-0 right-0 z-20 p-3">
          {cartItem ? (
            <div className="flex items-center gap-0.5 bg-primary/30 backdrop-blur-md rounded-full px-1.5 py-1 border border-primary/30 hover:scale-[1.02]">
              <button
                className="flex items-center justify-center w-7 h-7 rounded-full text-primary hover:bg-primary-foreground/10 hover:scale-[1.02] transition-colors"
                onClick={() => removeFromCart(cartItem.product.barcode!)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:bg-primary-foreground/10 hover:scale-[1.02] transition-colors"
                onClick={() => {
                  if (cartItem.quantity <= 1) {
                    removeFromCart(cartItem.product.barcode!)
                  } else {
                    updateQuantity(cartItem.product.barcode!, cartItem.quantity - 1)
                  }
                }}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-white/80 text-xs font-semibold tabular-nums min-w-5 text-center">
                {cartItem.quantity}
              </span>
              <button
                className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:bg-primary-foreground/10 hover:scale-[1.02] transition-colors"
                onClick={() => addToCart(product)}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/30 backdrop-blur-md text-white/80 hover:bg-primary/40 hover:scale-[1.02] transition-colors border border-primary/30"
              onClick={() => addToCart(product)}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-linear-to-t from-overlay/80 via-overlay/30 to-transparent pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-bold text-overlay-foreground truncate capitalize">
            {product.productName || 'Unknown Product'}
          </h1>
          {product.brand && (
            <p className="text-overlay-foreground/70 text-base truncate">{product.brand}</p>
          )}
        </div>
        <div className="shrink-0">
          <SuitabilityBadge result={suitability} />
        </div>
      </div>
    </div>
  )
}
