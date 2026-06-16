import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { FormError } from '@/components/FormError'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { ThemeToggle } from '@/features/appearance/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { useProfiles } from '@/providers/ProfilesProvider'
import { deleteProfile } from '../services/profileStorage'

// Shared "pop forward" treatment for whichever profile/group is currently
// active: instead of an "Active" label, the row is enlarged and elevated
// off the flat list, and its avatar/icon bubble turns green instead of the
// default red/primary tint. No horizontal margin, so it stays flush with
// the screen edges — only the corners round off, like a card sitting on a
// flat surface rather than one inset from it.
const ACTIVE_ROW_CLASSES =
  'rounded-2xl bg-card shadow-[0_4px_16px_rgba(0,0,0,0.35)] relative z-10 py-5'
const ACTIVE_BUBBLE_CLASSES = 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30'

export function ProfileHubPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    profiles,
    groups,
    activeProfile,
    activeGroup,
    activeGroupMembers,
    refresh,
    setActiveProfile,
    setActiveGroup,
  } = useProfiles()
  const [error, setError] = useState<Error | null>(null)

  async function handleDeleteProfile(id: string) {
    setError(null)
    try {
      // A deleted profile may have been driving suitability directly, or as
      // a member of the active Group Buy group — either way the merged
      // check needs to drop it.
      const affectsActiveCheck =
        id === activeProfile?.id || activeGroupMembers.some((m) => m.id === id)
      await deleteProfile(id)
      await refresh()
      if (affectsActiveCheck) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      }
    } catch (err) {
      setError(err as Error)
    }
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader title="Profile" onBack={() => navigate({ to: '/' })} actions={<ThemeToggle />} />

      <main className="py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
        <section>
          <SectionHeader variant="default" className="px-4">
            Profiles
          </SectionHeader>
          <div className="px-4">
            <FormError error={error} fallback="Couldn't delete this profile" />
          </div>
          <div>
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile?.id
              return (
                <div
                  key={profile.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 transition-all',
                    isActive ? ACTIVE_ROW_CLASSES : 'border-b border-border',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveProfile(profile.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar
                      name={profile.name}
                      size={isActive ? 'lg' : 'md'}
                      className={isActive ? ACTIVE_BUBBLE_CLASSES : undefined}
                    />
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                      {profile.name}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Manage ${profile.name}`}
                    onClick={() =>
                      navigate({ to: '/profile/$profileId', params: { profileId: profile.id } })
                    }
                    className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${profile.name}`}
                    onClick={() => handleDeleteProfile(profile.id)}
                    disabled={profiles.length <= 1}
                    className="p-2 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => navigate({ to: '/profile/new' })}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left">Add profile</span>
            </button>
          </div>
        </section>

        <section>
          <SectionHeader variant="default" className="px-4">
            Groups
          </SectionHeader>
          <div>
            {groups.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">
                No groups yet. Club profiles together to shop for everyone at once.
              </div>
            )}
            {groups.map((group) => {
              const members = profiles.filter((p) => group.memberProfileIds.includes(p.id))
              const isActive = group.id === activeGroup?.id
              return (
                <div
                  key={group.id}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3.5 transition-all',
                    isActive ? ACTIVE_ROW_CLASSES : 'border-b border-border',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveGroup(group.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div
                      className={cn(
                        'inline-flex items-center justify-center shrink-0 rounded-full border',
                        isActive
                          ? `h-16 w-16 ${ACTIVE_BUBBLE_CLASSES}`
                          : 'h-10 w-10 bg-primary/15 text-primary border-primary/20',
                      )}
                    >
                      <Users className={isActive ? 'h-7 w-7' : 'h-5 w-5'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{group.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {members.length} {members.length === 1 ? 'profile' : 'profiles'}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label={`Edit ${group.name}`}
                    onClick={() =>
                      navigate({ to: '/profile/groups/$groupId', params: { groupId: group.id } })
                    }
                    className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
            <button
              type="button"
              onClick={() => navigate({ to: '/profile/groups/new' })}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left">Add group</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
