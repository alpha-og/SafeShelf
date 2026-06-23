import { cn } from '@/lib/utils'
import { Smile, Frown, AlertCircle } from 'lucide-react'
import type { OverallStatus } from '../types'

const CONFIG: Record<OverallStatus, { label: string; className: string }> = {
  suitable: {
    label: 'Suitable',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-800/50 hover:bg-emerald-100/70',
  },
  caution: {
    label: 'Caution',
    className: 'bg-status-warn/15 text-foreground border-status-warn/40 hover:bg-status-warn/25',
  },
  unsuitable: {
    label: 'Unsuitable',
    className: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/25 dark:text-red-400 dark:border-red-800/50 hover:bg-red-100/70',
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

/** Compact suitability label for use on light surfaces (e.g. cart cards). */
export function SuitabilityPill({
  status,
  className,
}: {
  status: OverallStatus
  className?: string
}) {
  const c = CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs',
        c.className,
        className,
      )}
    >
      {getSuitabilityIcon(status, 'w-4 h-4')}
      {c.label}
    </span>
  )
}
