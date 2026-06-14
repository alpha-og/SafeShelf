import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { SearchableMultiSelect } from './SearchableMultiSelect'
import type { ConstraintItem } from '../services/constraints'

const CONDITIONS_KEY = 'constraints:conditions'
const ALLERGENS_KEY = 'constraints:allergens'

function load(key: string): ConstraintItem[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as ConstraintItem[]) : []
  } catch {
    return []
  }
}

export function ConstraintsPage() {
  const navigate = useNavigate()
  const [conditions, setConditions] = useState<ConstraintItem[]>(() => load(CONDITIONS_KEY))
  const [allergens, setAllergens] = useState<ConstraintItem[]>(() => load(ALLERGENS_KEY))

  useEffect(() => {
    localStorage.setItem(CONDITIONS_KEY, JSON.stringify(conditions))
  }, [conditions])

  useEffect(() => {
    localStorage.setItem(ALLERGENS_KEY, JSON.stringify(allergens))
  }, [allergens])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/settings' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Constraints</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        <section>
          <SearchableMultiSelect
            label="Medical Conditions"
            kind="condition"
            placeholder="Search conditions…"
            selected={conditions}
            onChange={setConditions}
          />
        </section>

        <section>
          <SearchableMultiSelect
            label="Allergens"
            kind="allergen"
            placeholder="Search allergens…"
            selected={allergens}
            onChange={setAllergens}
          />
        </section>
      </main>
    </div>
  )
}
