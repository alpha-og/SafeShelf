import { cn } from '@/lib/utils'

interface BrandLogoProps {
  /** Tailwind text-size / spacing classes to scale the mark, e.g. "text-6xl". */
  className?: string
  /** Append the "afe…helf" wordmark so it reads "SafeShelf" instead of "SS". */
  withWordmark?: boolean
}

/**
 * The SafeShelf "SS" mark: "Safe" renders black in light mode and white in dark
 * mode, while "Shelf" stays in the brand green (primary). Size is driven by the
 * `className` font-size so the same component works for a splash hero or an
 * inline header. Without `withWordmark` it shows just the two S's in the same
 * two colors.
 */
export function BrandLogo({ className, withWordmark = false }: BrandLogoProps) {
  return (
    <span className={cn('font-bold tracking-tight select-none leading-none', className)}>
      <span className="text-black dark:text-white">S</span>
      {withWordmark && <span className="text-black dark:text-white">afe</span>}
      <span className="text-primary">S</span>
      {withWordmark && <span className="text-primary">helf</span>}
    </span>
  )
}
