import type React from 'react'
import { cn } from '@/lib/utils'

interface GradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  from?: string
  via?: string
  to?: string
}

export function GradientText({
  className,
  from = 'from-white',
  via = 'via-slate-200',
  to = 'to-slate-400',
  children,
  ...props
}: GradientTextProps) {
  return (
    <span
      className={cn('bg-clip-text text-transparent bg-gradient-to-br', from, via, to, className)}
      {...props}
    >
      {children}
    </span>
  )
}
