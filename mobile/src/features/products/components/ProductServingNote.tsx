import type { ServingInfo } from '@/features/suitability/types'

interface ProductServingNoteProps {
  serving: ServingInfo | null | undefined
}

export function ProductServingNote({ serving }: ProductServingNoteProps) {
  if (!serving) return null

  if (serving.note) {
    return (
      <section className="bg-accent/20 text-accent-foreground rounded-xl px-4 py-3">
        <p className="text-sm font-medium">{serving.note}</p>
      </section>
    )
  }

  if (serving.flagged) {
    return (
      <p className="text-xs text-accent-foreground font-medium text-center">
        Serving size ({serving.declaredQuantity}
        {serving.unit}) is unusually small
      </p>
    )
  }

  return null
}
