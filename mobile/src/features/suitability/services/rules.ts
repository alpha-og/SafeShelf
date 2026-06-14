import { api } from '@/lib/axios'
import { setItem } from '@/lib/storage'
import { useQueries, useQuery } from '@tanstack/react-query'
import type { ConditionThreshold, Rule } from '../types'

const ALIASES_CACHE_KEY = 'safeshelf:ingredient_aliases'

function flattenEntry(threshold: {
  disease: string
  code: string
  entries?: Array<{
    rules?: Rule[]
    recommendations?: string[]
    exclusions?: string[]
    interaction_rules?: Record<string, unknown>[]
  }>
}): ConditionThreshold {
  const entry = threshold.entries?.[0] ?? {}
  return {
    disease: threshold.disease,
    code: threshold.code,
    rules: entry.rules ?? [],
    recommendations: entry.recommendations ?? [],
    exclusions: entry.exclusions ?? [],
    interaction_rules: entry.interaction_rules ?? [],
  }
}

async function fetchAndCacheConditionRule(code: string): Promise<ConditionThreshold | null> {
  try {
    const response = await api.get(`/v1/guidelines/${code}`)
    return flattenEntry(response.data)
  } catch (err: any) {
    if (err.response?.status === 404) return null
    throw err
  }
}

export function useConditionRules(codes: string[]) {
  const queries = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['guidelines', 'condition', code] as const,
      queryFn: () => fetchAndCacheConditionRule(code),
      staleTime: 60 * 60 * 1000,
      retry: 2,
    })),
  })

  return {
    rules: queries
      .filter((r) => r.data)
      .map((r) => r.data) as ConditionThreshold[],
    isLoading: queries.some((r) => r.isLoading),
    errors: queries
      .filter((r) => r.error)
      .map((r) => r.error),
  }
}

export function useAliases() {
  return useQuery({
    queryKey: ['guidelines', 'aliases'] as const,
    queryFn: async () => {
      const response = await api.get('/v1/guidelines/aliases')
      const data = response.data as Record<string, string>
      await setItem(ALIASES_CACHE_KEY, data)
      return data
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  })
}
