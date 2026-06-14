import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  showRadialGradient?: boolean
}

export function AuroraBackground({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col min-h-screen bg-slate-950 text-slate-50 overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 100%', '100% 0%', '0% 0%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
          className={cn(
            'absolute -inset-[10%] opacity-50 blur-[60px]',
            'bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),rgba(255,255,255,0))]',
            'after:content-[""] after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_80%_20%,rgba(78,205,196,0.2),rgba(255,255,255,0))]',
            'before:content-[""] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_20%_80%,rgba(255,107,107,0.15),rgba(255,255,255,0))]'
          )}
        />
        {showRadialGradient && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0)_0%,rgba(2,6,23,0.8)_100%)] pointer-events-none" />
        )}
      </div>
      {children}
    </div>
  )
}
