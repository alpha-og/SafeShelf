import { Badge } from '@/components/ui/badge'
import { Smile, Frown, AlertCircle } from 'lucide-react'
import type { OverallStatus, SuitabilityResult } from '../types'

interface SuitabilityBadgeProps {
  result: SuitabilityResult | null
}

const config: Record<OverallStatus, { label: string; glass: string }> = {
  suitable: {
    label: 'Suitable',
    glass: 'bg-emerald-600/15 backdrop-blur-md border-emerald-500/25 text-emerald-200 hover:bg-emerald-500/25',
  },
  caution: {
    label: 'Caution',
    glass: 'bg-accent/15 backdrop-blur-md border-accent/25 text-overlay-foreground hover:bg-accent/25',
  },
  unsuitable: {
    label: 'Unsuitable',
    glass: 'bg-red-600/20 backdrop-blur-md border-red-500/30 text-red-200 hover:bg-red-500/30',
  },
}

function getSuitabilityIcon(status: OverallStatus, className = 'w-4 h-4') {
  switch (status) {
    case 'suitable':
      return <Smile className={className} />
    case 'unsuitable':
      return <Frown className={className} />
    case 'caution':
      return <AlertCircle className={className} />
  }
}

export function SuitabilityBadge({ result }: SuitabilityBadgeProps) {
  if (!result) return null

  const c = config[result.overall]

  return (
    <Badge
      className={`gap-2.5 px-4 py-2 text-sm font-semibold rounded-full hover:scale-105 border ${c.glass}`}
    >
      {getSuitabilityIcon(result.overall, 'w-5 h-5')}
      {c.label}
    </Badge>
  )
}
