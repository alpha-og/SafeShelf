import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DietarySummaryButtonProps {
  selected: string[]
  onClick: () => void
}

/**
 * Summary row shown in the profile creation wizard — tapping it opens the
 * full-screen dietary picker (DietaryChoicesScreen) instead of listing every
 * option inline.
 */
export function DietarySummaryButton({ selected, onClick }: DietarySummaryButtonProps) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors hover:bg-accent"
      >
        <div className="flex-1 text-left">
          <div className="text-foreground">Dietary choices</div>
          <div className="text-xs text-muted-foreground">
            {selected.length > 0 ? `${selected.length} selected` : 'None selected'}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </button>
    </Card>
  )
}
