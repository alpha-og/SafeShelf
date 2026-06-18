import { useMemo } from 'react'
import type { ProductInfo } from '@/features/products/services/product'
import { evaluateContext } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type { SuitabilityContext, SuitabilityResult, UserProfile } from '../types'
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
  const { data: autoContext, isLoading: profileLoading } = useUserProfile()

  // An explicitly passed profile is always a single profile (no group members).
  const context: SuitabilityContext | null = profile
    ? { profile, members: null }
    : (autoContext ?? null)
  const conditionCodes = context?.profile.conditionCodes ?? []

  const { rules, isLoading: rulesLoading, errors } = useConditionRules(conditionCodes)
  const { data: aliases, isLoading: aliasesLoading } = useAliases()

  const result = useMemo<SuitabilityResult | null>(() => {
    if (!product || !context) return null
    return evaluateContext(product, context, rules, aliases ?? {})
  }, [product, context, rules, aliases])

  const allErrors = errors
  return {
    result,
    isLoading: profileLoading || rulesLoading || aliasesLoading,
    error: allErrors.length > 0 ? (allErrors[0] as Error) : null,
  }
}
