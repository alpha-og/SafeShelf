import { getItem } from '@/lib/storage'
import type { UserProfile, ServingSettings } from '../types'
import { DEFAULT_SERVING_SETTINGS } from '../types'
import type { ConstraintItem } from '@/features/settings/services/constraints'

const CONDITIONS_KEY = 'constraints:conditions'
const ALLERGENS_KEY = 'constraints:allergens'
const PREFERENCES_KEY = 'preferences:dietary'
const BUDGET_KEY = 'preferences:budget'
const SERVING_SETTINGS_KEY = 'preferences:serving_settings'

export async function readUserProfile(): Promise<UserProfile> {
  const conditions = (await getItem<ConstraintItem[]>(CONDITIONS_KEY)) ?? []
  const allergens = (await getItem<ConstraintItem[]>(ALLERGENS_KEY)) ?? []
  const dietaryPreferences = (await getItem<string[]>(PREFERENCES_KEY)) ?? []
  const budget = (await getItem<string>(BUDGET_KEY)) ?? ''
  const servingSettings = (await getItem<ServingSettings>(SERVING_SETTINGS_KEY)) ?? DEFAULT_SERVING_SETTINGS

  return {
    allergens: allergens.map((a) => a.name),
    conditions: conditions.map((c) => c.name),
    conditionCodes: conditions.map((c) => c.id).filter(Boolean),
    dietaryPreferences,
    budget,
    servingSettings,
  }
}
