import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from '@tanstack/react-router'
import { BottomCta } from '@/components/BottomCta'
import { SectionHeader } from '@/components/SectionHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { CartCta } from '@/features/cart/components/CartCta'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { useCart } from '@/providers/CartProvider'
import { useStore } from '@/providers/StoreProvider'
import { lookupByBarcode } from '../services/product'
import { ProductHero } from './ProductHero'
import { ProductInfoSections } from './ProductInfoSections'
import { ProductNutrientTable } from './ProductNutrientTable'
import { ProductScoreBadges } from './ProductScoreBadges'
import { ProductServingNote } from './ProductServingNote'

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
      <ProductHero
        product={product}
        suitability={suitability}
        cartItem={cartItem}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
        onBack={() => router.history.back()}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 space-y-6 pb-20">
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

        <div className="flex justify-center pb-2">
          <p className="text-[10px] text-muted-foreground/60 font-mono tracking-widest uppercase">
            Barcode: {product.barcode}
          </p>
        </div>
      </div>

      <BottomCta>
        <CartCta
          product={product}
          cartItem={cartItem}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
        />
      </BottomCta>
    </div>
  )
}
