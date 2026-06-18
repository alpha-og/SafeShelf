import { Link, useNavigate } from '@tanstack/react-router'
import { History, Settings, ShoppingCart, MapPin } from 'lucide-react'
import { forwardRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/providers/StoreProvider'
import { fetchStoreById } from '@/features/stores/services/storeApi'

interface TopBarProps {
  cameraAvailable: boolean
}

export const TopBar = forwardRef<HTMLDivElement, TopBarProps>(function TopBar(
  { cameraAvailable },
  ref,
) {
  const navigate = useNavigate()
  const { selectedStoreId } = useStore()

  const { data: store } = useQuery({
    queryKey: ['store', selectedStoreId],
    queryFn: () => (selectedStoreId ? fetchStoreById(selectedStoreId) : null),
    enabled: !!selectedStoreId,
  })

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 p-4 pt-[calc(var(--sat)_+_1rem)]"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <button
          onClick={() => navigate({ to: '/settings' })}
          className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-colors shrink-0 ${
            cameraAvailable
              ? 'bg-primary/30 hover:bg-primary/40 hover:scale-[1.02] text-white/80 border-primary/30'
              : 'bg-primary/20 hover:scale-[1.02] text-white/50 border-primary/20'
          }`}
        >
          <Settings className="h-5 w-5" />
        </button>

        {store && (
          <Link
            to="/stores"
            className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border transition-colors min-w-0 ${
              cameraAvailable
                ? 'bg-primary/30 hover:bg-primary/40 hover:scale-[1.02] text-white/80 border-primary/30'
                : 'bg-primary/20 hover:scale-[1.02] text-white/50 border-primary/20'
            }`}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs font-medium truncate">{store.name}</span>
          </Link>
        )}
      </div>

      <div
        className={`flex backdrop-blur-md rounded-full p-1 gap-0.5 border shrink-0 ${
          cameraAvailable
            ? 'bg-primary/30 hover:scale-[1.02] border-primary/30'
            : 'bg-primary/20 hover:scale-[1.02] border-primary/20'
        }`}
      >
        <button
          onClick={() => navigate({ to: '/cart' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-white/70 hover:text-white hover:bg-primary-foreground/10 hover:scale-[1.02]'
              : 'text-white/40 hover:text-white/60 hover:scale-[1.02]'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          Cart
        </button>
        <button
          onClick={() => navigate({ to: '/history' })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            cameraAvailable
              ? 'text-white/70 hover:text-white hover:bg-primary-foreground/10 hover:scale-[1.02]'
              : 'text-white/40 hover:text-white/60 hover:scale-[1.02]'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          History
        </button>
      </div>
    </div>
  )
})
