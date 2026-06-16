import { Badge } from '@/components/ui/badge'

interface BadgeListSectionProps {
  heading: string
  items: string[]
  className?: string
}

export function BadgeListSection({ heading, items, className }: BadgeListSectionProps) {
  if (items.length === 0) return null

  return (
    <section>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{heading}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className={className}>{item}</Badge>
        ))}
      </div>
    </section>
  )
}
