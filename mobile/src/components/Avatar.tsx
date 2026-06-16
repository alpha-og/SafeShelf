import { getInitials } from '@/lib/initials'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES: Record<Required<AvatarProps>['size'], string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center shrink-0 rounded-full bg-primary/15 text-primary font-semibold border border-primary/20',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
