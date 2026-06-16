import { Badge } from '@/components/ui/badge'

const NUTRISCORE_STYLES: Record<string, string> = {
  a: 'bg-score-a/15 text-score-a border-score-a/30 hover:scale-105',
  b: 'bg-score-b/15 text-score-b border-score-b/30 hover:scale-105',
  c: 'bg-score-c/15 text-score-c border-score-c/30 hover:scale-105',
  d: 'bg-score-d/15 text-score-d border-score-d/30 hover:scale-105',
  e: 'bg-score-e/15 text-score-e border-score-e/30 hover:scale-105',
}

const ECOSCORE_STYLES: Record<string, string> = {
  a: 'bg-score-a/15 text-score-a border-score-a/30 hover:scale-105',
  b: 'bg-score-b/15 text-score-b border-score-b/30 hover:scale-105',
  c: 'bg-score-c/15 text-score-c border-score-c/30 hover:scale-105',
  d: 'bg-score-d/15 text-score-d border-score-d/30 hover:scale-105',
  e: 'bg-score-e/15 text-score-e border-score-e/30 hover:scale-105',
}

const NOVA_STYLES: Record<number, string> = {
  1: 'bg-score-a/15 text-score-a border-score-a/30 hover:scale-105',
  2: 'bg-score-c/15 text-score-c border-score-c/30 hover:scale-105',
  3: 'bg-score-d/15 text-score-d border-score-d/30 hover:scale-105',
  4: 'bg-score-e/15 text-score-e border-score-e/30 hover:scale-105',
}

interface ProductScoreBadgesProps {
  nutriscoreGrade?: string | null
  ecoscoreGrade?: string | null
  novaGroup?: number | null
  labels?: string[]
}

export function ProductScoreBadges({
  nutriscoreGrade,
  ecoscoreGrade,
  novaGroup,
  labels = [],
}: ProductScoreBadgesProps) {
  const hasAny = nutriscoreGrade || ecoscoreGrade || novaGroup != null || labels.length > 0
  if (!hasAny) return null

  return (
    <section className="flex flex-wrap items-center gap-2">
      {nutriscoreGrade && NUTRISCORE_STYLES[nutriscoreGrade] && (
        <Badge variant="outline" className={NUTRISCORE_STYLES[nutriscoreGrade]}>
          Nutriscore {nutriscoreGrade.toUpperCase()}
        </Badge>
      )}
      {ecoscoreGrade && ECOSCORE_STYLES[ecoscoreGrade] && (
        <Badge variant="outline" className={ECOSCORE_STYLES[ecoscoreGrade]}>
          Ecoscore {ecoscoreGrade.toUpperCase()}
        </Badge>
      )}
      {novaGroup != null && (
        <Badge variant="outline" className={NOVA_STYLES[novaGroup] ?? ''}>
          NOVA {novaGroup}
        </Badge>
      )}
      {labels.map((label, i) => (
        <Badge
          key={i}
          variant="outline"
          className="bg-muted/30 text-muted-foreground border-border hover:scale-105"
        >
          {label}
        </Badge>
      ))}
    </section>
  )
}
