import { ArrowLeft, History } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'

export function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <History className="h-5 w-5 text-foreground" />
          <h1 className="text-xl font-bold text-foreground">History</h1>
        </div>
      </header>

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
