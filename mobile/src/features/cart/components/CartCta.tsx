import { ShoppingCart, Trash2 } from 'lucide-react'
import { QuantityAdjuster } from '@/components/QuantityAdjuster'
import { ShinyButton } from '@/components/reactbits/ShinyButton'
import type { CartItem } from '@/providers/CartProvider'
import type { ProductInfo } from '@/features/products/services/product'

interface CartCtaProps {
  product: ProductInfo
  cartItem: CartItem | undefined
  addToCart: (product: ProductInfo) => void
  removeFromCart: (barcode: string) => void
  updateQuantity: (barcode: string, quantity: number) => void
}

export function CartCta({ product, cartItem, addToCart, removeFromCart, updateQuantity }: CartCtaProps) {
  if (!product.barcode) return null

  if (cartItem) {
    return (
      <div className="h-14 flex items-center gap-2 bg-mauve-500/15 border border-primary/25 rounded-2xl pl-3 pr-1 shadow-sm">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full text-primary/50 hover:bg-primary/10 hover:text-primary hover:scale-[1.02] transition-colors shrink-0"
          onClick={() => removeFromCart(cartItem.product.barcode!)}
        >
          <Trash2 className="h-5 w-5" />
        </button>

        <div className="flex-1 text-center">
          <span className="text-primary text-sm font-bold">
            {cartItem.quantity} in cart
          </span>
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
    <ShinyButton
      className="h-14 w-full"
      onClick={() => addToCart(product)}
    >
      <ShoppingCart className="h-6 w-6" />
      Add to Cart
    </ShinyButton>
  )
}
