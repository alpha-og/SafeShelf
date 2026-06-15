import { Badge } from '@/components/ui/badge'

const NUTRISCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600/15 text-green-600 border-green-600/30 hover:scale-105',
  b: 'bg-lime-500/15 text-lime-600 border-lime-500/30 hover:scale-105',
  c: 'bg-yellow-400/15 text-yellow-600 border-yellow-400/30 hover:scale-105',
  d: 'bg-orange-500/15 text-orange-600 border-orange-500/30 hover:scale-105',
  e: 'bg-red-600/15 text-red-600 border-red-600/30 hover:scale-105',
}

const ECOSCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600/15 text-green-600 border-green-600/30 hover:scale-105',
  b: 'bg-lime-500/15 text-lime-600 border-lime-500/30 hover:scale-105',
  c: 'bg-yellow-400/15 text-yellow-600 border-yellow-400/30 hover:scale-105',
  d: 'bg-orange-500/15 text-orange-600 border-orange-500/30 hover:scale-105',
  e: 'bg-red-600/15 text-red-600 border-red-600/30 hover:scale-105',
}

const NOVA_STYLES: Record<number, string> = {
  1: 'bg-green-600/15 text-green-600 border-green-600/30 hover:scale-105',
  2: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:scale-105',
  3: 'bg-orange-500/15 text-orange-600 border-orange-500/30 hover:scale-105',
  4: 'bg-red-600/15 text-red-600 border-red-600/30 hover:scale-105',
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
        <Badge key={i} variant="outline" className="bg-muted/30 text-muted-foreground border-border hover:scale-105">{label}</Badge>
      ))}
    </section>
  )
}
