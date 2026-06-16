import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  children: React.ReactNode
  variant?: 'uppercase' | 'default'
  className?: string
}

export function SectionHeader({ children, variant = 'uppercase', className }: SectionHeaderProps) {
  return (
    <h3 className={cn(
      variant === 'uppercase'
        ? 'text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3'
        : 'text-sm font-medium text-foreground mb-2',
      className
    )}>
      {children}
    </h3>
  )
}
