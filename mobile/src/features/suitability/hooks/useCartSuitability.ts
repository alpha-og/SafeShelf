import { useMemo } from 'react'
import type { CartItem } from '@/providers/CartProvider'
import { evaluateContext } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type { SuitabilityResult } from '../types'
import { useUserProfile } from './useUserProfile'

/**
 * Evaluates every cart item against the active profile (or merged Group Buy
 * group), keyed by barcode. Conditions/allergens come from the active
 * selection, so a single set of rules is fetched and reused across items.
 */
export function useCartSuitability(items: CartItem[]): Map<string, SuitabilityResult> {
  const { data: context } = useUserProfile()
  const conditionCodes = context?.profile.conditionCodes ?? []
  const { rules } = useConditionRules(conditionCodes)
  const { data: aliases } = useAliases()

  return useMemo(() => {
    const results = new Map<string, SuitabilityResult>()
    if (!context) return results
    for (const item of items) {
      const key = item.product.barcode
      if (!key) continue
      results.set(key, evaluateContext(item.product, context, rules, aliases ?? {}))
    }
    return results
  }, [items, context, rules, aliases])
}
