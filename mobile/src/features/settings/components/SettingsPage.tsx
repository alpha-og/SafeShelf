import { useNavigate } from '@tanstack/react-router'
import { Info, Settings2, Sun } from 'lucide-react'
import { CardList } from '@/components/CardList'
import { PageHeader } from '@/components/PageHeader'

const settingsItems = [
  { to: '/settings/appearance' as const, label: 'Appearance', icon: Sun },
  { to: '/settings/preferences' as const, label: 'Preferences', icon: Settings2 },
  { to: '/settings/constraints' as const, label: 'Constraints', icon: Info },
]

export function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="flex-1 min-h-0 bg-background">
      <PageHeader title="Settings" onBack={() => navigate({ to: '/' })} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <CardList
          items={settingsItems.map((item) => ({ id: item.to, label: item.label, icon: item.icon }))}
          onToggle={(id) =>
            navigate({
              to: id as
                | '/'
                | '/settings/appearance'
                | '/settings/preferences'
                | '/settings/constraints',
            })
          }
        />
      </main>
    </div>
  )
}
