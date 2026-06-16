import { cn } from '@/lib/utils'
import { DIETARY_OPTIONS } from '../constants'

interface DietaryToggleListProps {
  selected: string[]
  onChange: (value: string[]) => void
}

/**
 * The dietary chip grid, shared by the full-screen picker (creation wizard)
 * and the inline section on the Edit Profile page. Reuses the pill/chip
 * styling already established for selected-tag chips in SearchableMultiSelect.
 */
export function DietaryToggleList({ selected, onChange }: DietaryToggleListProps) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((p) => p !== id) : [...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DIETARY_OPTIONS.map((option) => {
        const checked = selected.includes(option.id)
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              checked
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
