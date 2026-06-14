import type { ProductInfo } from '@/features/products/services/product'
import type {
  ConditionThreshold,
  SuitabilityCheck,
  SuitabilityResult,
  UserProfile,
  ServingInfo,
  ServingSettings,
} from './types'
import { DEFAULT_SERVING_SETTINGS } from './types'
import { getRacc, getRaccCategoryName } from './racc'

const DIETARY_INGREDIENT_MAP: Record<string, string[]> = {
  vegan: [
    'meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck', 'fish', 'seafood',
    'milk', 'cream', 'cheese', 'butter', 'yogurt', 'eggs', 'honey', 'gelatin',
    'lard', 'tallow', 'whey', 'casein', 'shellac', 'carmine',
  ],
  vegetarian: [
    'meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck', 'fish', 'seafood',
    'gelatin', 'lard', 'tallow',
  ],
  pescatarian: [
    'meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck',
    'gelatin', 'lard', 'tallow',
  ],
  halal: [
    'pork', 'bacon', 'ham', 'alcohol', 'ethanol', 'gelatin', 'lard',
    'non-halal meat', 'rennet',
  ],
  kosher: [
    'pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'crab', 'lobster',
    'gelatin', 'lard', 'rabbit',
  ],
  'gluten-free': [
    'wheat', 'barley', 'rye', 'malt', 'brewers yeast', 'triticale',
    'semolina', 'spelt', 'farro', 'durum', 'bulgur',
  ],
  'dairy-free': [
    'milk', 'cream', 'cheese', 'butter', 'yogurt', 'whey', 'casein',
    'lactose', 'milk solids', 'buttermilk', 'ghee',
  ],
}

const DIETARY_NUTRIENT_MAP: Record<string, { nutrient: string; max: number; unit: string }> = {
  'low-sugar': { nutrient: 'sugars', max: 5, unit: 'g' },
  'low-sodium': { nutrient: 'sodium', max: 140, unit: 'mg' },
}

const PREF_LABEL_MAP: Record<string, string[]> = {
  vegan: ['vegan'],
  vegetarian: ['vegetarian'],
  pescatarian: ['pescatarian'],
  halal: ['halal'],
  kosher: ['kosher'],
  'gluten-free': ['gluten free', 'no gluten'],
  'dairy-free': ['dairy free', 'lactose free'],
}

const NUTRIENT_KEY_MAP: Record<string, string[]> = {
  sodium: ['sodium'],
  salt: ['salt'],
  saturated_fat: ['saturated-fat', 'saturated_fat'],
  trans_fat: ['trans-fat', 'trans_fat'],
  added_sugars: ['sugars'],
  sugars: ['sugars'],
  sugar: ['sugars'],
  fiber: ['fiber'],
  dietary_fiber: ['fiber'],
  fat: ['fat'],
  total_fat: ['fat'],
  carbohydrates: ['carbohydrates'],
  carbs: ['carbohydrates'],
  protein: ['proteins', 'protein'],
  energy: ['energy-kcal', 'energy'],
  cholesterol: ['cholesterol'],
}

function getNutrientValuePer100g(
  nutrients: Record<string, unknown>,
  nutrientName: string,
): { value: number; unit: 'g' | 'kcal' } | null {
  const keys = NUTRIENT_KEY_MAP[nutrientName] ?? [nutrientName]

  for (const key of keys) {
    const raw = nutrients[`${key}_100g`]
    if (typeof raw === 'number' && !Number.isNaN(raw)) {
      const isEnergy = key === 'energy' || key === 'energy-kcal'
      return { value: raw, unit: isEnergy ? 'kcal' : 'g' }
    }
  }
  return null
}

function convertUnit(value: number, from: string, to: string): number {
  if (from === to || to === '%') return value
  if (from === 'g' && to === 'mg') return value * 1000
  if (from === 'g' && to === 'mcg') return value * 1_000_000
  if (from === 'mg' && to === 'g') return value / 1000
  if (from === 'mg' && to === 'mcg') return value * 1000
  if (from === 'mcg' && to === 'g') return value / 1_000_000
  if (from === 'mcg' && to === 'mg') return value / 1000
  if (from === 'kcal' && to === 'kJ') return value * 4.184
  if (from === 'kJ' && to === 'kcal') return value / 4.184
  console.warn('convertUnit: unknown pair', { from, to })
  return value
}

