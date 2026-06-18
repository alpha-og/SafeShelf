import { cn } from '@/lib/utils'

interface BrandLogoProps {
  /** Tailwind text-size / spacing classes to scale the mark, e.g. "text-6xl". */
  className?: string
  /** Append the "afe…helf" wordmark so it reads "SafeShelf" instead of "SS". */
  withWordmark?: boolean
}

/**
 * The SafeShelf "SS" mark: the first S in the UI gray (Misty Sky / muted),
 * the second in the UI pale red (Rosewood / primary). Size is driven by the
 * `className` font-size so the same component works for a splash hero or an
 * inline header. With `withWordmark`, the two S's keep their brand colors and
 * the remaining letters render in the neutral foreground.
 */
export function BrandLogo({ className, withWordmark = false }: BrandLogoProps) {
  return (
    <span className={cn('font-bold tracking-tight select-none leading-none', className)}>
      <span className="text-muted-foreground">S</span>
      {withWordmark && <span className="text-foreground">afe</span>}
      <span className="text-primary">S</span>
      {withWordmark && <span className="text-foreground">helf</span>}
    </span>
  )
}
