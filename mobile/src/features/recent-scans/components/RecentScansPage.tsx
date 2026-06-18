import { useNavigate } from '@tanstack/react-router'
import { History, PackageX, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { StatusDot } from '@/components/StatusDot'
import { Card, CardContent } from '@/components/ui/card'
import { useProductSuitability } from '@/features/suitability/hooks/useProductSuitability'
import {
  clearScanHistory,
  getScanHistory,
  type ScanRecord,
} from '@/features/products/services/scanHistory'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function RecentScanCard({ record }: { record: ScanRecord }) {
  const navigate = useNavigate()
  const [imageError, setImageError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const { result } = useProductSuitability(record.barcode, true)

  return (
    <Card
      className="overflow-hidden active:scale-[0.98] transition-transform"
      onClick={() =>
        navigate({ to: '/product/$barcode', params: { barcode: record.barcode } })
      }
    >
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-20 h-20 shrink-0 bg-muted rounded-l-xl overflow-hidden border-r border-border/50 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <PackageX className="w-5 h-5 text-muted-foreground/50" />
            </div>
            {record.imageUrl && !imageError && (
              <img
                src={record.imageUrl}
                alt={record.productName || 'Product'}
                className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setLoaded(true)}
                onError={() => setImageError(true)}
              />
            )}
          </div>

          <div className="flex-1 p-3 flex flex-col gap-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight line-clamp-1 text-sm">
                {record.productName || 'Unknown Product'}
              </h3>
              {result && (
                <StatusDot status={result.overall} className="w-3 h-3 shrink-0 mt-1" />
              )}
            </div>
            {record.brand && (
              <p className="text-xs text-muted-foreground truncate">{record.brand}</p>
            )}
            <p className="text-xs text-muted-foreground/60">{timeAgo(record.scannedAt)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RecentScansPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<ScanRecord[]>([])

  useEffect(() => {
    getScanHistory().then(setRecords)
  }, [])

  const handleClear = async () => {
    await clearScanHistory()
    setRecords([])
  }

  if (records.length === 0) {
    return (
      <div className="flex-1 min-h-0 bg-background flex flex-col">
        <PageHeader title="Recent Scans" icon={History} onBack={() => navigate({ to: '/' })} />
        <main className="flex-1 flex">
          <EmptyState
            icon={History}
            title="No scans yet"
            description="Your product scan history will show up here."
            actionLabel="Start Scanning"
            onAction={() => navigate({ to: '/' })}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col">
      <PageHeader
        title="Recent Scans"
        icon={History}
        onBack={() => navigate({ to: '/' })}
        actions={
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-3">
          {records.map((record) => (
            <RecentScanCard key={record.barcode} record={record} />
          ))}
        </div>
      </main>
    </div>
  )
}
