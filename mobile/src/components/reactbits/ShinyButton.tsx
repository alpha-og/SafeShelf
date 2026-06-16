import { type HTMLMotionProps, motion } from 'framer-motion'
import type React from 'react'
import { cn } from '@/lib/utils'

interface ShinyButtonProps extends HTMLMotionProps<'button'> {
  shimmerColor?: string
  children?: React.ReactNode
}

export function ShinyButton({
  children,
  className,
  shimmerColor = 'rgba(255,255,255,0.4)',
  ...props
}: ShinyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg transition-all hover:shadow-xl',
        className,
      )}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <motion.div
        className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white to-transparent"
        style={{
          opacity: 0.2,
          skewX: -20,
        }}
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          repeat: Infinity,
          repeatType: 'loop',
          duration: 2.5,
          ease: 'linear',
          repeatDelay: 1,
        }}
      />
    </motion.button>
  )
}