function applyOperator(value: number, threshold: number, operator: string): boolean {
  switch (operator) {
    case 'le':
      return value <= threshold
    case 'ge':
      return value >= threshold
    case 'lt':
      return value < threshold
    case 'gt':
      return value > threshold
    case 'eq':
      return value === threshold
    default:
      return true
  }
}

const NUTRIENT_NAMES = new Set([
  'sodium', 'salt',
  'saturated_fat', 'saturated-fat', 'saturated fat',
  'trans_fat', 'trans-fat', 'trans fat',
  'added_sugars', 'added-sugars', 'added sugars',
  'sugars', 'sugar',
  'fiber', 'dietary_fiber', 'dietary-fiber', 'dietary fiber',
  'fat', 'total_fat', 'total-fat', 'total fat',
  'carbohydrates', 'carbs',
  'protein', 'proteins',
  'energy', 'cholesterol',
])

const DAILY_VALUE_HINTS: Record<string, { max: number; unit: string }> = {
  fiber: { max: 20, unit: 'g' },
  sodium: { max: 3000, unit: 'mg' },
  salt: { max: 5000, unit: 'mg' },
  saturated_fat: { max: 30, unit: 'g' },
  trans_fat: { max: 10, unit: 'g' },
  sugars: { max: 80, unit: 'g' },
  added_sugars: { max: 80, unit: 'g' },
  protein: { max: 80, unit: 'g' },
  carbohydrates: { max: 150, unit: 'g' },
  fat: { max: 80, unit: 'g' },
  cholesterol: { max: 800, unit: 'mg' },
  energy: { max: 1500, unit: 'kcal' },
}

function getDailyHint(nutrient: string, value: number, unit: string): string | null {
  const hint = DAILY_VALUE_HINTS[nutrient]
  if (!hint) return null
  const converted = unit === hint.unit ? value
    : unit === 'g' && hint.unit === 'mg' ? value * 1000
    : unit === 'mg' && hint.unit === 'g' ? value / 1000
    : unit === 'mcg' && hint.unit === 'mg' ? value / 1000
    : unit === 'mg' && hint.unit === 'mcg' ? value * 1000
    : unit === 'g' && hint.unit === 'mcg' ? value * 1_000_000
    : unit === 'mcg' && hint.unit === 'g' ? value / 1_000_000
    : value
  if (converted > hint.max) return 'daily'
  return null
}

