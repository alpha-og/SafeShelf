import { useNavigate } from '@tanstack/react-router'
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ProductCard } from '@/components/ProductCard'
import { Button } from '@/components/ui/button'
import { useCart } from '@/providers/CartProvider'

export function CartPage() {
  const navigate = useNavigate()
  const { items, isLoading, clearCart, updateQuantity } = useCart()

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col">
      <PageHeader
        title="Cart"
        icon={ShoppingCart}
        onBack={() => navigate({ to: '/' })}
        className="sticky top-0 bg-background/80 backdrop-blur-md z-10"
        actions={
          items.length > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-[1.02]"
              onClick={clearCart}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          ) : undefined
        }
      />

      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground animate-pulse">Loading cart...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex">
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Products you scan and add will appear here."
              actionLabel="Start Scanning"
              onAction={() => navigate({ to: '/' })}
            />
          </div>
        ) : (
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            {items.map((item) => (
              <ProductCard
                key={item.product.barcode || item.product.productName}
                product={item.product}
                action={
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:scale-[1.02]"
                      onClick={() => updateQuantity(item.product.barcode!, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-[1.02] border-destructive/20"
                      onClick={() => updateQuantity(item.product.barcode!, item.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
