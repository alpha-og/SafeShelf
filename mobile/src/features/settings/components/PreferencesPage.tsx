import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CardList } from '@/components/CardList'
import { PageHeader } from '@/components/PageHeader'
import { SectionHeader } from '@/components/SectionHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { ServingSettings } from '@/features/suitability/types'
import { DEFAULT_SERVING_SETTINGS } from '@/features/suitability/types'
import { getItem, setItem } from '@/lib/storage'

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

export function PreferencesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>([])
  const [budget, setBudget] = useState<string>('')
  const [budgetDraft, setBudgetDraft] = useState<string>('')
  const [servingSettings, setServingSettings] = useState<ServingSettings>(DEFAULT_SERVING_SETTINGS)
  const [solidDraft, setSolidDraft] = useState<string>(String(DEFAULT_SERVING_SETTINGS.minSolidG))
  const [liquidDraft, setLiquidDraft] = useState<string>(
    String(DEFAULT_SERVING_SETTINGS.minLiquidMl),
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      getItem<string[]>(PREFERENCES_KEY),
      getItem<string>(BUDGET_KEY),
      getItem<ServingSettings>(SERVING_SETTINGS_KEY),
    ]).then(([dietary, bgt, svc]) => {
      if (dietary) setSelected(dietary)
      if (bgt) {
        setBudget(bgt)
        setBudgetDraft(bgt)
      }
      if (svc) {
        setServingSettings(svc)
        setSolidDraft(String(svc.minSolidG))
        setLiquidDraft(String(svc.minLiquidMl))
      }
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    setItem(PREFERENCES_KEY, selected)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }, [selected, queryClient, loaded])

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
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader title="Preferences" onBack={() => navigate({ to: '/settings' })} />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
        <section>
          <SectionHeader variant="default">Dietary choices</SectionHeader>
          <CardList
            items={DIETARY_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
            selectedIds={new Set(selected)}
            onToggle={toggle}
          />
        </section>

        <section>
          <SectionHeader variant="default">Budget</SectionHeader>
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
            <Button type="submit" className="hover:scale-[1.02]" disabled={budgetDraft === budget}>
              Enter
            </Button>
          </form>
        </section>

        <section>
          <SectionHeader variant="default">Serving size thresholds</SectionHeader>
          <p className="text-xs text-muted-foreground mb-4">
            Products with declared serving sizes below these values will be flagged as potentially
            misleading.
          </p>
          <Card className="p-4 space-y-4">
            <div>
              <label
                htmlFor="min-solid"
                className="text-xs font-medium text-foreground block mb-1.5"
              >
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
              <label
                htmlFor="min-liquid"
                className="text-xs font-medium text-foreground block mb-1.5"
              >
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
              disabled={
                solidDraft === String(servingSettings.minSolidG) &&
                liquidDraft === String(servingSettings.minLiquidMl)
              }
              size="sm"
              className="hover:scale-[1.02]"
            >
              Save
            </Button>
          </Card>
        </section>
      </main>
    </div>
  )
}
