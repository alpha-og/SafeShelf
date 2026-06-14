import { Badge } from '@/components/ui/badge'

const NUTRISCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  b: 'bg-lime-500 text-white border-lime-500 hover:bg-lime-500',
  c: 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-400',
  d: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  e: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
}

const ECOSCORE_STYLES: Record<string, string> = {
  a: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  b: 'bg-lime-500 text-white border-lime-500 hover:bg-lime-500',
  c: 'bg-yellow-400 text-black border-yellow-400 hover:bg-yellow-400',
  d: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  e: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
}

const NOVA_STYLES: Record<number, string> = {
  1: 'bg-green-600 text-white border-green-600 hover:bg-green-600',
  2: 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-500',
  3: 'bg-orange-500 text-white border-orange-500 hover:bg-orange-500',
  4: 'bg-red-600 text-white border-red-600 hover:bg-red-600',
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
        <Badge className={NUTRISCORE_STYLES[nutriscoreGrade]}>
          Nutriscore {nutriscoreGrade.toUpperCase()}
        </Badge>
      )}
      {ecoscoreGrade && ECOSCORE_STYLES[ecoscoreGrade] && (
        <Badge className={ECOSCORE_STYLES[ecoscoreGrade]}>
          Ecoscore {ecoscoreGrade.toUpperCase()}
        </Badge>
      )}
      {novaGroup != null && (
        <Badge className={NOVA_STYLES[novaGroup] ?? ''}>
          NOVA {novaGroup}
        </Badge>
      )}
      {labels.map((label, i) => (
        <Badge key={i} variant="secondary">{label}</Badge>
      ))}
    </section>
  )
}
