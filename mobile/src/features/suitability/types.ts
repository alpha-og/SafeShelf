export interface UserProfile {
  allergens: string[]
  conditions: string[]
  conditionCodes: string[]
  dietaryPreferences: string[]
  budget: string
  servingSettings?: ServingSettings
  age?: number | null
  diseaseSeverities?: Record<string, 'low' | 'moderate' | 'high'>
  medications?: string[]
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
