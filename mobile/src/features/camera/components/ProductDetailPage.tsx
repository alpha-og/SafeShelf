import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, ShoppingCart, Trash2, Minus, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { lookupByBarcode } from '@/features/camera/services/detection'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { SuitabilityBadge } from '@/features/suitability/components/SuitabilityBadge'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { NutrientTable } from '@/features/camera/components/NutrientTable'
import { AuroraBackground } from '@/components/reactbits/AuroraBackground'
import { useCart } from '@/providers/CartProvider'
import { CartCta } from '@/features/cart/components/CartCta'

const NUTRISCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  b: 'bg-lime-500 text-white border-lime-500 hover:bg-lime-500',
  c: 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-400',
  d: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  e: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
}

const ECOSCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  b: 'bg-lime-500 text-white border-lime-500 hover:bg-lime-500',
  c: 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-400',
  d: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  e: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
}

const NOVA_STYLES: Record<number, string> = {
  1: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  2: 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-500',
  3: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  4: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
}

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
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
        <div className="flex-1 flex flex-col">
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
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <p className="text-slate-400">Could not load product.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AuroraBackground className="flex flex-col flex-1 min-h-0 relative overflow-visible">
        <div className="absolute top-0 left-0 right-0 z-10 h-56">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.productName || 'Product'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <span className="text-white/40 text-sm font-medium">No Image</span>
            </div>
          )}

          <div className="absolute top-0 left-0 z-20 p-3">
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors border border-white/15"
              onClick={() => navigate({ to: '/' })}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {product.barcode && (
            <div className="absolute top-0 right-0 z-20 p-3">
              {cartItem ? (
                <div className="flex items-center gap-0.5 bg-white/10 backdrop-blur-md rounded-full px-1.5 py-1 border border-white/15">
                  <button
                    className="flex items-center justify-center w-7 h-7 rounded-full text-red-400 hover:bg-white/10 transition-colors"
                    onClick={() => removeFromCart(cartItem.product.barcode!)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="flex items-center justify-center w-7 h-7 rounded-full text-white hover:bg-white/10 transition-colors"
                    onClick={() => {
                      if (cartItem.quantity <= 1) {
                        removeFromCart(cartItem.product.barcode!)
                      } else {
                        updateQuantity(cartItem.product.barcode!, cartItem.quantity - 1)
                      }
                    }}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-white text-xs font-semibold tabular-nums min-w-5 text-center">
                    {cartItem.quantity}
                  </span>
                  <button
                    className="flex items-center justify-center w-7 h-7 rounded-full text-white hover:bg-white/10 transition-colors"
                    onClick={() => addToCart(product)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors border border-white/15"
                  onClick={() => addToCart(product)}
                >
                  <ShoppingCart className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">
                {product.productName || 'Unknown Product'}
              </h1>
              {product.brand && (
                <p className="text-white/70 text-base truncate">{product.brand}</p>
              )}
            </div>
            <div className="shrink-0">
              <SuitabilityBadge result={suitability} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 mt-60 space-y-6 relative z-20 no-scrollbar min-h-0">
          {suitability?.serving?.note && (
            <section className="bg-amber-500/20 text-amber-400 rounded-xl px-4 py-3">
              <p className="text-sm font-medium">{suitability.serving.note}</p>
            </section>
          )}

          {suitability && suitability.checks.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Suitability</h3>
              <SuitabilityBreakdown checks={suitability.checks} />
            </section>
          )}

          {(product.nutriscoreGrade || product.ecoscoreGrade || product.novaGroup !== null || product.labels.length > 0) && (
            <section className="flex flex-wrap items-center gap-2">
              {product.nutriscoreGrade && NUTRISCORE_STYLES[product.nutriscoreGrade] && (
                <Badge className={NUTRISCORE_STYLES[product.nutriscoreGrade]}>
                  Nutriscore {product.nutriscoreGrade.toUpperCase()}
                </Badge>
              )}
              {product.ecoscoreGrade && ECOSCORE_STYLES[product.ecoscoreGrade] && (
                <Badge className={ECOSCORE_STYLES[product.ecoscoreGrade]}>
                  Ecoscore {product.ecoscoreGrade.toUpperCase()}
                </Badge>
              )}
              {product.novaGroup !== null && product.novaGroup !== undefined && (
                <Badge className={NOVA_STYLES[product.novaGroup] ?? ''}>
                  NOVA {product.novaGroup}
                </Badge>
              )}
              {product.labels.map((label, i) => (
                <Badge key={i} variant="secondary">{label}</Badge>
              ))}
            </section>
          )}

          {product.categories.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((c, i) => (
                  <Badge key={i} variant="outline">{c}</Badge>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Nutrition</h3>
            <NutrientTable
              nutrients={product.nutrients}
              servingInfo={suitability?.serving ?? null}
              nutrientLevels={product.nutrientLevels}
            />
          </section>

          {product.allergens.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Allergens</h3>
              <div className="flex flex-wrap gap-2">
                {product.allergens.map((a, i) => (
                  <Badge key={i} variant="destructive">{a}</Badge>
                ))}
              </div>
            </section>
          )}

          {product.allergenTraces.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">May Contain Traces</h3>
              <div className="flex flex-wrap gap-2">
                {product.allergenTraces.map((t, i) => (
                  <Badge key={i} variant="secondary" className="bg-amber-500 text-white border-amber-500 hover:bg-amber-500">{t}</Badge>
                ))}
              </div>
            </section>
          )}

          {product.ingredients.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Ingredients ({product.ingredients.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.ingredients.map((ingredient, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-white/10 text-sm text-slate-300 border border-white/10">
                    {ingredient}
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-center pb-2">
            <p className="text-[10px] text-white/30 font-mono tracking-widest uppercase">
              Barcode: {product.barcode}
            </p>
          </div>
        </div>

        <div className="shrink-0 px-4 pt-8 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-linear-to-t from-slate-950 via-slate-950/90 to-transparent z-30">
          <CartCta
            product={product}
            cartItem={cartItem}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            updateQuantity={updateQuantity}
          />
        </div>
      </AuroraBackground>
    </div>
  )
}
