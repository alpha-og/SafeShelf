import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = 'safeshelf-theme-mode'

type ThemeMode = 'light' | 'dark' | 'system'
type Theme = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  theme: Theme
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined)

function getStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  } catch {
    return 'system'
  }
  return 'system'
}

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getStoredMode)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)

  const theme = useMemo<Theme>(() => {
    if (mode === 'system') return systemTheme
    return mode
  }, [mode, systemTheme])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // localStorage not available
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export { ThemeProvider, useTheme }
export type { ThemeMode }
