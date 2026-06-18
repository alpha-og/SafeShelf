import { motion } from 'framer-motion'
import { Camera, ChefHat, Search } from 'lucide-react'

interface BottomNavBarProps {
  activeIndex: number
  onChange: (index: number) => void
}

const tabs = [
  { icon: ChefHat, label: 'Recipes' },
  { icon: Camera, label: 'Camera' },
  { icon: Search, label: 'Inventory' },
]

export function BottomNavBar({ activeIndex, onChange }: BottomNavBarProps) {
  return (
    <motion.div
      initial={{ y: 24, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 24, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <nav className="flex items-center gap-1 bg-primary/30 backdrop-blur-md border border-primary/30 rounded-full px-2 py-1.5 shadow-2xl">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => onChange(i)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              i === activeIndex
                ? 'text-white'
                : 'text-white/50 hover:text-white/80 hover:scale-[1.02]'
            }`}
          >
            {i === activeIndex && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-primary/40 rounded-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <tab.icon className="h-4 w-4 relative z-10" />
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </nav>
    </motion.div>
  )
}
