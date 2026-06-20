import { api } from '@/lib/axios'
import type { HealthData } from '@/features/health-report/types'
import type { ConstraintItem } from './constraints'

/** Health reports are PDFs (the AI extraction reads PDF text). */
export const HEALTH_REPORT_ACCEPT = '.pdf,application/pdf'

const CONDITION_NAMES: Record<string, string> = {
  diabetes: 'Diabetes',
  hypertension: 'Hypertension',
  highCholesterol: 'High Cholesterol',
  thyroidDisorder: 'Thyroid Disorder',
  heartDisease: 'Heart Disease',
  kidneyDisease: 'Kidney Disease',
}

const ALLERGEN_NAMES: Record<string, string> = {
  peanut: 'Peanut',
  milk: 'Milk',
  gluten: 'Gluten',
  soy: 'Soy',
  egg: 'Egg',
  treeNuts: 'Tree Nuts',
  shellfish: 'Shellfish',
}

/** Resolve a condition name to a backend taxonomy id. The report's exact wording
 * is always kept as the display name — only the id is adopted from the search —
 * so a loose first match never relabels the user's condition. */
async function lookupCondition(name: string): Promise<ConstraintItem> {
  try {
    const res = await api.get<{ id: string; name: string }[]>('/v1/conditions/search', {
      params: { q: name },
    })
    if (res.data.length > 0) return { id: res.data[0].id, name }
  } catch {
    // Conditions API unavailable — keep the raw name.
  }
  return { id: '', name }
}

/** Everything a health report can populate on a profile — i.e. all profile
 * fields except the name, which the user always sets themselves. */
export interface ImportedProfileFields {
  age: number | null
  dietaryPreferences: string[]
  conditions: ConstraintItem[]
  allergens: ConstraintItem[]
  healthData: HealthData
  /** Name of the source document the data was extracted from. */
  sourceFileName: string
}

/** Map extracted health-report data into profile fields. */
export async function healthDataToProfileFields(
  data: HealthData,
  sourceFileName: string,
): Promise<ImportedProfileFields> {
  const conditions: ConstraintItem[] = []
  const mc = data.medicalConditions
  if (mc) {
    const verbatim = (mc.otherConditions ?? []).map((c) => c.trim()).filter(Boolean)
    if (verbatim.length > 0) {
      // The report listed conditions explicitly — keep every one, verbatim, so
      // nothing the document stated gets dropped.
      conditions.push(...(await Promise.all(verbatim.map(lookupCondition))))
    } else {
      // No explicit list — fall back to the standard boolean flags.
      const flagged = Object.entries(mc).filter(([, v]) => v === true)
      conditions.push(
        ...(await Promise.all(flagged.map(([key]) => lookupCondition(CONDITION_NAMES[key] ?? key)))),
      )
    }
  }

  const allergens: ConstraintItem[] = []
  if (data.allergies) {
    for (const [key, value] of Object.entries(data.allergies)) {
      if (key !== 'otherAllergies' && value === true && ALLERGEN_NAMES[key]) {
        allergens.push({ id: '', name: ALLERGEN_NAMES[key] })
      }
    }
    if (Array.isArray(data.allergies.otherAllergies)) {
      for (const a of data.allergies.otherAllergies) {
        allergens.push({ id: '', name: a })
      }
    }
  }

  return {
    age: data.personalDetails?.age ?? null,
    dietaryPreferences: data.personalDetails?.dietaryPreferences ?? [],
    conditions,
    allergens,
    healthData: data,
    sourceFileName,
  }
}
