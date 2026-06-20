import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { FormError } from '@/components/FormError'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProfiles } from '@/providers/ProfilesProvider'
import { createGroup, deleteGroup, getGroup, updateGroup } from '../services/profileStorage'

interface EditGroupPageProps {
  /** Omitted in create-mode (the "New group" flow); present when editing an existing group. */
  groupId?: string
}

export function EditGroupPage({ groupId }: EditGroupPageProps) {
  const isNew = !groupId
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profiles, activeGroup, refresh } = useProfiles()

  const [loaded, setLoaded] = useState(isNew)
  const [name, setName] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (isNew || !groupId) return
    getGroup(groupId).then((group) => {
      if (group) {
        setName(group.name)
        setMemberIds(group.memberProfileIds)
      }
      setLoaded(true)
    })
  }, [isNew, groupId])

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const canSubmit = name.trim().length > 0 && !submitting

  async function handleSave() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const patch = { name: name.trim(), memberProfileIds: memberIds }
      if (isNew) {
        await createGroup(patch)
      } else if (groupId) {
        await updateGroup(groupId, patch)
        // Membership changes affect the merged check if this group is active.
        if (groupId === activeGroup?.id) {
          queryClient.invalidateQueries({ queryKey: ['userProfile'] })
        }
      }
      await refresh()
      navigate({ to: '/profile' })
    } catch (err) {
      setError(err as Error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!groupId) return
    setError(null)
    try {
      await deleteGroup(groupId)
      await refresh()
      if (groupId === activeGroup?.id) {
        queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      }
      navigate({ to: '/profile' })
    } catch (err) {
      setError(err as Error)
    }
  }

  if (!loaded) return null

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader
        title={isNew ? 'New Group' : name || 'Edit Group'}
        onBack={() => navigate({ to: '/profile' })}
      />

      <main className="py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
        <section className="px-4">
          <label htmlFor="group-name" className="text-sm font-medium text-foreground mb-2 block">
            Group name
          </label>
          <Input
            id="group-name"
            type="text"
            value={name}
            placeholder="e.g. Family"
            onChange={(e) => setName(e.target.value)}
          />
        </section>

        <section>
          <SectionHeader variant="default" className="px-4">
            Members
          </SectionHeader>
          <div>
            {profiles.map((profile) => {
              const checked = memberIds.includes(profile.id)
              return (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleMember(profile.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent border-b border-border"
                >
                  <Avatar name={profile.name} size="md" />
                  <span className="flex-1 text-left">{profile.name}</span>
                  {checked && <Check className="h-4 w-4 text-foreground shrink-0" />}
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-border shrink-0 px-4 py-3 space-y-2">
        <FormError error={error} fallback="Couldn't save this group" />
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" size="lg" disabled={!canSubmit} onClick={handleSave}>
            Save
          </Button>
        </div>
      </footer>
    </div>
  )
}
