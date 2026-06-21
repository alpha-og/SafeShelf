import { AlertCircle, ImageOff } from 'lucide-react'
import { useState } from 'react'

interface ProductMiniCardProps {
  productName: string
  productImage: string | null
  price: number
  onClick?: () => void
  badge?: 'conflict' | null
}

export function ProductMiniCard({
  productName,
  productImage,
  price,
  onClick,
  badge,
}: ProductMiniCardProps) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const titleCased = productName.replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <div
      onClick={onClick}
      className="w-28 shrink-0 rounded-2xl border bg-card active:scale-[0.98] transition-transform cursor-pointer overflow-hidden hover:scale-[1.02]"
    >
      <div className="aspect-square bg-muted relative overflow-hidden rounded-[inherit]">
        <ImageOff className="absolute inset-0 m-auto w-5 h-5 text-muted-foreground/30" />
        {productImage && !imgError && (
          <img
            src={productImage}
            alt={productName}
            referrerPolicy="no-referrer"
            className={`absolute inset-0 w-full h-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
        {badge === 'conflict' && (
          <div
            className="absolute top-1 right-1 z-10 rounded-full bg-destructive/90 p-1 shadow-md"
            title="May conflict with dietary preferences"
          >
            <AlertCircle className="h-3 w-3 text-white" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-6 px-1.5 pb-1.5 space-y-0.5">
          <p className="text-[11px] text-white leading-tight line-clamp-2">{titleCased}</p>
          <p className="text-[11px] font-semibold text-white tabular-nums">${price.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}
