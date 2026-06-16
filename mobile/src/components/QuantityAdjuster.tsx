import { Minus, Plus } from 'lucide-react'

interface QuantityAdjusterProps {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  variant?: 'pill'
}

export function QuantityAdjuster({ quantity, onIncrement, onDecrement }: QuantityAdjusterProps) {
  return (
    <div className="flex items-stretch gap-0.5">
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary/70 hover:bg-primary/20 hover:text-primary hover:scale-[1.02] transition-colors"
        onClick={onDecrement}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="font-semibold text-sm w-6 text-center flex items-center justify-center">
        {quantity}
      </span>
      <button
        className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary hover:bg-primary/30 hover:scale-[1.02] transition-colors"
        onClick={onIncrement}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
