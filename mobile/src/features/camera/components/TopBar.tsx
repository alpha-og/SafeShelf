import { Settings, ShoppingCart, History } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface TopBarProps {
  cameraAvailable: boolean
}

export function TopBar({ cameraAvailable }: TopBarProps) {
  const navigate = useNavigate()

  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
      <button
        onClick={() => navigate({ to: '/settings' })}
        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-colors ${
          cameraAvailable
            ? 'bg-background/40 hover:bg-background/60 text-foreground border-border'
            : 'bg-background/20 hover:bg-background/30 text-foreground/50 border-border/50'
        }`}
      >
        <Settings className="h-5 w-5" />
      </button>

      <div className={`flex backdrop-blur-md rounded-full p-1 gap-0.5 border ${
        cameraAvailable ? 'bg-background/50 border-border' : 'bg-background/25 border-border/50'
      }`}>
        <button
          onClick={() => navigate({ to: '/cart' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/10'
              : 'text-foreground/40 hover:text-foreground/60'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Cart
        </button>
        <button
          onClick={() => navigate({ to: '/history' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-foreground/80 hover:text-foreground hover:bg-foreground/10'
              : 'text-foreground/40 hover:text-foreground/60'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
      </div>
    </div>
  )
}
