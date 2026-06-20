import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { BottomCta } from '@/components/BottomCta'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { CartCta } from '@/features/cart/components/CartCta'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { useCart } from '@/providers/CartProvider'
import { useStore } from '@/providers/StoreProvider'
import { BANNER_COMPACT, BANNER_FULL, useCollapsibleBanner } from '@/hooks/useCollapsibleBanner'
import { lookupByBarcode } from '../services/product'
import { ProductHero } from './ProductHero'
import { ProductInfoSections } from './ProductInfoSections'
import { ProductNutrientTable } from './ProductNutrientTable'
import { ProductScoreBadges } from './ProductScoreBadges'
import { ProductServingNote } from './ProductServingNote'
import { ProductSuggestions } from './ProductSuggestions'

export function ProductDetailPage() {
  const { barcode } = useParams({ from: '/_authenticated/product/$barcode' })
  const router = useRouter()
  const { selectedStoreId } = useStore()
  const { items, addToCart, removeFromCart, updateQuantity } = useCart()

  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', barcode, selectedStoreId],
    queryFn: () => lookupByBarcode(barcode),
    enabled: !!barcode,
  })

  const { result: suitability } = useSuitability(product ?? null)
  const cartItem = product?.barcode
    ? items.find((i) => i.product.barcode === product.barcode)
    : undefined

  const { scrollRef, collapsed } = useCollapsibleBanner()

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <div className="flex-1 flex flex-col min-h-0">
          <Skeleton className="shrink-0 w-full h-56 !rounded-none" />
          <div className="flex-1 px-4 pt-6 space-y-4">
            <Skeleton className="h-8 rounded-lg w-3/4" />
            <Skeleton className="h-4 rounded w-1/2" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-muted-foreground">Could not load product.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col flex-1 min-h-0 bg-background text-foreground">
      <motion.div
        animate={{ height: collapsed ? BANNER_COMPACT : BANNER_FULL }}
        transition={{ type: 'spring', bounce: 0.1, duration: 0.35 }}
        className="relative shrink-0 overflow-hidden rounded-b-2xl z-10"
      >
        <motion.div
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[5] bg-linear-to-t from-overlay/80 via-overlay/20 to-transparent pointer-events-none"
        />

        <motion.div
          animate={{ opacity: collapsed ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-10 flex items-end pb-4 px-4 pointer-events-none"
        >
          <span className="text-xl font-bold text-white capitalize drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)] truncate">
            {product.productName || 'Unknown Product'}
          </span>
        </motion.div>

        <ProductHero
          product={product}
          suitability={suitability}
          cartItem={cartItem}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          onBack={() => router.history.back()}
        />
      </motion.div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-4 pt-4 space-y-6 pb-20">
          <ProductServingNote serving={suitability?.serving} />

          {suitability && suitability.checks.length > 0 && (
            <section>
              <SectionHeader>Suitability</SectionHeader>
              <SuitabilityBreakdown checks={suitability.checks} />
            </section>
          )}

          <ProductScoreBadges
            nutriscoreGrade={product.nutriscoreGrade}
            ecoscoreGrade={product.ecoscoreGrade}
            novaGroup={product.novaGroup}
            labels={product.labels}
          />

          <section>
            <SectionHeader>Nutrition</SectionHeader>
            <ProductNutrientTable
              nutrients={product.nutrients}
              servingInfo={suitability?.serving ?? null}
              nutrientLevels={product.nutrientLevels}
            />
          </section>

          <ProductInfoSections
            categories={product.categories}
            allergens={product.allergens}
            allergenTraces={product.allergenTraces}
            ingredients={product.ingredients}
          />

          <ProductSuggestions barcode={product.barcode!} />

          <div className="flex justify-center pb-2">
            <p className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
              Barcode: {product.barcode}
            </p>
          </div>
        </div>
      </div>

      <BottomCta>
        <CartCta
          product={product}
          cartItem={cartItem}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          suitability={suitability}
        />
      </BottomCta>
    </div>
  )
}
