import { PackageX } from 'lucide-react'
import type { InventoryResponse } from '@/features/stores/services/storeInventoryApi'

interface SearchResultCardProps {
  item: InventoryResponse
  onClick: (barcode: string) => void
}

export function SearchResultCard({ item, onClick }: SearchResultCardProps) {
  return (
    <button
      onClick={() => onClick(item.barcode)}
      className="flex w-full items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 transition-all hover:bg-muted/50 active:scale-[0.98] text-left"
    >
      <div className="relative w-16 h-16 shrink-0 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border/50">
        {item.product_image ? (
          <img
            src={item.product_image}
            alt={item.product_name || 'Product'}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.currentTarget
              target.style.display = 'none'
              target.parentElement?.classList.add('fallback-active')
            }}
          />
        ) : null}
        
        {(!item.product_image) && (
          <PackageX className="w-6 h-6 text-muted-foreground/50 absolute inset-0 m-auto" />
        )}
      </div>

      <div className="flex-1 min-w-0 py-1">
        <h3 className="font-semibold text-foreground line-clamp-2 leading-tight">
          {item.product_name || 'Unknown Product'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 truncate">Barcode: {item.barcode}</p>
      </div>

      <div className="flex flex-col items-end shrink-0 py-1">
        <div className="font-bold text-lg text-primary">
          ₹{(item.price || 0).toFixed(2)}
        </div>
        {item.in_stock ? (
          <div className="text-xs font-medium text-emerald-500 mt-1">In Stock ({item.quantity})</div>
        ) : (
          <div className="text-xs font-medium text-destructive mt-1">Out of Stock</div>
        )}
      </div>
    </button>
  )
}
