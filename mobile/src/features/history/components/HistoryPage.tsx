import { ArrowLeft, History } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

export function HistoryPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => navigate({ to: '/' })} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <History className="h-5 w-5" />
          <h1 className="text-xl font-bold">History</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">No scans yet.</p>
      </main>
    </div>
  )
}
