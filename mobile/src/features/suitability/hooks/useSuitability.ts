import { useMemo } from 'react'
import type { ProductInfo } from '@/features/products/services/product'
import { evaluate } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type { SuitabilityResult, UserProfile } from '../types'
import { useUserProfile } from './useUserProfile'

interface UseSuitabilityReturn {
  result: SuitabilityResult | null
  isLoading: boolean
  error: Error | null
}

export function useSuitability(
  product: ProductInfo | null,
  profile?: UserProfile | null,
): UseSuitabilityReturn {
  const { data: autoProfile, isLoading: profileLoading } = useUserProfile()

  const effectiveProfile = profile ?? autoProfile ?? null
  const conditionCodes = effectiveProfile?.conditionCodes ?? []

  const { rules, isLoading: rulesLoading, errors } = useConditionRules(conditionCodes)
  const { data: aliases, isLoading: aliasesLoading } = useAliases()

  const result = useMemo<SuitabilityResult | null>(() => {
    if (!product || !effectiveProfile) return null
    return evaluate(product, effectiveProfile, rules, aliases ?? {})
  }, [product, effectiveProfile, rules, aliases])

  const allErrors = errors
  return {
    result,
    isLoading: profileLoading || rulesLoading || aliasesLoading,
    error: allErrors.length > 0 ? (allErrors[0] as Error) : null,
  }
}
