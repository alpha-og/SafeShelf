import React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedChipProps extends HTMLMotionProps<"div"> {
  index?: number
  delay?: number
}

export function AnimatedChip({ children, className, index = 0, delay = 0, ...props }: AnimatedChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 30, 
        delay: delay + index * 0.05 
      }}
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-md border border-white/10 shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
