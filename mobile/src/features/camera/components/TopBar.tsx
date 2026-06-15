import { forwardRef } from 'react'
import { Settings, ShoppingCart, History } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface TopBarProps {
  cameraAvailable: boolean
}

export const TopBar = forwardRef<HTMLDivElement, TopBarProps>(
  function TopBar({ cameraAvailable }, ref) {
  const navigate = useNavigate()

  return (
    <div ref={ref} className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[calc(var(--sat)_+_1rem)]">
      <button
        onClick={() => navigate({ to: '/settings' })}
        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-colors ${
          cameraAvailable
            ? 'bg-black/20 hover:bg-black/30 text-white/80 border-white/10'
            : 'bg-black/10 text-white/50 border-white/5'
        }`}
      >
        <Settings className="h-5 w-5" />
      </button>

      <div className={`flex backdrop-blur-md rounded-full p-1 gap-0.5 border ${
        cameraAvailable ? 'bg-black/20 border-white/10' : 'bg-black/10 border-white/5'
      }`}>
        <button
          onClick={() => navigate({ to: '/cart' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Cart
        </button>
        <button
          onClick={() => navigate({ to: '/history' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
      </div>
    </div>
  )
})
