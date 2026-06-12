import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export function CartPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <ShoppingCart className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">Cart</h1>
        </div>
      </header>

      <main className="flex-1 flex">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Products you scan and add will appear here."
          actionLabel="Start Scanning"
          onAction={() => navigate({ to: '/' })}
        />
      </main>
    </div>
  )
}
