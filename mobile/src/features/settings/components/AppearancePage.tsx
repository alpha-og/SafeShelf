import { ArrowLeft, Sun, Moon, Monitor, Check } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/providers/ThemeProvider'
import type { ThemeMode } from '@/providers/ThemeProvider'

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

export function AppearancePage() {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()

  const current = options.find((o) => o.value === mode)!
  const CurrentIcon = current.icon

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/settings' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Appearance</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <label className="text-sm font-medium text-foreground mb-2 block">
          Theme
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full flex items-center gap-3 px-4 py-3.5 h-auto">
              <CurrentIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-foreground">{current.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {options.map((option) => {
              const Icon = option.icon
              const selected = mode === option.value
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setMode(option.value)}
                  className="flex items-center gap-3 py-2.5"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="flex-1">{option.label}</span>
                  {selected && <Check className="h-4 w-4 text-foreground shrink-0" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </main>
    </div>
  )
}
