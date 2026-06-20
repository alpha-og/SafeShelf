import type { HealthData } from '@/features/health-report/types'

export interface UserProfile {
  allergens: string[]
  conditions: string[]
  conditionCodes: string[]
  dietaryPreferences: string[]
  budget: string
  servingSettings?: ServingSettings
  age?: number | null
  medications?: string[]
  healthData?: HealthData | null
}

export type StepperPhase = 'pending' | 'running' | 'pass' | 'fail' | 'warn'

export interface StepperState {
  basic_metrics: StepperPhase
  basic_metrics_summary?: string
  ingredient_analysis: StepperPhase
  ingredient_analysis_summary?: string
  medication_check: StepperPhase
  medication_check_summary?: string
}

export interface ServingSettings {
  minSolidG: number
  minLiquidMl: number
}

export interface ServingInfo {
  declaredServing: string
  declaredQuantity: number
  unit: 'g' | 'ml'
  racc: number
  raccUnit: 'g' | 'ml'
  raccCategory: string
  ratio: number
  adjusted: boolean
  flagged: boolean
  note: string
}

export interface IngredientAttribute {
  text: string
  vegan?: boolean
  vegetarian?: boolean
}

export interface Rule {
  nutrient: string
  value: number
  operator: string
  unit: string
}

export interface ConditionThreshold {
  disease: string
  code: string
  rules: Rule[]
  recommendations: string[]
  exclusions: string[]
  interaction_rules: Record<string, unknown>[]
}

export type SuitabilityStatus = 'pass' | 'warn' | 'fail'

export type OverallStatus = 'suitable' | 'caution' | 'unsuitable'

export type CheckType = 'allergen' | 'nutrient' | 'exclusion' | 'diet' | 'traces' | 'agent_insight'

export interface SuitabilityCheck {
  type: CheckType
  status: SuitabilityStatus
  label: string
  detail: string
  group?: string
  /** Names of the active Group Buy members this check applies to. Set only when
   *  a group is active and the check isn't a pass; undefined for a single profile. */
  owners?: string[]
}

/** A single Group Buy member resolved into a suitability profile, tagged with
 *  the member's display name so checks can be attributed back to them. */
export interface GroupMemberProfile {
  name: string
  profile: UserProfile
}

export interface SuitabilityContext {
  /** The profile suitability runs against: for a Group Buy group this is the
   *  strictest-wins merge of all members; for a single selection it's that profile. */
  profile: UserProfile
  /** Per-member profiles when a Group Buy group is active, so each check can be
   *  attributed to whoever it affects. Null when a single profile is active. */
  members: GroupMemberProfile[] | null
}

export interface SuitabilityResult {
  overall: OverallStatus
  checks: SuitabilityCheck[]
  insights: string[]
  serving?: ServingInfo | null
}

export const DEFAULT_SERVING_SETTINGS: ServingSettings = {
  minSolidG: 15,
  minLiquidMl: 100,
}
