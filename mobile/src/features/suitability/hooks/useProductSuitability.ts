import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lookupByBarcode } from '@/features/products/services/product'
import { evaluate } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type { SuitabilityResult } from '../types'
import { useUserProfile } from './useUserProfile'

interface UseProductSuitabilityReturn {
  result: SuitabilityResult | null
  isLoading: boolean
}

export function useProductSuitability(
  barcode: string | null,
  enabled: boolean,
): UseProductSuitabilityReturn {
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: () => lookupByBarcode(barcode!),
    enabled: enabled && !!barcode,
    staleTime: 5 * 60 * 1000,
  })

  const { data: profile, isLoading: profileLoading } = useUserProfile()
  const conditionCodes = profile?.conditionCodes ?? []
  const { rules, isLoading: rulesLoading } = useConditionRules(conditionCodes)
  const { data: aliases, isLoading: aliasesLoading } = useAliases()

  const result = useMemo<SuitabilityResult | null>(() => {
    if (!product || !profile) return null
    return evaluate(product, profile, rules, aliases ?? {})
  }, [product, profile, rules, aliases])

  return {
    result,
    isLoading: productLoading || profileLoading || rulesLoading || aliasesLoading,
  }
}
