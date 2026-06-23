import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, History, MapPin, ShoppingCart, User, Users } from 'lucide-react'
import { forwardRef } from 'react'
import { Avatar } from '@/components/Avatar'
import { useProfiles } from '@/providers/ProfilesProvider'
import { fetchStoreById } from '@/features/stores/services/storeApi'
import { useStore } from '@/providers/StoreProvider'

interface TopBarProps {
  cameraAvailable: boolean
}

export const TopBar = forwardRef<HTMLDivElement, TopBarProps>(function TopBar(
  { cameraAvailable },
  ref,
) {
  const navigate = useNavigate()
  const { activeProfile, activeGroup } = useProfiles()
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
      <div className="flex items-center min-w-0 flex-1">
        <div
          className={`flex items-center rounded-full backdrop-blur-md border transition-colors p-0.5 ${
            cameraAvailable
              ? 'bg-accent/85 border-accent/80 dark:bg-primary/30 dark:border-primary/30'
              : 'bg-accent/60 border-accent/60 dark:bg-primary/20 dark:border-primary/20'
          }`}
        >
          <button
            type="button"
            onClick={() => navigate({ to: '/profile' })}
            aria-label={activeGroup ? `Profile (${activeGroup.name} group active)` : 'Profile'}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors bg-primary hover:bg-primary/90 text-white dark:bg-primary/40 dark:hover:bg-primary/50 dark:text-foreground"
          >
            {activeProfile ? (
              <Avatar
                name={activeProfile.name}
                size="sm"
                className="bg-white/20 text-white border-white/30 dark:bg-foreground/15 dark:text-foreground dark:border-foreground/20"
              />
            ) : activeGroup ? (
              <Users className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </button>
          {store && (
            <Link
              to="/stores"
              className={`flex items-center gap-1 h-10 rounded-full transition-colors pl-1.5 pr-1.5 ${
                cameraAvailable
                  ? 'hover:bg-foreground/10 text-foreground/70'
                  : 'hover:bg-foreground/10 text-foreground/40'
              }`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-medium truncate max-w-[80px]">{store.name}</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-foreground/50" />
            </Link>
          )}
        </div>
      </div>

      <div
        className={`flex items-center backdrop-blur-md rounded-full border shrink-0 p-0.5 ${
          cameraAvailable
            ? 'bg-accent/85 hover:scale-[1.02] border-accent/80 dark:bg-primary/30 dark:border-primary/30'
            : 'bg-accent/60 hover:scale-[1.02] border-accent/60 dark:bg-primary/20 dark:border-primary/20'
        }`}
      >
        <button
          type="button"
          onClick={() => navigate({ to: '/cart' })}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            cameraAvailable
              ? 'text-foreground/70 hover:text-foreground hover:bg-foreground/10 hover:scale-[1.02]'
              : 'text-foreground/40 hover:text-foreground/60 hover:scale-[1.02]'
          }`}
        >
          <ShoppingCart className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: '/recent-scans' })}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
            cameraAvailable
              ? 'text-foreground/70 hover:text-foreground hover:bg-foreground/10 hover:scale-[1.02]'
              : 'text-foreground/40 hover:text-foreground/60 hover:scale-[1.02]'
          }`}
        >
          <History className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
})
