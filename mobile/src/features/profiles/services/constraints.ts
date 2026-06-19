import { api } from '@/lib/axios'

export interface ConstraintItem {
  id: string
  name: string
}

export type ConstraintKind = 'condition' | 'allergen'

// Conditions are owned by our backend. Shape is best-guess REST and may change
// once Aleena's API lands — only this file needs updating.
const CONDITION_SEARCH_ENDPOINT = '/v1/conditions/search'

// Allergens use Open Food Facts' public taxonomy autocomplete, which returns a
// plain array of allergen tag strings, e.g. ["nuts","peanuts"] for "nut".
const ALLERGEN_SUGGEST_URL = 'https://world.openfoodfacts.org/cgi/suggest.pl'

function titleCase(tag: string): string {
  return tag
    .split(/[\s-]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

/** Append `additions` to `existing`, skipping any whose name already appears
 * (case-insensitive). Used to fold prescription-extracted items into a profile. */
export function mergeConstraints(
  existing: ConstraintItem[],
  additions: ConstraintItem[],
): ConstraintItem[] {
  const seen = new Set(existing.map((c) => c.name.trim().toLowerCase()))
  const merged = [...existing]
  for (const item of additions) {
    const key = item.name.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }
  return merged
}

async function searchConditions(query: string): Promise<ConstraintItem[]> {
  const res = await api.get<ConstraintItem[]>(CONDITION_SEARCH_ENDPOINT, {
    params: { q: query },
  })
  return res.data
}

async function searchAllergens(query: string): Promise<ConstraintItem[]> {
  const url = `${ALLERGEN_SUGGEST_URL}?tagtype=allergens&term=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Allergen search failed: ${res.status}`)
  const tags = (await res.json()) as string[]
  const valid = tags.filter(Boolean)
  return valid.map((tag) => ({ id: tag, name: titleCase(tag) }))
}

export async function searchConstraints(
  kind: ConstraintKind,
  query: string,
): Promise<ConstraintItem[]> {
  return kind === 'allergen' ? searchAllergens(query) : searchConditions(query)
}
