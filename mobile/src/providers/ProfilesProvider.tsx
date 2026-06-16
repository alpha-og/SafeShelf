import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react'
import {
  getActiveSelection,
  listGroups,
  listProfiles,
  setActiveGroupId as persistActiveGroupId,
  setActiveProfileId as persistActiveProfileId,
} from '@/features/profiles/services/profileStorage'
import type { Profile, ProfileGroup } from '@/features/profiles/types'

export interface ProfilesState {
  profiles: Profile[]
  groups: ProfileGroup[]
  /** Set when a single profile is driving suitability checks. Null if a group is active instead. */
  activeProfile: Profile | null
  /** Set when a Group Buy group is driving suitability checks. Null if a single profile is active instead. */
  activeGroup: ProfileGroup | null
  /** Member profiles of activeGroup, resolved against the live profile list. */
  activeGroupMembers: Profile[]
  hasProfile: boolean
  isLoading: boolean
  refresh: () => Promise<void>
  setActiveProfile: (id: string) => Promise<void>
  setActiveGroup: (id: string) => Promise<void>
}

const ProfilesContext = createContext<ProfilesState | undefined>(undefined)

function ProfilesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const profilesQuery = useQuery({ queryKey: ['profiles'], queryFn: listProfiles })
  const groupsQuery = useQuery({ queryKey: ['groups'], queryFn: listGroups })
  const selectionQuery = useQuery({ queryKey: ['activeSelection'], queryFn: getActiveSelection })

  const profiles = profilesQuery.data ?? []
  const groups = groupsQuery.data ?? []
  const selection = selectionQuery.data ?? null

  const activeProfile =
    selection?.type === 'profile'
      ? (profiles.find((p) => p.id === selection.profileId) ?? null)
      : null
  const activeGroup =
    selection?.type === 'group' ? (groups.find((g) => g.id === selection.groupId) ?? null) : null
  const activeGroupMembers = activeGroup
    ? profiles.filter((p) => activeGroup.memberProfileIds.includes(p.id))
    : []

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profiles'] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['activeSelection'] }),
    ])
  }, [queryClient])

  const setActiveProfile = useCallback(
    async (id: string) => {
      await persistActiveProfileId(id)
      await queryClient.invalidateQueries({ queryKey: ['activeSelection'] })
      // The active selection drives suitability evaluation — invalidate it too.
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    [queryClient],
  )

  const setActiveGroup = useCallback(
    async (id: string) => {
      await persistActiveGroupId(id)
      await queryClient.invalidateQueries({ queryKey: ['activeSelection'] })
      await queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
    [queryClient],
  )

  const value = useMemo<ProfilesState>(
    () => ({
      profiles,
      groups,
      activeProfile,
      activeGroup,
      activeGroupMembers,
      hasProfile: profiles.length > 0,
      isLoading: profilesQuery.isLoading || groupsQuery.isLoading || selectionQuery.isLoading,
      refresh,
      setActiveProfile,
      setActiveGroup,
    }),
    [
      profiles,
      groups,
      activeProfile,
      activeGroup,
      activeGroupMembers,
      profilesQuery.isLoading,
      groupsQuery.isLoading,
      selectionQuery.isLoading,
      refresh,
      setActiveProfile,
      setActiveGroup,
    ],
  )

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>
}

function useProfiles(): ProfilesState {
  const ctx = useContext(ProfilesContext)
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider')
  return ctx
}

export { ProfilesProvider, useProfiles }
