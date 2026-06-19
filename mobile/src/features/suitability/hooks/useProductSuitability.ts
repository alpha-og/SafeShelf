import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lookupByBarcode } from '@/features/products/services/product'
import { evaluate } from '../evaluate'
import { useAliases, useConditionRules } from '../services/rules'
import type { OverallStatus, SuitabilityResult } from '../types'
import { useUserProfile } from './useUserProfile'

interface UseProductSuitabilityReturn {
  result: SuitabilityResult | null
  memberStatuses?: { name: string; overall: OverallStatus }[]
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

  const { data: context, isLoading: profileLoading } = useUserProfile()
  const profile = context?.profile
  const conditionCodes = profile?.conditionCodes ?? []
  const { rules, isLoading: rulesLoading } = useConditionRules(conditionCodes)
  const { data: aliases, isLoading: aliasesLoading } = useAliases()

  const result = useMemo<SuitabilityResult | null>(() => {
    if (!product || !profile) return null
    return evaluate(product, profile, rules, aliases ?? {})
  }, [product, profile, rules, aliases])

  const memberStatuses = useMemo<{ name: string; overall: OverallStatus }[] | undefined>(() => {
    if (!product || !context?.members?.length) return undefined
    return context.members.map((member) => ({
      name: member.name,
      overall: evaluate(product, member.profile, rules, aliases ?? {}).overall,
    }))
  }, [product, context, rules, aliases])

  return {
    result,
    memberStatuses,
    isLoading: productLoading || profileLoading || rulesLoading || aliasesLoading,
  }
}
