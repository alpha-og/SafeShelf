import { ShoppingCart, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { QuantityAdjuster } from '@/components/QuantityAdjuster'
import { ShinyButton } from '@/components/reactbits/ShinyButton'
import type { ProductInfo } from '@/features/products/services/product'
import type { SuitabilityResult } from '@/features/suitability/types'
import type { CartItem } from '@/providers/CartProvider'
import { useProfiles } from '@/providers/ProfilesProvider'

interface CartCtaProps {
  product: ProductInfo
  cartItem: CartItem | undefined
  addToCart: (product: ProductInfo) => void
  removeFromCart: (barcode: string) => void
  updateQuantity: (barcode: string, quantity: number) => void
  /** Suitability of this product for the active selection. When unsuitable,
   *  the first add asks for confirmation. */
  suitability?: SuitabilityResult | null
}

export function CartCta({
  product,
  cartItem,
  addToCart,
  removeFromCart,
  updateQuantity,
  suitability,
}: CartCtaProps) {
  const { activeProfile, activeGroup } = useProfiles()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!product.barcode) return null

  const isUnsuitable = suitability?.overall === 'unsuitable'

  // Whom this product is unsuitable for — named specifically under Group Buy.
  const who = activeGroup
    ? `your group "${activeGroup.name}"`
    : (activeProfile?.name ?? 'the selected profile')
  const affected = activeGroup
    ? [
        ...new Set(
          (suitability?.checks ?? [])
            .filter((c) => c.status === 'fail' && c.owners)
            .flatMap((c) => c.owners ?? []),
        ),
      ]
    : []
  const description =
    affected.length > 0
      ? `This product is unsuitable for ${who} — affects ${affected.join(', ')}. Add it anyway?`
      : `This product is unsuitable for ${who}. Add it anyway?`

  const handleAdd = () => {
    if (isUnsuitable) setConfirmOpen(true)
    else addToCart(product)
  }

  if (cartItem) {
    return (
      <div className="h-14 flex items-center gap-2 bg-mauve-500/15 border border-primary/50 rounded-2xl pl-3 pr-1 shadow-sm">
        <button
          type="button"
          className="flex items-center justify-center w-10 h-10 rounded-full text-primary/50 hover:bg-primary/20 hover:text-primary hover:scale-[1.02] transition-colors shrink-0"
          onClick={() => removeFromCart(cartItem.product.barcode!)}
        >
          <Trash2 className="h-5 w-5" />
        </button>

        <div className="flex-1 text-center">
          <span className="text-primary text-sm font-bold">{cartItem.quantity} in cart</span>
        </div>

        <QuantityAdjuster
          quantity={cartItem.quantity}
          onDecrement={() => {
            if (cartItem.quantity <= 1) {
              removeFromCart(cartItem.product.barcode!)
            } else {
              updateQuantity(cartItem.product.barcode!, cartItem.quantity - 1)
            }
          }}
          onIncrement={() => addToCart(product)}
        />
      </div>
    )
  }

  return (
    <>
      <ShinyButton
        className={`h-14 w-full border-2 bg-white text-black ${isUnsuitable ? 'border-red-400' : 'border-green-400'}`}
        onClick={handleAdd}
      >
        <ShoppingCart className="h-6 w-6" />
        Add to Cart
      </ShinyButton>

      <ConfirmDialog
        open={confirmOpen}
        title="Not suitable — add anyway?"
        description={description}
        confirmLabel="Add anyway"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          addToCart(product)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
