import { useNavigate } from '@tanstack/react-router'
import { History } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'

export function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col">
      <PageHeader title="History" icon={History} onBack={() => navigate({ to: '/' })} />

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
