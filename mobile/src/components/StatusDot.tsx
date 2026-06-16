import { cn } from '@/lib/utils'

type DotStatus = 'pass' | 'warn' | 'fail' | 'suitable' | 'caution' | 'unsuitable'

function dotColor(status: DotStatus): string {
  switch (status) {
    case 'fail':
    case 'unsuitable':
      return 'bg-status-fail'
    case 'warn':
    case 'caution':
      return 'bg-status-warn'
    case 'pass':
    case 'suitable':
      return 'bg-status-pass'
  }
}

interface StatusDotProps {
  status: DotStatus
  className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
  return <span className={cn('w-3 h-3 rounded-full shrink-0', dotColor(status), className)} />
}
