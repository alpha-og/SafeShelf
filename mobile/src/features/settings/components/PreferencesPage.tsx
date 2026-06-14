import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PREFERENCES_KEY = 'preferences:dietary'
const BUDGET_KEY = 'preferences:budget'

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

function load(): string[] {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function loadBudget(): string {
  return localStorage.getItem(BUDGET_KEY) ?? ''
}

export function PreferencesPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>(() => load())
  // Draft holds what's in the box; budget is the committed (saved) value.
  const [budget, setBudget] = useState<string>(() => loadBudget())
  const [budgetDraft, setBudgetDraft] = useState<string>(() => loadBudget())

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(selected))
  }, [selected])

  function saveBudget() {
    setBudget(budgetDraft)
    localStorage.setItem(BUDGET_KEY, budgetDraft)
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
          <div className="rounded-lg border border-border overflow-hidden">
            {DIETARY_OPTIONS.map((option) => {
              const checked = selected.includes(option.id)
              return (
                <button
                  key={option.id}
                  onClick={() => toggle(option.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <span className="flex-1 text-left">{option.label}</span>
                  {checked && <Check className="h-4 w-4 text-foreground shrink-0" />}
                </button>
              )
            })}
          </div>
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
              // Allow digits only — strip anything else as the user types/pastes.
              onChange={(e) => setBudgetDraft(e.target.value.replace(/\D/g, ''))}
            />
            <Button type="submit" disabled={budgetDraft === budget}>
              Enter
            </Button>
          </form>
        </section>
      </main>
    </div>
  )
}
