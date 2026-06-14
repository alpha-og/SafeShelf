import { ShoppingCart, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
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
      <div className="h-14 flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl pl-4 pr-0">
        <button
          className="flex items-center justify-center w-10 h-10 rounded-full text-red-400 hover:bg-white/10 transition-colors disabled:opacity-50 shrink-0"
          onClick={() => removeFromCart(cartItem.product.barcode!)}
        >
          <Trash2 className="h-5 w-5" />
        </button>

        <div className="flex-1 text-center">
          <span className="text-white text-base font-semibold">
            {cartItem.quantity} item{cartItem.quantity !== 1 ? 's' : ''} in cart
          </span>
        </div>

        <div className="h-full w-12 flex flex-col items-center bg-white/10 overflow-hidden shrink-0 self-stretch rounded-r-2xl">
          <button
            className="w-full flex items-center justify-center flex-1 text-white hover:bg-white/10 transition-colors disabled:opacity-50 border-b border-white/10"
            onClick={() => addToCart(product)}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            className="w-full flex items-center justify-center flex-1 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            onClick={() => {
              if (cartItem.quantity <= 1) {
                removeFromCart(cartItem.product.barcode!)
              } else {
                updateQuantity(cartItem.product.barcode!, cartItem.quantity - 1)
              }
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
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
