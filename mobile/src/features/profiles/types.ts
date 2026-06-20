import type { HealthData } from '@/features/health-report/types'
import type { ConstraintItem } from './services/constraints'

export interface ServingSettings {
  minSolidG: number
  minLiquidMl: number
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  minSolidG: 15,
  minLiquidMl: 100,
}

export interface Profile {
  id: string
  name: string
  age: number | null
  dietaryPreferences: string[]
  budget: string
  servingSettings: ServingSettings
  conditions: ConstraintItem[]
  allergens: ConstraintItem[]
  /** True for the profile created during onboarding. Informational only —
   * deletion of the last remaining profile is blocked regardless of this flag. */
  isMain: boolean
  /** Health data extracted from uploaded medical reports via AI. */
  healthData: HealthData | null
  /** File name of the health report the `healthData` was extracted from, shown
   * in the profile's Additional Information section. */
  healthReportFileName?: string | null
  createdAt: string
  updatedAt: string
}

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'healthData'> & {
  healthData?: HealthData | null
}

export interface ProfileGroup {
  id: string
  name: string
  /** Membership by id, not duplicated profile data — resolve against the live profile list. */
  memberProfileIds: string[]
  createdAt: string
  updatedAt: string
}

export type ProfilePatch = Partial<Omit<Profile, 'id' | 'createdAt'>>
export type GroupInput = Pick<ProfileGroup, 'name' | 'memberProfileIds'>
export type GroupPatch = Partial<GroupInput>

/**
 * What's currently driving suitability checks: either a single profile, or a
 * Group Buy group (in which case checks run against every member at once,
 * strictest result wins — see suitability/services/userProfile.ts).
 */
export type ActiveSelection =
  | { type: 'profile'; profileId: string }
  | { type: 'group'; groupId: string }
