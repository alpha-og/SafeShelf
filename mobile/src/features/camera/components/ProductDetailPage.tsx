import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { lookupByBarcode } from '@/features/camera/services/detection'
import { useSuitability } from '@/features/suitability/hooks/useSuitability'
import { SuitabilityBadge } from '@/features/suitability/components/SuitabilityBadge'
import { SuitabilityBreakdown } from '@/features/suitability/components/SuitabilityBreakdown'
import { NutrientTable } from '@/features/camera/components/NutrientTable'

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

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', barcode],
    queryFn: () => lookupByBarcode(barcode),
    enabled: !!barcode,
  })

  const { result: suitability } = useSuitability(product ?? null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Product</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-4 animate-pulse">
          <div className="h-48 bg-foreground/10 rounded-2xl" />
          <div className="h-6 bg-foreground/10 rounded w-2/3" />
          <div className="h-4 bg-foreground/10 rounded w-1/3" />
          <div className="h-32 bg-foreground/10 rounded-xl" />
        </main>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">Product</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Could not load product.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Product</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <section className="flex gap-5">
          {product.imageUrl ? (
            <div className="w-28 h-28 rounded-2xl overflow-hidden bg-muted flex-shrink-0 border shadow-sm">
              <img src={product.imageUrl} alt={product.productName || 'Product'} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 border">
              <span className="text-muted-foreground text-xs font-medium">No Image</span>
            </div>
          )}
          <div className="flex-1 pt-1">
            <div className="flex items-start gap-3 flex-wrap">
              <h2 className="text-2xl font-bold leading-tight text-foreground">{product.productName || 'Unknown Product'}</h2>
              <SuitabilityBadge result={suitability} />
            </div>
            {product.brand && <p className="text-muted-foreground text-sm mt-1.5">{product.brand}</p>}
            <p className="text-xs text-muted-foreground/50 mt-2 font-mono">{product.barcode}</p>
            {(product.quantity || product.servingSize) && (
              <p className="text-xs text-muted-foreground mt-1">
                {product.quantity && <span>{product.quantity}</span>}
                {product.quantity && product.servingSize && <span> · </span>}
                {product.servingSize && <span>Serving: {product.servingSize}</span>}
              </p>
            )}
          </div>
        </section>

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
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {product.categories.map((c, i) => (
                <Badge key={i} variant="outline">{c}</Badge>
              ))}
            </div>
          </section>
        )}

        <section>
          <NutrientTable
            nutrients={product.nutrients}
            servingInfo={suitability?.serving ?? null}
            nutrientLevels={product.nutrientLevels}
          />
        </section>

        {product.allergens.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Allergens</h3>
            <div className="flex flex-wrap gap-2">
              {product.allergens.map((a, i) => (
                <Badge key={i} variant="destructive">{a}</Badge>
              ))}
            </div>
          </section>
        )}

        {product.allergenTraces.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">May Contain Traces</h3>
            <div className="flex flex-wrap gap-2">
              {product.allergenTraces.map((t, i) => (
                <Badge key={i} variant="secondary" className="bg-amber-500 text-white border-amber-500 hover:bg-amber-500">{t}</Badge>
              ))}
            </div>
          </section>
        )}

        {suitability?.serving?.note && (
          <section className="bg-amber-500 text-white rounded-xl px-4 py-3">
            <p className="text-sm font-medium">{suitability.serving.note}</p>
          </section>
        )}

        {suitability && suitability.checks.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Suitability Check</h3>
            <SuitabilityBreakdown checks={suitability.checks} />
          </section>
        )}

        {product.ingredients.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ingredients</h3>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted p-4 rounded-2xl border">
              {product.ingredients.join(', ')}
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
