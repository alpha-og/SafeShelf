import { StatusDot } from '@/components/StatusDot'
import { cn } from '@/lib/utils'
import type { OverallStatus } from '../types'

const CONFIG: Record<OverallStatus, { label: string; className: string }> = {
  suitable: {
    label: 'Suitable',
    className: 'bg-status-pass/15 text-foreground border-status-pass/30',
  },
  caution: {
    label: 'Caution',
    className: 'bg-status-warn/15 text-foreground border-status-warn/40',
  },
  unsuitable: {
    label: 'Unsuitable',
    className: 'bg-status-fail/15 text-foreground border-status-fail/40',
  },
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
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        c.className,
        className,
      )}
    >
      <StatusDot status={status} className="w-2 h-2" />
      {c.label}
    </span>
  )
}
