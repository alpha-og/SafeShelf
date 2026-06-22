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
import { Stack } from '@/components/ui/Stack'
import { PackageX, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'

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

  //full product info
  const { data: evaluatedSuggestions = [], isLoading: isEvaluating } = useQuery({
    queryKey: ['evaluatedSuggestions', barcode, rawSuggestions.map((s) => s.barcode).join(',')],
    queryFn: async () => {
      const safeProducts: ProductInfo[] = []
      const fullProducts = await Promise.all(
        rawSuggestions.map((s) => lookupByBarcode(s.barcode))
      )

      for (const p of fullProducts) {
        if (!p) continue

        //evaluate against user
        const suitability = evaluateContext(p, context!, rules!, aliases!)

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
    // Wait for all dependencies before running evaluation
    enabled: rawSuggestions.length > 0 && !!context && !!rules && !!aliases,
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

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blurred backdrop */}
          <motion.div
            key="suggestions-backdrop"
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Card stack overlay */}
          <motion.div
            key="suggestions-content"
            className="fixed inset-0 z-[71] flex flex-col items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Close button */}
            <div className="pointer-events-auto absolute top-[calc(var(--sat,0px)+1rem)] right-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Label */}
            <p className="text-white/60 text-xs tracking-widest uppercase font-semibold mb-6 pointer-events-none">
              Safe Alternatives
            </p>

            {/* Stack */}
            <div className="w-[72vw] max-w-xs pointer-events-auto" style={{ height: '380px' }}>
              <Stack
                cards={cards}
                sendToBackOnClick={false}
                randomRotation={true}
                sensitivity={100}
              />
            </div>

            {/* Hint */}
            <p className="text-white/40 text-xs mt-6 animate-pulse pointer-events-none">
              Swipe cards · Tap to view details
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div className="w-full pt-2 pb-2">
      <Button
        variant="secondary"
        className="w-full h-14 text-base font-semibold rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
        onClick={() => setIsOpen(true)}
      >
        View Safe Alternatives
      </Button>

      {createPortal(overlay, document.body)}
    </div>
  )
}
