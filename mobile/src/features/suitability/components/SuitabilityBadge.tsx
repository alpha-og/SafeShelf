import { Badge } from '@/components/ui/badge'
import type { SuitabilityResult, OverallStatus } from '../types'

interface SuitabilityBadgeProps {
  result: SuitabilityResult | null
}

const config: Record<OverallStatus, { label: string; dot: string; glass: string }> = {
  suitable: {
    label: 'Suitable',
    dot: 'bg-secondary',
    glass: 'bg-secondary/15 backdrop-blur-md border-secondary/25 text-overlay-foreground',
  },
  caution: {
    label: 'Caution',
    dot: 'bg-accent',
    glass: 'bg-accent/15 backdrop-blur-md border-accent/25 text-overlay-foreground',
  },
  unsuitable: {
    label: 'Unsuitable',
    dot: 'bg-destructive',
    glass: 'bg-destructive/15 backdrop-blur-md border-destructive/25 text-overlay-foreground',
  },
}

export function SuitabilityBadge({ result }: SuitabilityBadgeProps) {
  if (!result) return null

  const c = config[result.overall]

  return (
    <Badge className={`gap-2 px-3 py-1.5 text-xs font-semibold rounded-full hover:scale-105 ${c.glass}`}>
      <span className={`w-3 h-3 rounded-full ${c.dot}`} />
      {c.label}
    </Badge>
  )
}
