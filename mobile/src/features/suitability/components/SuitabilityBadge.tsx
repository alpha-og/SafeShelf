import { Badge } from '@/components/ui/badge'
import type { SuitabilityResult, OverallStatus } from '../types'

interface SuitabilityBadgeProps {
  result: SuitabilityResult | null
}

const config: Record<OverallStatus, { label: string; dot: string; badge: string }> = {
  suitable: {
    label: 'Suitable',
    dot: 'bg-green-500',
    badge: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  },
  caution: {
    label: 'Caution',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white border-amber-500 hover:bg-amber-500',
  },
  unsuitable: {
    label: 'Unsuitable',
    dot: 'bg-red-500',
    badge: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
  },
}

export function SuitabilityBadge({ result }: SuitabilityBadgeProps) {
  if (!result) return null

  const c = config[result.overall]

  return (
    <Badge className={`gap-2 px-3 py-1 text-sm font-bold shadow-sm ${c.badge}`}>
      <span className={`w-3 h-3 rounded-full shadow-sm ${c.dot}`} />
      {c.label}
    </Badge>
  )
}
