import { useNavigate } from '@tanstack/react-router'
import { History, ShoppingCart, User, Users } from 'lucide-react'
import { forwardRef } from 'react'
import { Avatar } from '@/components/Avatar'
import { useProfiles } from '@/providers/ProfilesProvider'

interface TopBarProps {
  cameraAvailable: boolean
}

export const TopBar = forwardRef<HTMLDivElement, TopBarProps>(function TopBar(
  { cameraAvailable },
  ref,
) {
  const navigate = useNavigate()
  const { activeProfile, activeGroup } = useProfiles()

  return (
    <div
      ref={ref}
      className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-[calc(var(--sat)_+_1rem)]"
    >
      <button
        type="button"
        onClick={() => navigate({ to: '/profile' })}
        aria-label={activeGroup ? `Profile (${activeGroup.name} group active)` : 'Profile'}
        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md border transition-colors ${
          cameraAvailable
            ? 'bg-primary/30 hover:bg-primary/40 hover:scale-[1.02] text-white/80 border-primary/30'
            : 'bg-primary/20 hover:scale-[1.02] text-white/50 border-primary/20'
        }`}
      >
        {activeProfile ? (
          <Avatar
            name={activeProfile.name}
            size="sm"
            className="bg-white/20 text-white border-white/30"
          />
        ) : activeGroup ? (
          <Users className="h-5 w-5" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </button>

      <div
        className={`flex backdrop-blur-md rounded-full p-1 gap-0.5 border ${
          cameraAvailable
            ? 'bg-primary/30 hover:scale-[1.02] border-primary/30'
            : 'bg-primary/20 hover:scale-[1.02] border-primary/20'
        }`}
      >
        <button
          type="button"
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
          type="button"
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
