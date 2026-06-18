import { generateId } from '@/lib/id'
import { getItem, setItem } from '@/lib/storage'
import type {
  ActiveSelection,
  GroupInput,
  GroupPatch,
  Profile,
  ProfileGroup,
  ProfileInput,
  ProfilePatch,
} from '../types'

const PROFILES_KEY = 'profiles:list'
const ACTIVE_SELECTION_KEY = 'profiles:active_selection'
const GROUPS_KEY = 'profiles:groups'

export class CannotDeleteLastProfileError extends Error {
  constructor() {
    super('Cannot delete the only remaining profile')
    this.name = 'CannotDeleteLastProfileError'
  }
}

function utcnow(): string {
  return new Date().toISOString()
}

// ---- Profiles ---------------------------------------------------------

export async function listProfiles(): Promise<Profile[]> {
  return (await getItem<Profile[]>(PROFILES_KEY)) ?? []
}

export async function getProfile(id: string): Promise<Profile | null> {
  const profiles = await listProfiles()
  return profiles.find((p) => p.id === id) ?? null
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  const profiles = await listProfiles()
  const now = utcnow()
  const profile: Profile = {
    ...input,
    id: generateId(),
    healthData: input.healthData ?? null,
    createdAt: now,
    updatedAt: now,
  }
  await setItem(PROFILES_KEY, [...profiles, profile])

  // If this is the only profile, auto-set it as active.
  if (profiles.length === 0) {
    await setActiveProfileId(profile.id)
  }

  return profile
}

export async function updateProfile(id: string, patch: ProfilePatch): Promise<Profile> {
  const profiles = await listProfiles()
  let updated: Profile | null = null
  const next = profiles.map((p) => {
    if (p.id !== id) return p
    updated = { ...p, ...patch, id: p.id, createdAt: p.createdAt, updatedAt: utcnow() }
    return updated
  })
  if (!updated) throw new Error(`Profile not found: ${id}`)
  await setItem(PROFILES_KEY, next)
  return updated
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await listProfiles()
  if (profiles.length <= 1) throw new CannotDeleteLastProfileError()

  const next = profiles.filter((p) => p.id !== id)
  await setItem(PROFILES_KEY, next)

  // Remove the deleted profile from any group memberships.
  const groups = await listGroups()
  const updatedGroups = groups.map((g) => ({
    ...g,
    memberProfileIds: g.memberProfileIds.filter((pid) => pid !== id),
  }))
  await setItem(GROUPS_KEY, updatedGroups)

  // If only one profile remains, it should be active by default.
  if (next.length === 1) {
    await setActiveProfileId(next[0].id)
  } else {
    // Fall back to another profile if the deleted one was the active selection.
    const selection = await getActiveSelection()
    if (selection?.type === 'profile' && selection.profileId === id) {
      await setActiveProfileId(next[0].id)
    }
  }
}

// ---- Active selection (a single profile, or a Group Buy group) --------

export async function getActiveSelection(): Promise<ActiveSelection | null> {
  const stored = await getItem<ActiveSelection>(ACTIVE_SELECTION_KEY)
  if (stored) return stored

  // No active selection stored. If there's exactly one profile, auto-select it.
  const profiles = await listProfiles()
  if (profiles.length === 1) {
    return { type: 'profile', profileId: profiles[0].id }
  }

  return null
}

export async function setActiveProfileId(profileId: string): Promise<void> {
  const selection: ActiveSelection = { type: 'profile', profileId }
  await setItem(ACTIVE_SELECTION_KEY, selection)
}

export async function setActiveGroupId(groupId: string): Promise<void> {
  const selection: ActiveSelection = { type: 'group', groupId }
  await setItem(ACTIVE_SELECTION_KEY, selection)
}

// ---- Groups -------------------------------------------------------------

export async function listGroups(): Promise<ProfileGroup[]> {
  return (await getItem<ProfileGroup[]>(GROUPS_KEY)) ?? []
}

export async function getGroup(id: string): Promise<ProfileGroup | null> {
  const groups = await listGroups()
  return groups.find((g) => g.id === id) ?? null
}

export async function createGroup(input: GroupInput): Promise<ProfileGroup> {
  const groups = await listGroups()
  const now = utcnow()
  const group: ProfileGroup = { ...input, id: generateId(), createdAt: now, updatedAt: now }
  await setItem(GROUPS_KEY, [...groups, group])
  return group
}

export async function updateGroup(id: string, patch: GroupPatch): Promise<ProfileGroup> {
  const groups = await listGroups()
  let updated: ProfileGroup | null = null
  const next = groups.map((g) => {
    if (g.id !== id) return g
    updated = { ...g, ...patch, id: g.id, createdAt: g.createdAt, updatedAt: utcnow() }
    return updated
  })
  if (!updated) throw new Error(`Group not found: ${id}`)
  await setItem(GROUPS_KEY, next)
  return updated
}

export async function deleteGroup(id: string): Promise<void> {
  const groups = await listGroups()
  await setItem(
    GROUPS_KEY,
    groups.filter((g) => g.id !== id),
  )

  // Fall back to the first profile if the deleted group was the active selection.
  const selection = await getActiveSelection()
  if (selection?.type === 'group' && selection.groupId === id) {
    const profiles = await listProfiles()
    if (profiles[0]) await setActiveProfileId(profiles[0].id)
  }
}
