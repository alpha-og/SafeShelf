import { Link } from '@tanstack/react-router'
import { BrandLogo } from '@/components/BrandLogo'
import { Button } from '@/components/ui/button'

export function WelcomeScreen() {
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-6 text-center">
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6">
        <div className="flex size-32 items-center justify-center rounded-3xl bg-card shadow-sm ring-1 ring-border">
          <BrandLogo className="text-7xl" />
        </div>
        <div className="space-y-2">
          <BrandLogo className="text-3xl" withWordmark />
          <p className="max-w-xs text-balance text-sm text-muted-foreground">
            Scan any product and instantly see if it's a safe fit for you and the people you shop
            for.
          </p>
        </div>
      </div>

      <div className="w-full max-w-md space-y-3">
        <Button asChild className="w-full" size="lg">
          <Link to="/signin">Get started</Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
