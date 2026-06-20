import { useQuery } from '@tanstack/react-query'
import { getSuggestions, lookupByBarcode, type ProductInfo } from '../services/product'
import { evaluateContext } from '@/features/suitability/evaluate'
import { useUserProfile } from '@/features/suitability/hooks/useUserProfile'
import { useConditionRules, useAliases } from '@/features/suitability/services/rules'
import { useNavigate } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useStore } from '@/providers/StoreProvider'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Stack } from '@/components/ui/Stack'
import { PackageX } from 'lucide-react'

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
  const [isOpen, setIsOpen] = useState(false)

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

        //stop if we have 5 products to make the stack look good
        if (safeProducts.length >= 5) break
      }

      return safeProducts
    },
    enabled: rawSuggestions.length > 0,
  })

  if (isLoadingSuggestions || (rawSuggestions.length > 0 && isEvaluating)) {
    return (
      <div className="w-full pt-2">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    )
  }

  if (evaluatedSuggestions.length === 0) {
    return null
  }

  const cards = evaluatedSuggestions.map((p) => (
    <div 
      key={p.barcode} 
      className="w-full h-full flex flex-col relative" 
      onClick={() => {
        setIsOpen(false)
        navigate({ to: '/product/$barcode', params: { barcode: p.barcode! } })
      }}
    >
      <div className="w-full h-[60%] relative bg-white/5 flex items-center justify-center p-4">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.productName || 'Product'} className="w-full h-full object-contain pointer-events-none" />
        ) : (
          <PackageX className="w-12 h-12 text-muted-foreground/50" />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1 gap-2 border-t border-border/50">
        <h3 className="font-bold text-xl leading-tight line-clamp-2">{p.productName || 'Unknown Product'}</h3>
        {p.brand && <p className="text-muted-foreground font-medium">{p.brand}</p>}
        <div className="mt-auto">
          <Button variant="default" className="w-full pointer-events-none">View Details</Button>
        </div>
      </div>
    </div>
  ))

  return (
    <div className="w-full pt-2 pb-2">
      <Button 
        variant="secondary" 
        className="w-full h-14 text-base font-semibold rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
        onClick={() => setIsOpen(true)}
      >
        View Safe Alternatives
      </Button>

      <BottomSheet
        open={isOpen}
        onDismiss={() => setIsOpen(false)}
        snapPoints={{ peek: 10, full: 0 }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
          <div className="w-full max-w-sm aspect-[3/4]">
            <Stack 
              cards={cards} 
              sendToBackOnClick={false} 
              randomRotation={true}
              sensitivity={100}
            />
          </div>
          <p className="text-muted-foreground text-sm mt-8 animate-pulse text-center">
            Swipe cards to browse, tap to view details
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}
