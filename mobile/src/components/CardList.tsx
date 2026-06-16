import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface CardListItem {
  id: string
  label: string
  icon?: LucideIcon
}

interface CardListProps {
  items: CardListItem[]
  selectedIds?: Set<string>
  onToggle?: (id: string) => void
}

export function CardList({ items, selectedIds, onToggle }: CardListProps) {
  return (
    <Card className="overflow-hidden">
      {items.map((item) => {
        const Icon = item.icon
        const checked = selectedIds?.has(item.id)
        return (
          <button
            key={item.id}
            onClick={() => onToggle?.(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground transition-colors bg-primary/[0.07] hover:bg-primary/[0.12] hover:scale-[1.02] border-b border-border last:border-b-0"
          >
            {Icon && <Icon className="h-5 w-5 text-muted-foreground shrink-0" />}
            <span className="flex-1 text-left">{item.label}</span>
            {checked && <Check className="h-4 w-4 text-foreground shrink-0" />}
          </button>
        )
      })}
    </Card>
  )
}
