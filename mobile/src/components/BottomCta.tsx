import { cn } from '@/lib/utils'

interface BottomCtaProps {
  children: React.ReactNode
  className?: string
  variant?: 'absolute' | 'static'
}

export function BottomCta({ children, className, variant = 'absolute' }: BottomCtaProps) {
  return (
    <div className={cn(
      variant === 'absolute'
        ? 'absolute bottom-0 shrink-0 px-4 pt-8 pb-[calc(1rem+var(--sab))] w-full bg-linear-to-t from-background via-background/90 to-transparent z-30'
        : 'shrink-0 px-4 pb-[calc(1rem+var(--sab))] bg-linear-to-t from-background via-background/90 to-transparent z-30',
      className
    )}>
      {children}
    </div>
  )
}
