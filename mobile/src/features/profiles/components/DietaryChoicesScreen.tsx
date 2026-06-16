import { PageHeader } from '@/components/PageHeader'
import { DietaryToggleList } from './DietaryToggleList'

interface DietaryChoicesScreenProps {
  selected: string[]
  onChange: (value: string[]) => void
  onBack: () => void
}

/**
 * Full-screen dietary picker — reached from DietarySummaryButton in the
 * profile creation wizard, instead of showing the whole grid inline.
 */
export function DietaryChoicesScreen({ selected, onChange, onBack }: DietaryChoicesScreenProps) {
  return (
    <div className="flex-1 min-h-0 bg-background flex flex-col overflow-hidden">
      <PageHeader title="Dietary Choices" onBack={onBack} />
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 min-h-0 overflow-y-auto">
        <DietaryToggleList selected={selected} onChange={onChange} />
      </main>
    </div>
  )
}
