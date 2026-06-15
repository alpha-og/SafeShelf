import { ArrowLeft, Sun, Settings2, Info } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

const settingsItems = [
  { to: '/settings/appearance' as const, label: 'Appearance', icon: Sun },
  { to: '/settings/preferences' as const, label: 'Preferences', icon: Settings2 },
  { to: '/settings/constraints' as const, label: 'Constraints', icon: Info },
]

export function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 min-h-0 bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="rounded-lg border border-border overflow-hidden">
          {settingsItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.to}
                onClick={() => navigate({ to: item.to })}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Icon className="h-5 w-5 text-muted-foreground" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