function nutrientFailLabel(operator: string, nutrient: string, disease: string): string {
  switch (operator) {
    case 'le': return `${capitalize(nutrient)} exceeds limit for ${disease}`
    case 'ge': return `${capitalize(nutrient)} below minimum for ${disease}`
    case 'lt': return `${capitalize(nutrient)} at or above limit for ${disease}`
    case 'gt': return `${capitalize(nutrient)} below minimum for ${disease}`
    case 'eq': return `${capitalize(nutrient)} does not match ${disease} guideline`
    default: return `${capitalize(nutrient)} violates guideline for ${disease}`
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
}

function parseServingSize(servingSize: string | null): { quantity: number; unit: 'g' | 'ml' } | null {
  if (!servingSize) return null
  const pattern = /\(?(\d+(?:\.\d+)?)\s*(g|ml|mL)\)?/i
  const match = servingSize.match(pattern)
  if (match) {
    const quantity = parseFloat(match[1])
    const unit = match[2].toLowerCase() as 'g' | 'ml'
    if (quantity > 0) return { quantity, unit }
  }
  return null
}

function buildServingInfo(
  servingSize: string | null,
  categories: string[],
  settings: ServingSettings,
): ServingInfo | null {
  const parsed = parseServingSize(servingSize)
  if (!parsed) return null

  const racc = getRacc(categories)
  const raccName = getRaccCategoryName(categories)
  const ratio = parsed.unit === racc.unit
    ? parsed.quantity / racc.value
    : parsed.quantity / racc.value

  const isLiquid = parsed.unit === 'ml' || racc.unit === 'ml'
  const minThreshold = isLiquid ? settings.minLiquidMl : settings.minSolidG
  const flagged = parsed.quantity < minThreshold

  const adjusted = ratio < 0.5
  const note = adjusted
    ? `Serving adjusted from ${parsed.quantity}${parsed.unit} to RACC of ${racc.value}${racc.unit} (${raccName})`
    : flagged
      ? `Serving size (${parsed.quantity}${parsed.unit}) is unusually small`
      : ''

  return {
    declaredServing: servingSize!,
    declaredQuantity: parsed.quantity,
    unit: parsed.unit,
    racc: racc.value,
    raccUnit: racc.unit,
    raccCategory: raccName,
    ratio,
    adjusted,
    flagged,
    note,
  }
}

function checkAllergens(
  productAllergens: string[],
  userAllergens: string[],
): SuitabilityCheck[] {
  if (!userAllergens.length || !productAllergens.length) return []

  const userLower = userAllergens.map((a) => a.toLowerCase())
  const checks: SuitabilityCheck[] = []

  for (const allergen of productAllergens) {
    if (userLower.includes(allergen.toLowerCase())) {
      checks.push({
        type: 'allergen',
        status: 'fail',
        label: `Contains ${allergen}`,
        detail: `${allergen} is in your allergen list`,
        group: 'Allergens',
      })
    }
  }

  return checks
}

function checkAllergenTraces(
  productTraces: string[],
  userAllergens: string[],
): SuitabilityCheck[] {
  if (!userAllergens.length || !productTraces.length) return []

  const userLower = userAllergens.map((a) => a.toLowerCase())
  const checks: SuitabilityCheck[] = []

  for (const trace of productTraces) {
    if (userLower.includes(trace.toLowerCase())) {
      checks.push({
        type: 'traces',
        status: 'warn',
        label: `May contain ${trace}`,
        detail: `${trace} is in your allergen list — product may contain traces`,
        group: 'Allergens',
      })
    }
  }

  return checks
}

function checkNutrients(
  nutrients: Record<string, unknown>,
  thresholds: ConditionThreshold[],
  scaleFactor: number,
): SuitabilityCheck[] {
  const checks: SuitabilityCheck[] = []

  for (const threshold of thresholds) {
    for (const rule of threshold.rules) {
      const per100g = getNutrientValuePer100g(nutrients, rule.nutrient)
      if (!per100g) continue

      const scaled = per100g.value * scaleFactor
      const converted = convertUnit(scaled, per100g.unit, rule.unit)
      const meetsRule = applyOperator(converted, rule.value, rule.operator)

      if (!meetsRule) {
        const pct = (converted / rule.value) * 100
        const dailyHint = getDailyHint(rule.nutrient, rule.value, rule.unit)
        const dailyStr = dailyHint ? ` ${dailyHint}` : ''
        const limitWord = rule.operator === 'le' || rule.operator === 'lt' ? 'limit' : rule.operator === 'eq' ? 'target' : 'minimum'
        checks.push({
          type: 'nutrient',
          status: 'fail',
          label: nutrientFailLabel(rule.operator, rule.nutrient, threshold.disease),
          detail: `${converted.toFixed(1)}${rule.unit}/serving — ${pct.toFixed(0)}% of the ${rule.value}${rule.unit}${dailyStr} ${limitWord}`,
          group: threshold.disease,
        })
      }
    }
  }

  return checks
}

function checkExclusions(
  productIngredients: string[],
  thresholds: ConditionThreshold[],
  aliases: Record<string, string>,
): SuitabilityCheck[] {
  if (!productIngredients.length) return []

  const ingredientLower = productIngredients.map((i) => i.toLowerCase())
  const checks: SuitabilityCheck[] = []

  for (const threshold of thresholds) {
    for (const exclusion of threshold.exclusions) {
      if (NUTRIENT_NAMES.has(exclusion.toLowerCase())) continue

      const trigger = aliases[exclusion.toLowerCase()] ?? exclusion
      const triggerLower = trigger.toLowerCase()

      const matched = ingredientLower.some(
        (ing) => ing.includes(triggerLower) || ing.includes(exclusion.toLowerCase()),
      )

      if (matched) {
        checks.push({
          type: 'exclusion',
          status: 'fail',
          label: `Contains excluded ingredient: ${exclusion}`,
          detail: `${exclusion} is excluded for ${threshold.disease}`,
          group: threshold.disease,
        })
      }
    }
  }

  return checks
}

function checkDietary(
  productIngredients: string[],
  productNutrients: Record<string, unknown>,
  dietaryPreferences: string[],
  aliases: Record<string, string>,
  labels: string[],
): SuitabilityCheck[] {
  if (!dietaryPreferences.length) return []

  const ingredientLower = productIngredients.map((i) => i.toLowerCase())
  const labelsLower = labels.map((l) => l.toLowerCase())
  const checks: SuitabilityCheck[] = []

  for (const pref of dietaryPreferences) {
    const matchingLabels = PREF_LABEL_MAP[pref] ?? []
    const hasLabel = matchingLabels.some((l) => labelsLower.includes(l))

    const disallowed = DIETARY_INGREDIENT_MAP[pref]
    const nutrientCheck = DIETARY_NUTRIENT_MAP[pref]

    if (disallowed && !hasLabel) {
      for (const item of disallowed) {
        const trigger = aliases[item.toLowerCase()] ?? item
        const triggerLower = trigger.toLowerCase()
        const matched = ingredientLower.some(
          (ing) =>
            ing.includes(triggerLower) ||
            ing.includes(item.toLowerCase()),
        )
        if (matched) {
          checks.push({
            type: 'diet',
            status: 'fail',
            label: `Not ${pref}: contains ${item}`,
            detail: `This product contains ${item}, which is not compatible with a ${pref} diet`,
            group: 'Dietary preferences',
          })
          break
        }
      }
    }

    if (nutrientCheck) {
      const per100g = getNutrientValuePer100g(productNutrients, nutrientCheck.nutrient)
      if (per100g) {
        const scaleFactor = 1
        const scaled = per100g.value * scaleFactor
        const converted = convertUnit(scaled, per100g.unit, nutrientCheck.unit)
        if (converted > nutrientCheck.max) {
          checks.push({
            type: 'diet',
            status: 'fail',
            label: `Exceeds ${pref} limit`,
            detail: `${capitalize(nutrientCheck.nutrient)} is ${converted.toFixed(1)}${nutrientCheck.unit} per 100g, exceeding the ${pref} limit of ${nutrientCheck.max}${nutrientCheck.unit}`,
            group: 'Dietary preferences',
          })
        }
      }
    }
  }

  return checks
}

export function evaluate(
  product: ProductInfo,
  profile: UserProfile,
  thresholds: ConditionThreshold[],
  aliases: Record<string, string>,
): SuitabilityResult {
  const checks: SuitabilityCheck[] = []
  const settings = profile.servingSettings ?? DEFAULT_SERVING_SETTINGS

  const servingInfo = buildServingInfo(product.servingSize, product.categories, settings)
  const scaleFactor = servingInfo?.adjusted
    ? servingInfo.racc / 100
    : servingInfo
      ? servingInfo.declaredQuantity / 100
      : 1

  checks.push(...checkAllergens(product.allergens, profile.allergens))
  checks.push(...checkAllergenTraces(product.allergenTraces, profile.allergens))

  const matchedConditions = thresholds.filter((ct) =>
    profile.conditions.some((c) => c.toLowerCase() === ct.disease.toLowerCase()),
  )

  for (const threshold of matchedConditions) {
    checks.push(...checkNutrients(product.nutrients, [threshold], scaleFactor))
    checks.push(
      ...checkExclusions(product.ingredients, [threshold], aliases),
    )
  }

  checks.push(
    ...checkDietary(product.ingredients, product.nutrients, profile.dietaryPreferences, aliases, product.labels),
  )

  const checkGroups = new Set(checks.map((c) => c.group).filter(Boolean))

  for (const threshold of matchedConditions) {
    if (!checkGroups.has(threshold.disease)) {
      checks.push({
        type: 'nutrient',
        status: 'pass',
        label: 'All guidelines met',
        detail: `All nutrient and ingredient guidelines for ${threshold.disease} are satisfied`,
        group: threshold.disease,
      })
    }
  }

  if (profile.allergens.length > 0 && !checkGroups.has('Allergens')) {
    checks.push({
      type: 'allergen',
      status: 'pass',
      label: 'No allergen conflicts',
      detail: 'This product does not contain any of your listed allergens',
      group: 'Allergens',
    })
  }

  if (profile.dietaryPreferences.length > 0 && !checkGroups.has('Dietary preferences')) {
    checks.push({
      type: 'diet',
      status: 'pass',
      label: 'All dietary preferences met',
      detail: 'This product satisfies your dietary preferences',
      group: 'Dietary preferences',
    })
  }

  const hasFail = checks.some((c) => c.status === 'fail')
  const hasWarn = checks.some((c) => c.status === 'warn')

  const overall = hasFail ? 'unsuitable' : hasWarn ? 'caution' : 'suitable'

  const insights = checks.filter((c) => c.status !== 'pass').map((c) => c.detail)

  if (servingInfo?.note) {
    insights.push(servingInfo.note)
  }

  return { overall, checks, insights, serving: servingInfo }
}
