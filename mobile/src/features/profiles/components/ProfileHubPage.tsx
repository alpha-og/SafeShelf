import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { FileText, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { FormError } from '@/components/FormError'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { ThemeToggle } from '@/features/appearance/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { useProfiles } from '@/providers/ProfilesProvider'
import { deleteProfile } from '../services/profileStorage'

// Shared treatment for whichever profile/group is currently active: instead of
// an "Active" label, the row stays the same size as every other row and only
// changes color — a subtle green tint behind it, and its avatar/icon bubble
// turns green instead of the default red/primary tint. Keeping rows uniform
// avoids the elevated-card look (and the stray divider line it produced when
// sitting between bordered rows).
const ACTIVE_ROW_CLASSES =
  'border-primary/40 bg-primary/20 shadow-[0_10px_30px_-24px_hsl(var(--primary))]'
const ACTIVE_BUBBLE_CLASSES = 'bg-primary/30 text-primary border-primary/50'

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
          <div className="px-3 space-y-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfile?.id
              return (
                <div
                  key={profile.id}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-3.5 transition-[color,background-color,border-color,box-shadow] backdrop-blur-sm',
                    isActive && ACTIVE_ROW_CLASSES,
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveProfile(profile.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Avatar
                      name={profile.name}
                      size="md"
                      className={isActive ? ACTIVE_BUBBLE_CLASSES : undefined}
                    />
                    <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
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
              className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-primary/50 bg-card/75 px-4 py-3.5 text-sm text-primary transition-colors hover:bg-accent/60"
            >
              <Plus className="h-5 w-5 text-primary shrink-0" />
              <span className="flex-1 text-left">Add profile</span>
            </button>
          </div>
        </section>

        <section>
          <SectionHeader variant="default" className="px-4">
            Groups
          </SectionHeader>
          <div className="px-3 space-y-2">
            {groups.length === 0 && (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-6 text-center text-sm text-muted-foreground">
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
                    'w-full flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-4 py-3.5 transition-[color,background-color,border-color,box-shadow] backdrop-blur-sm',
                    isActive && 'border-orange-300 bg-orange-50/80 shadow-[0_10px_30px_-24px_#f59e0b]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveGroup(group.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div
                      className={cn(
                        'inline-flex items-center justify-center shrink-0 rounded-full border h-10 w-10',
                        isActive
                          ? 'bg-orange-100 text-orange-700 border-orange-400'
                          : 'bg-orange-50 text-orange-600 border-orange-200',
                      )}
                    >
                      <Users className="h-5 w-5" />
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
              className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-orange-300/70 bg-card/75 px-4 py-3.5 text-sm text-orange-500 transition-colors hover:bg-orange-50"
            >
              <Plus className="h-5 w-5 text-orange-500 shrink-0" />
              <span className="flex-1 text-left">Add group</span>
            </button>
          </div>
        </section>

        <section>
          <SectionHeader variant="default" className="px-4">
            Health Report
          </SectionHeader>
          <div className="px-3">
            <button
              type="button"
              onClick={() => navigate({ to: '/profile/health-report' })}
              className="w-full flex items-center gap-3 rounded-2xl border border-cyan-200/80 bg-cyan-50/70 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-cyan-100/70"
            >
              <FileText className="h-5 w-5 text-cyan-600 shrink-0" />
              <span className="flex-1 text-left">Upload & manage health reports</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
