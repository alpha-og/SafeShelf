import { PackageX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusDot } from '@/components/StatusDot'
import { useProductSuitability } from '@/features/suitability/hooks/useProductSuitability'
import type { InventoryResponse } from '@/features/stores/services/storeInventoryApi'
import { cn } from '@/lib/utils'

interface SearchResultCardProps {
  item: InventoryResponse
  onClick: (barcode: string) => void
}

export function SearchResultCard({ item, onClick }: SearchResultCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { result, isLoading, memberStatuses } = useProductSuitability(item.barcode, isVisible)
  const hasConflict =
    memberStatuses &&
    memberStatuses.some((s) => s.overall === 'suitable') &&
    memberStatuses.some((s) => s.overall === 'unsuitable')

  return (
    <Card
      ref={ref}
      className="overflow-hidden active:scale-[0.98] transition-transform"
      onClick={() => onClick(item.barcode)}
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-28 h-28 shrink-0 bg-muted rounded-l-xl overflow-hidden border-r border-border/50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <PackageX className="w-6 h-6 text-muted-foreground/50" />
            </div>
            {item.product_image && !imageError && (
              <img
                src={item.product_image}
                alt={item.product_name || 'Product'}
                className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="flex-1 p-3 flex flex-col gap-1.5 min-w-0">
            {result && !isLoading && (
              <div className="flex justify-end -mt-1 -mr-1">
                <StatusDot status={result.overall} split={hasConflict} className="w-4 h-4" />
              </div>
            )}
            <h3 className="font-semibold leading-tight line-clamp-2 text-sm">
              {item.product_name || 'Unknown Product'}
            </h3>

            <p className="text-xs text-muted-foreground truncate">Barcode: {item.barcode}</p>

            <div className="flex items-center justify-between mt-auto">
              <span className="font-semibold text-primary">₹{(item.price || 0).toFixed(2)}</span>
              <span
                className={cn(
                  'text-xs font-medium',
                  item.in_stock ? 'text-emerald-500' : 'text-destructive',
                )}
              >
                {item.in_stock ? `In Stock (${item.quantity})` : 'Out of Stock'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
