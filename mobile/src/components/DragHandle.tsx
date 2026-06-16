import { cn } from '@/lib/utils'

interface DragHandleProps {
  variant?: 'light' | 'dark'
  className?: string
}

export function DragHandle({ variant = 'dark', className }: DragHandleProps) {
  return (
    <div className={cn('flex justify-center pt-3 pb-2', className)}>
      <div
        className={cn(
          'w-12 h-1.5 rounded-full backdrop-blur-md',
          variant === 'light' ? 'bg-white/30' : 'bg-muted-foreground/30',
        )}
      />
    </div>
  )
}
