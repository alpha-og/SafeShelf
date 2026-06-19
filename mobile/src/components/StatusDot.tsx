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
  split?: boolean
  className?: string
}

export function StatusDot({ status, split, className }: StatusDotProps) {
  if (split) {
    return (
      <span
        className={cn('w-3 h-3 rounded-full shrink-0', className)}
        style={{
          background: 'linear-gradient(45deg, var(--color-status-fail) 50%, var(--color-status-pass) 50%)',
        }}
      />
    )
  }
  return <span className={cn('w-3 h-3 rounded-full shrink-0', dotColor(status), className)} />
}
