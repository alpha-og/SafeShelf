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
        'inline-flex items-center justify-center shrink-0 rounded-full border border-primary/30 bg-secondary text-primary font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]',
        SIZE_CLASSES[size],
        className,
      )}
    >
      {getInitials(name)}
    </div>
  )
}
