import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ThemeMode } from '@/providers/ThemeProvider'
import { useTheme } from '@/providers/ThemeProvider'

const ORDER: ThemeMode[] = ['system', 'light', 'dark']
const ICONS: Record<ThemeMode, typeof Sun> = { system: Monitor, light: Sun, dark: Moon }
const LABELS: Record<ThemeMode, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
}

/** Single icon button that cycles through system → light → dark on tap. */
export function ThemeToggle() {
  const { mode, setMode } = useTheme()
  const Icon = ICONS[mode]

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
    setMode(next)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={`${LABELS[mode]} — tap to change`}
      onClick={cycle}
      className="bg-primary/10 backdrop-blur-md border-primary/20 hover:bg-primary/20 hover:scale-[1.02]"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
