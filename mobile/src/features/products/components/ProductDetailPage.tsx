import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { lookupByBarcode } from '../services/product'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { ProductNutrientTable } from './ProductNutrientTable'
import { AuroraBackground } from '@/components/reactbits/AuroraBackground'
import { useCart } from '@/providers/CartProvider'
import { CartCta } from '@/features/cart/components/CartCta'
import { ProductHero } from './ProductHero'
import { ProductScoreBadges } from './ProductScoreBadges'
import { ProductServingNote } from './ProductServingNote'
import { ProductInfoSections } from './ProductInfoSections'

export function ProductDetailPage() {
  const { barcode } = useParams({ from: '/_authenticated/product/$barcode' })
  const navigate = useNavigate()
  const { items, addToCart, removeFromCart, updateQuantity } = useCart()

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', barcode],
    queryFn: () => lookupByBarcode(barcode),
    enabled: !!barcode,
  })

  const { result: suitability } = useSuitability(product ?? null)
 const cartItem = product?.barcode ? items.find((i) => i.product.barcode === product.barcode) : undefined

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-slate-950 text-slate-50">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 relative w-full h-56 bg-white/5 animate-pulse" />
          <div className="flex-1 px-4 pt-6 space-y-4">
            <div className="h-8 bg-white/5 rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
            <div className="h-32 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-slate-950 text-slate-50">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-slate-400">Could not load product.</p>
        </div>
      </div>
    )
  }

return (
  <AuroraBackground className="h-full">
    <ProductHero
      product={product}
      suitability={suitability}
      cartItem={cartItem}
      addToCart={addToCart}
      removeFromCart={removeFromCart}
      updateQuantity={updateQuantity}
      onBack={() => navigate({ to: '/' })}
    />

    <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 space-y-6 z-20 pb-20">
      <ProductServingNote serving={suitability?.serving} />

      {suitability && suitability.checks.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suitability</h3>
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
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Nutrition</h3>
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
        <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
          Barcode: {product.barcode}
        </p>
      </div>
    </div>

    <div className="absolute bottom-0 w-full shrink-0 px-4 pt-8 pb-4 bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent z-30">
      <CartCta
        product={product}
        cartItem={cartItem}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        updateQuantity={updateQuantity}
      />
    </div>
  </AuroraBackground>
)
}
