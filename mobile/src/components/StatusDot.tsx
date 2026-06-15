import { cn } from '@/lib/utils'

type DotStatus = 'pass' | 'warn' | 'fail' | 'suitable' | 'caution' | 'unsuitable'

function dotColor(status: DotStatus): string {
  switch (status) {
    case 'fail':
    case 'unsuitable':
      return 'bg-[#B46A72]'
    case 'warn':
    case 'caution':
      return 'bg-[#D4919C]'
    case 'pass':
    case 'suitable':
      return 'bg-[#8A9B76]'
  }
}

interface StatusDotProps {
  status: DotStatus
  className?: string
}

export function StatusDot({ status, className }: StatusDotProps) {
  return (
    <span className={cn("w-3 h-3 rounded-full shrink-0", dotColor(status), className)} />
  )
}
