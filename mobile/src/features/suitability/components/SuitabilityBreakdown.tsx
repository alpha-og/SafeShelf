import { CircleCheck, CircleAlert, CircleX, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { SuitabilityCheck } from '../types'

interface SuitabilityBreakdownProps {
  checks: SuitabilityCheck[]
}

const statusConfig = {
  pass: { icon: CircleCheck, color: 'text-green-600 dark:text-green-400' },
  warn: { icon: CircleAlert, color: 'text-amber-600 dark:text-amber-400' },
  fail: { icon: CircleX, color: 'text-red-600 dark:text-red-400' },
} as const

export function SuitabilityBreakdown({ checks }: SuitabilityBreakdownProps) {
  const hasIssues = checks.some((c) => c.status !== 'pass')
  const [open, setOpen] = useState(hasIssues)

  if (!checks.length) return null

  const failCount = checks.filter((c) => c.status === 'fail').length
  const warnCount = checks.filter((c) => c.status === 'warn').length

  const summary =
    failCount > 0
      ? `${failCount} issue${failCount > 1 ? 's' : ''} found`
      : warnCount > 0
        ? `${warnCount} warning${warnCount > 1 ? 's' : ''}`
        : 'All checks passed'

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 text-sm"
      >
        <span className="font-semibold text-foreground">{summary}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="space-y-2 pt-1">
          {checks.map((check, i) => {
            const Icon = statusConfig[check.status].icon
            return (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${statusConfig[check.status].color}`} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{check.label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{check.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
