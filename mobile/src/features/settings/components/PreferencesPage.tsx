import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { setItem } from '@/lib/storage'
import type { ServingSettings } from '@/features/suitability/types'
import { DEFAULT_SERVING_SETTINGS } from '@/features/suitability/types'

const PREFERENCES_KEY = 'preferences:dietary'
const BUDGET_KEY = 'preferences:budget'
const SERVING_SETTINGS_KEY = 'preferences:serving_settings'

const DIETARY_OPTIONS = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'gluten-free', label: 'Gluten-free' },
  { id: 'dairy-free', label: 'Dairy-free' },
  { id: 'low-sugar', label: 'Low sugar' },
  { id: 'low-sodium', label: 'Low sodium' },
] as const

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function PreferencesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>(() => load(PREFERENCES_KEY, []))
  const [budget, setBudget] = useState<string>(() => load(BUDGET_KEY, ''))
  const [budgetDraft, setBudgetDraft] = useState<string>(() => load(BUDGET_KEY, ''))
  const [servingSettings, setServingSettings] = useState<ServingSettings>(() => load(SERVING_SETTINGS_KEY, DEFAULT_SERVING_SETTINGS))
  const [solidDraft, setSolidDraft] = useState<string>(String(load(SERVING_SETTINGS_KEY, DEFAULT_SERVING_SETTINGS).minSolidG))
  const [liquidDraft, setLiquidDraft] = useState<string>(String(load(SERVING_SETTINGS_KEY, DEFAULT_SERVING_SETTINGS).minLiquidMl))

  useEffect(() => {
    setItem(PREFERENCES_KEY, selected)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }, [selected, queryClient])

  function saveBudget() {
    setBudget(budgetDraft)
    setItem(BUDGET_KEY, budgetDraft)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }

  function saveServing() {
    const updated: ServingSettings = {
      minSolidG: Math.max(1, parseInt(solidDraft, 10) || DEFAULT_SERVING_SETTINGS.minSolidG),
      minLiquidMl: Math.max(1, parseInt(liquidDraft, 10) || DEFAULT_SERVING_SETTINGS.minLiquidMl),
    }
    setServingSettings(updated)
    setItem(SERVING_SETTINGS_KEY, updated)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/settings' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Preferences</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <section>
          <label className="text-sm font-medium text-foreground mb-2 block">Dietary choices</label>
          <Card className="overflow-hidden">
            {DIETARY_OPTIONS.map((option) => {
              const checked = selected.includes(option.id)
              return (
                <button
                  key={option.id}
                  onClick={() => toggle(option.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent border-b border-border last:border-b-0"
                >
                  <span className="flex-1 text-left">{option.label}</span>
                  {checked && <Check className="h-4 w-4 text-foreground shrink-0" />}
                </button>
              )
            })}
          </Card>
        </section>

        <section>
          <label htmlFor="budget" className="text-sm font-medium text-foreground mb-2 block">
            Budget
          </label>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              saveBudget()
            }}
          >
            <Input
              id="budget"
              type="text"
              inputMode="numeric"
              value={budgetDraft}
              placeholder="e.g. 100"
              onChange={(e) => setBudgetDraft(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" disabled={budgetDraft === budget}>
              Enter
            </Button>
          </form>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground mb-2">Serving size thresholds</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Products with declared serving sizes below these values will be flagged as potentially misleading.
          </p>
          <Card className="p-4 space-y-4">
            <div>
              <label htmlFor="min-solid" className="text-xs font-medium text-foreground block mb-1.5">
                Min solid serving (g)
              </label>
              <Input
                id="min-solid"
                type="text"
                inputMode="numeric"
                value={solidDraft}
                placeholder={String(DEFAULT_SERVING_SETTINGS.minSolidG)}
                onChange={(e) => setSolidDraft(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label htmlFor="min-liquid" className="text-xs font-medium text-foreground block mb-1.5">
                Min liquid serving (ml)
              </label>
              <Input
                id="min-liquid"
                type="text"
                inputMode="numeric"
                value={liquidDraft}
                placeholder={String(DEFAULT_SERVING_SETTINGS.minLiquidMl)}
                onChange={(e) => setLiquidDraft(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button
              onClick={saveServing}
              disabled={solidDraft === String(servingSettings.minSolidG) && liquidDraft === String(servingSettings.minLiquidMl)}
              size="sm"
            >
              Save
            </Button>
          </Card>
        </section>
      </main>
    </div>
  )
}
