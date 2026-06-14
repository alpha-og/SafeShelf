import type { ServingInfo } from '@/features/suitability/types'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface NutrientDefinition {
  label: string
  key: string
  unit: string
}

const DISPLAY_NUTRIENTS: NutrientDefinition[] = [
  { label: 'Energy', unit: 'kcal', key: 'energy-kcal' },
  { label: 'Fat', unit: 'g', key: 'fat' },
  { label: 'Saturated Fat', unit: 'g', key: 'saturated-fat' },
  { label: 'Trans Fat', unit: 'mg', key: 'trans-fat' },
  { label: 'Cholesterol', unit: 'mg', key: 'cholesterol' },
  { label: 'Carbohydrates', unit: 'g', key: 'carbohydrates' },
  { label: 'Fiber', unit: 'g', key: 'fiber' },
  { label: 'Sugars', unit: 'g', key: 'sugars' },
  { label: 'Added Sugars', unit: 'g', key: 'added-sugars' },
  { label: 'Protein', unit: 'g', key: 'proteins' },
  { label: 'Salt', unit: 'g', key: 'salt' },
  { label: 'Sodium', unit: 'g', key: 'sodium' },
]

function fmt(value: number, unit: string): string {
  if (unit === 'kcal') return `${Math.round(value)}`
  if (value < 0.01) return `${(value * 1000).toFixed(0)}mg`
  if (value < 1) return `${value.toFixed(2)}${unit}`
  if (value < 10) return `${value.toFixed(1)}${unit}`
  return `${Math.round(value)}${unit}`
}

interface NutrientRow {
  label: string
  per100g: number
  perServing: number | null
  racc: number | null
  unit: string
  level: string | null
}

export function NutrientTable({
  nutrients,
  servingInfo,
  nutrientLevels,
}: {
  nutrients: Record<string, unknown>
  servingInfo: ServingInfo | null
  nutrientLevels: Record<string, string>
}) {
  const rows: NutrientRow[] = DISPLAY_NUTRIENTS
    .map((n) => {
      const raw100g = nutrients[`${n.key}_100g`]
      const per100g = typeof raw100g === 'number' ? raw100g : null
      if (per100g === null) return null

      let perServing: number | null = null
      if (servingInfo) {
        perServing = per100g * (servingInfo.declaredQuantity / 100)
      }

      let racc: number | null = null
      if (servingInfo && servingInfo.adjusted) {
        racc = per100g * (servingInfo.racc / 100)
      }

      const levelKey = n.key === 'energy-kcal' ? null : n.key
      const levelVal = levelKey ? (nutrientLevels[levelKey] ?? null) : null

      return { label: n.label, per100g, perServing, racc, unit: n.unit, level: levelVal }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (rows.length === 0) return null

  const levelBadge = (lvl: string | null) => {
    if (lvl === 'high') return <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">{lvl}</Badge>
    if (lvl === 'moderate') return <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/20">{lvl}</Badge>
    if (lvl === 'low') return <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">{lvl}</Badge>
    return null
  }

  const showServing = servingInfo !== null
  const showRacc = servingInfo?.adjusted ?? false

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">Nutrition Facts</h4>
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Per</TableHead>
              <TableHead className="text-xs text-right">100g</TableHead>
              {showServing && (
                <TableHead className="text-xs text-right">{servingInfo!.declaredQuantity}{servingInfo!.unit}</TableHead>
              )}
              {showRacc && (
                <TableHead className="text-xs text-right">{servingInfo!.racc}{servingInfo!.raccUnit}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="py-1.5 text-xs">
                  {row.label}
                  {levelBadge(row.level)}
                </TableCell>
                <TableCell className="py-1.5 text-xs text-right font-mono">
                  {fmt(row.per100g, row.unit)}
                </TableCell>
                {showServing && (
                  <TableCell className="py-1.5 text-xs text-right font-mono">
                    {row.perServing !== null ? fmt(row.perServing, row.unit) : '-'}
                  </TableCell>
                )}
                {showRacc && (
                  <TableCell className="py-1.5 text-xs text-right font-mono">
                    {row.racc !== null ? fmt(row.racc, row.unit) : '-'}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {showRacc && (
        <p className="text-xs text-amber-500 mt-2">
          Serving adjusted to RACC baseline ({servingInfo!.racc}{servingInfo!.raccUnit}) — declared serving is less than 50% of standard
        </p>
      )}
    </div>
  )
}
