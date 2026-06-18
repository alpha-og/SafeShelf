import { RotateCcw } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'
import { useCart } from '@/providers/CartProvider'

/**
 * Shown in front of the scanner when a cart survived from a previous shopping
 * session, letting the user continue it or start fresh. The pending flag lives
 * in CartProvider (mounted once, above the router) so this only appears on a
 * full page reload — not when navigating back to home mid-session.
 */
export function SessionBanner() {
  const { items, previousSessionPending, continueSession, startNewSession } = useCart()

  if (!previousSessionPending || items.length === 0) return null

  const count = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-xs rounded-3xl border border-border bg-background/95 p-6 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
          <BrandLogo className="text-3xl" />
        </div>

        <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You have {count} {count === 1 ? 'item' : 'items'} saved in your cart.
        </p>

        <div className="mt-6 space-y-2">
          <Button className="w-full" size="lg" onClick={continueSession}>
            Continue shopping
          </Button>
          <Button
            variant="outline"
            className="w-full gap-1.5"
            size="lg"
            onClick={startNewSession}
          >
            <RotateCcw className="h-4 w-4" />
            Start a new session
          </Button>
        </div>
      </div>
    </div>
  )
}
