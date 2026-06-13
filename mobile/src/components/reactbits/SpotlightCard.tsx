import React, { useRef, useState, useEffect } from 'react'
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = 'rgba(255, 255, 255, 0.08)',
  ...props
}: SpotlightCardProps) {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Basic touch support
    const handleTouchMove = (e: TouchEvent) => {
      if (!cardRef.current) return
      const { left, top } = cardRef.current.getBoundingClientRect()
      mouseX.set(e.touches[0].clientX - left)
      mouseY.set(e.touches[0].clientY - top)
    }

    const currentRef = cardRef.current
    if (currentRef) {
      currentRef.addEventListener('touchmove', handleTouchMove)
      return () => currentRef.removeEventListener('touchmove', handleTouchMove)
    }
  }, [mouseX, mouseY])

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseX.set(clientX - left)
    mouseY.set(clientY - top)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'group relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 backdrop-blur-md',
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      {...props}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl transition duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              ${spotlightColor},
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  )
}
