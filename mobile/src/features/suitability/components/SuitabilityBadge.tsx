import { StatusDot } from '@/components/StatusDot'
import { Badge } from '@/components/ui/badge'
import type { OverallStatus, SuitabilityResult } from '../types'

interface SuitabilityBadgeProps {
  result: SuitabilityResult | null
}

const config: Record<OverallStatus, { label: string; glass: string }> = {
  suitable: {
    label: 'Suitable',
    glass: 'bg-green-500/15 backdrop-blur-md border-green-500/25 text-white',
  },
  caution: {
    label: 'Caution',
    glass: 'bg-amber-500/15 backdrop-blur-md border-amber-500/25 text-white',
  },
  unsuitable: {
    label: 'Unsuitable',
    glass: 'bg-destructive/15 backdrop-blur-md border-destructive/25 text-white',
  },
}

export function SuitabilityBadge({ result }: SuitabilityBadgeProps) {
  if (!result) return null

  const c = config[result.overall]

  return (
    <Badge
      className={`gap-2 px-3 py-1.5 text-sm font-semibold rounded-full hover:scale-105 ${c.glass}`}
    >
      <StatusDot status={result.overall} />
      {c.label}
    </Badge>
  )
}
