import {
  getActiveSelection,
  getGroup,
  getProfile,
  listProfiles,
} from '@/features/profiles/services/profileStorage'
import type { Profile } from '@/features/profiles/types'
import type { SuitabilityContext, UserProfile } from '../types'
import { DEFAULT_SERVING_SETTINGS } from '../types'

function emptyProfile(): UserProfile {
  return {
    allergens: [],
    conditions: [],
    conditionCodes: [],
    dietaryPreferences: [],
    budget: '',
    servingSettings: DEFAULT_SERVING_SETTINGS,
  }
}

function mapProfile(profile: Profile): UserProfile {
  return {
    allergens: profile.allergens.map((a) => a.name),
    conditions: profile.conditions.map((c) => c.name),
    conditionCodes: profile.conditions.map((c) => c.id).filter(Boolean),
    dietaryPreferences: profile.dietaryPreferences,
    budget: profile.budget,
    servingSettings: profile.servingSettings,
  }
}

/**
 * Merges a Group Buy group's member profiles into a single check, strictest
 * rule wins across the group: any member's allergen/condition/diet
 * restriction applies to the whole group, the lowest budget caps spend, and
 * serving-size thresholds take the most cautious (highest) value declared by
 * any member.
 */
function mergeProfiles(members: Profile[]): UserProfile {
  if (members.length === 0) return emptyProfile()

  const allergens = new Set<string>()
  const conditions = new Set<string>()
  const conditionCodes = new Set<string>()
  const dietaryPreferences = new Set<string>()
  let minBudget: number | null = null
  let minSolidG = 0
  let minLiquidMl = 0

  for (const member of members) {
    member.allergens.forEach((a) => {
      allergens.add(a.name)
    })
    member.conditions.forEach((c) => {
      conditions.add(c.name)
      if (c.id) conditionCodes.add(c.id)
    })
    member.dietaryPreferences.forEach((d) => {
      dietaryPreferences.add(d)
    })

    const budget = parseInt(member.budget, 10)
    if (!Number.isNaN(budget)) {
      minBudget = minBudget === null ? budget : Math.min(minBudget, budget)
    }

    minSolidG = Math.max(minSolidG, member.servingSettings.minSolidG)
    minLiquidMl = Math.max(minLiquidMl, member.servingSettings.minLiquidMl)
  }

  return {
    allergens: [...allergens],
    conditions: [...conditions],
    conditionCodes: [...conditionCodes],
    dietaryPreferences: [...dietaryPreferences],
    budget: minBudget !== null ? String(minBudget) : '',
    servingSettings: {
      minSolidG: minSolidG || DEFAULT_SERVING_SETTINGS.minSolidG,
      minLiquidMl: minLiquidMl || DEFAULT_SERVING_SETTINGS.minLiquidMl,
    },
  }
}

export async function readUserProfile(): Promise<SuitabilityContext> {
  const selection = await getActiveSelection()
  // Shouldn't normally happen — _authenticated.tsx gates on a profile
  // existing — but stay defensive rather than throwing mid-scan.
  if (!selection) return { profile: emptyProfile(), members: null }

  if (selection.type === 'profile') {
    const profile = await getProfile(selection.profileId)
    return { profile: profile ? mapProfile(profile) : emptyProfile(), members: null }
  }

  const group = await getGroup(selection.groupId)
  if (!group) return { profile: emptyProfile(), members: null }
  const allProfiles = await listProfiles()
  const members = allProfiles.filter((p) => group.memberProfileIds.includes(p.id))
  return {
    profile: mergeProfiles(members),
    // Keep per-member profiles so suitability checks can be attributed back to
    // whoever they affect when this group is the active selection.
    members: members.map((m) => ({ name: m.name, profile: mapProfile(m) })),
  }
}
