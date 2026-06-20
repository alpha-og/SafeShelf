import {
  getActiveSelection,
  getGroup,
  getProfile,
  listProfiles,
} from '@/features/profiles/services/profileStorage'
import type { Profile } from '@/features/profiles/types'
import type { HealthData } from '@/features/health-report/types'
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

const CONDITION_MAP: Record<string, { name: string; code: string }> = {
  diabetes: { name: 'Diabetes', code: '5A10' },
  hypertension: { name: 'Hypertension', code: 'BA00' },
  highCholesterol: { name: 'High Cholesterol', code: '5C80' },
  thyroidDisorder: { name: 'Thyroid Disorder', code: '5A00' },
  heartDisease: { name: 'Heart Disease', code: 'BA60' },
  kidneyDisease: { name: 'Kidney Disease', code: 'GB70' },
}

function extractHealthConditions(healthData: HealthData | null | undefined): {
  names: string[]
  codes: string[]
} {
  if (!healthData?.medicalConditions) return { names: [], codes: [] }
  const names: string[] = []
  const codes: string[] = []

  for (const [key, value] of Object.entries(healthData.medicalConditions)) {
    if (value === true) {
      const mapping = CONDITION_MAP[key]
      if (mapping) {
        names.push(mapping.name)
        codes.push(mapping.code)
      }
    }
  }

  return { names, codes }
}

const ALLERGEN_MAP: Record<string, string> = {
  peanut: 'Peanut',
  milk: 'Milk',
  gluten: 'Gluten',
  soy: 'Soy',
  egg: 'Egg',
  treeNuts: 'Tree Nuts',
  shellfish: 'Shellfish',
}

function extractHealthAllergens(healthData: HealthData | null | undefined): string[] {
  if (!healthData?.allergies) return []
  const result: string[] = []

  for (const [key, value] of Object.entries(healthData.allergies)) {
    if (key === 'otherAllergies' && Array.isArray(value)) {
      result.push(...value)
    } else if (value === true) {
      const name = ALLERGEN_MAP[key]
      if (name) result.push(name)
    }
  }

  return result
}

function mergeUserProfile(
  manualAllergens: string[],
  manualConditions: string[],
  manualConditionCodes: string[],
  healthData: HealthData | null | undefined,
): { allergens: string[]; conditions: string[]; conditionCodes: string[] } {
  const healthConditions = extractHealthConditions(healthData)
  const healthAllergens = extractHealthAllergens(healthData)

  const mergedAllergens = [...new Set([...manualAllergens, ...healthAllergens])]
  const mergedConditions = [...new Set([...manualConditions, ...healthConditions.names])]
  const mergedConditionCodes = [...new Set([...manualConditionCodes, ...healthConditions.codes])]

  return {
    allergens: mergedAllergens,
    conditions: mergedConditions,
    conditionCodes: mergedConditionCodes,
  }
}

function mapProfile(profile: Profile): UserProfile {
  const base = {
    allergens: profile.allergens.map((a) => a.name),
    conditions: profile.conditions.map((c) => c.name),
    conditionCodes: profile.conditions.map((c) => c.id).filter(Boolean),
    dietaryPreferences: profile.dietaryPreferences,
    budget: profile.budget,
    servingSettings: profile.servingSettings,
    age: profile.age ?? profile.healthData?.personalDetails?.age ?? null,
    medications: (profile.healthData?.personalDetails as any)?.medications ?? [],
    healthData: profile.healthData,
  }

  const merged = mergeUserProfile(
    base.allergens,
    base.conditions,
    base.conditionCodes,
    profile.healthData,
  )

  return { ...base, ...merged }
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
  const medications = new Set<string>()
  let minBudget: number | null = null
  let minSolidG = 0
  let minLiquidMl = 0
  let minAge: number | null = null

  for (const member of members) {
    const base = {
      allergens: member.allergens.map((a) => a.name),
      conditions: member.conditions.map((c) => c.name),
      conditionCodes: member.conditions.map((c) => c.id).filter(Boolean),
    }

    const merged = mergeUserProfile(
      base.allergens,
      base.conditions,
      base.conditionCodes,
      member.healthData,
    )

    merged.allergens.forEach((a) => allergens.add(a))
    merged.conditions.forEach((c) => conditions.add(c))
    merged.conditionCodes.forEach((c) => conditionCodes.add(c))

    member.dietaryPreferences.forEach((d) => {
      dietaryPreferences.add(d)
    })

    const memberMeds = (member.healthData?.personalDetails as any)?.medications
    if (Array.isArray(memberMeds)) {
      memberMeds.forEach((m) => medications.add(m))
    }

    const age = member.age ?? member.healthData?.personalDetails?.age
    if (age !== null && age !== undefined) {
      minAge = minAge === null ? age : Math.min(minAge, age)
    }

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
    age: minAge,
    medications: [...medications],
    healthData: members[0]?.healthData ?? null,
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
