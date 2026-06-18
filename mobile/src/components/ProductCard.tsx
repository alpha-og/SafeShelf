import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import type React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import type { ProductInfo } from '@/features/products/services/product'

interface ProductCardProps {
  product: ProductInfo
  action?: React.ReactNode
}

export function ProductCard({ product, action }: ProductCardProps) {
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  return (
    <Card className="overflow-hidden mb-4 shadow-sm">
      <CardContent className="p-4 flex gap-4">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0 border relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-5 h-5 text-muted-foreground/40" />
          </div>
          {product.imageUrl && !imageError && (
            <img
              src={product.imageUrl}
              alt={product.productName || 'Product'}
              className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}
        </div>

        <div className="flex-1 flex flex-col pt-1">
          <h3 className="font-semibold leading-tight line-clamp-2">
            {product.productName || 'Unknown Product'}
          </h3>
          {product.brand && <p className="text-muted-foreground text-sm mt-1">{product.brand}</p>}
          {product.barcode && (
            <p className="text-xs text-muted-foreground mt-auto pt-2 font-mono">
              {product.barcode}
            </p>
          )}
        </div>

        {action && <div className="flex flex-col justify-center border-l pl-4 ml-2">{action}</div>}
      </CardContent>
    </Card>
  )
}
