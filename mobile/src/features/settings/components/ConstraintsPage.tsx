import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { SearchableMultiSelect } from './SearchableMultiSelect'
import { getItem, setItem } from '@/lib/storage'
import type { ConstraintItem } from '../services/constraints'

const CONDITIONS_KEY = 'constraints:conditions'
const ALLERGENS_KEY = 'constraints:allergens'

export function ConstraintsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [conditions, setConditions] = useState<ConstraintItem[]>([])
  const [allergens, setAllergens] = useState<ConstraintItem[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      getItem<ConstraintItem[]>(CONDITIONS_KEY),
      getItem<ConstraintItem[]>(ALLERGENS_KEY),
    ]).then(([c, a]) => {
      if (c) setConditions(c)
      if (a) setAllergens(a)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    setItem(CONDITIONS_KEY, conditions)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }, [conditions, queryClient, loaded])

  useEffect(() => {
    if (!loaded) return
    setItem(ALLERGENS_KEY, allergens)
    queryClient.invalidateQueries({ queryKey: ['userProfile'] })
  }, [allergens, queryClient, loaded])

  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <header className="border-b border-border shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/settings' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Constraints</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8 flex-1 min-h-0 overflow-y-auto">
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
