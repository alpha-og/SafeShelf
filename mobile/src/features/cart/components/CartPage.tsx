import { ArrowLeft, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { useCart } from '@/providers/CartProvider'
import { ProductCard } from '@/components/ProductCard'

export function CartPage() {
  const navigate = useNavigate()
  const { items, isLoading, clearCart, updateQuantity } = useCart()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ShoppingCart className="h-5 w-5 text-foreground" />
            <h1 className="text-xl font-bold text-foreground">Cart</h1>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={clearCart}>
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </header>

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
                      className="h-8 w-8 rounded-full"
                      onClick={() => updateQuantity(item.product.barcode!, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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

