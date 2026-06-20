import { useQuery } from '@tanstack/react-query'
import { getSuggestions, lookupByBarcode, type ProductInfo } from '../services/product'
import { evaluateContext } from '@/features/suitability/evaluate'
import { useUserProfile } from '@/features/suitability/hooks/useUserProfile'
import { useConditionRules, useAliases } from '@/features/suitability/services/rules'
import { SectionHeader } from '@/components/SectionHeader'
import { SearchResultCard } from '@/features/search/components/SearchResultCard'
import { useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useStore } from '@/providers/StoreProvider'

interface ProductSuggestionsProps {
  barcode: string
}

export function ProductSuggestions({ barcode }: ProductSuggestionsProps) {
  const { data: context } = useUserProfile()
  const conditionCodes = context?.profile.conditionCodes ?? []
  const { rules } = useConditionRules(conditionCodes)
  const { data: aliases } = useAliases()

  const { selectedStoreId } = useStore()
  const navigate = useNavigate()

  //fetch suggestions from backend
  const { data: rawSuggestions = [], isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['suggestions', barcode, selectedStoreId],
    queryFn: () => getSuggestions(barcode, selectedStoreId ?? undefined, 10), 
    enabled: !!barcode,
  })

  //full product nfo
  const { data: evaluatedSuggestions = [], isLoading: isEvaluating } = useQuery({
    queryKey: ['evaluatedSuggestions', barcode, rawSuggestions.map((s) => s.barcode)],
    queryFn: async () => {
      if (rawSuggestions.length === 0 || !context || !rules || !aliases) return []

      const fullProducts = await Promise.all(
        rawSuggestions.map((s) => lookupByBarcode(s.barcode))
      )

      const safeProducts: ProductInfo[] = []

      for (const p of fullProducts) {
        if (!p) continue

        //evaluate against user
        const suitability = evaluateContext(p, context, rules, aliases)

        // Only include products with no failures or warnings
        const isUnsuitable = suitability.checks.some(
          (c) => c.status === 'fail' || c.status === 'warn'
        )

        if (!isUnsuitable) {
          safeProducts.push(p)
        }

        //stop if we have 3 products
        if (safeProducts.length >= 3) break
      }

      return safeProducts
    },
    enabled: rawSuggestions.length > 0,
  })

  if (isLoadingSuggestions || (rawSuggestions.length > 0 && isEvaluating)) {
    return (
      <section className="mt-8 space-y-4">
        <SectionHeader>Safe Alternatives</SectionHeader>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </section>
    )
  }

  if (evaluatedSuggestions.length === 0) {
    return null
  }

  return (
    <section className="mt-8 space-y-4">
      <SectionHeader>Safe Alternatives</SectionHeader>
      <div className="flex flex-col gap-3">
        {evaluatedSuggestions.map((p) => (
          <SearchResultCard
            key={p.barcode}
            showPrice={false}
            item={{
              barcode: p.barcode!,
              product_name: p.productName,
              product_image: p.imageUrl,
              in_stock: true, 
              quantity: 0,
              price: 0,
              store_id: selectedStoreId ?? '',
            }}
            onClick={(b) => navigate({ to: '/product/$barcode', params: { barcode: b } })}
          />
        ))}
      </div>
    </section>
  )
}
