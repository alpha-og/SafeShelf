import type { ConstraintItem } from './services/constraints'

export interface ServingSettings {
  minSolidG: number
  minLiquidMl: number
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  minSolidG: 15,
  minLiquidMl: 100,
}

/** A prescription document the user uploaded. The actual file is handed to the
 * backend connector for processing (OCR / extraction); we keep only metadata
 * and a processing status locally. See services/prescriptions.ts. */
export interface PrescriptionFile {
  id: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  /** Set by the backend once it has processed the document. */
  status: 'pending' | 'processed' | 'failed'
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
  /** Uploaded prescription documents (metadata only). Optional for profiles
   * created before this field existed. */
  prescriptions?: PrescriptionFile[]
  /** True for the profile created during onboarding. Informational only —
   * deletion of the last remaining profile is blocked regardless of this flag. */
  isMain: boolean
  createdAt: string
  updatedAt: string
}

export interface ProfileGroup {
  id: string
  name: string
  /** Membership by id, not duplicated profile data — resolve against the live profile list. */
  memberProfileIds: string[]
  createdAt: string
  updatedAt: string
}

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>
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
